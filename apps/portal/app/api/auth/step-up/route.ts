import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword } from '@tramitesalchilazo/shared';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';
import { getSession } from '../../../../lib/auth/session';

// ────────────────────────────────────────────────────────────
// HTTP-layer rate limit — 10 requests per user per 15 minutes (in-memory).
// For multi-instance / serverless, upgrade to @upstash/ratelimit.
// ────────────────────────────────────────────────────────────
const userRateLimitStore = new Map<string, { count: number; resetAt: number }>();
const HTTP_RATE_LIMIT = 10;
const HTTP_RATE_WINDOW_MS = 15 * 60 * 1000;

function checkHttpRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRateLimitStore.get(userId);
  if (!entry || now > entry.resetAt) {
    userRateLimitStore.set(userId, { count: 1, resetAt: now + HTTP_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= HTTP_RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

// ────────────────────────────────────────────────────────────
// Lockout constants — must match stepUp.ts window exactly
// ────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const stepUpSchema = z.object({
  secondaryPassword: z.string().min(1, 'Secondary password is required'),
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function extractIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  // ── 1. Authenticate ────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. HTTP-layer rate limit (per user, not per IP) ────────
  // Counter is server-side — never in a client cookie or header.
  if (!checkHttpRateLimit(session.userId)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in 15 minutes.' },
      { status: 429 },
    );
  }

  // ── 3. Parse + validate body ───────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = stepUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { secondaryPassword } = parsed.data;
  const supabase = getSupabaseAdmin();
  const ip = extractIp(req);

  // ── 4. Load profile (hash + lockout state) ─────────────────
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('secondary_password_hash, failed_step_up_attempts, step_up_locked_until')
    .eq('user_id', session.userId)
    .single();

  if (profileError || !profile?.secondary_password_hash) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // ── 5. Check lockout (stored in DB — survives session refresh) ──
  if (
    profile.step_up_locked_until &&
    new Date(profile.step_up_locked_until) > new Date()
  ) {
    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.AuthFailedAttempt,
        ipRaw: ip,
        metadata: { reason: 'account_locked' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
    );
    return NextResponse.json(
      { error: 'Step-up temporarily locked. Try again later.' },
      { status: 423 },
    );
  }

  // ── 6. Verify password (constant-time via Argon2 library) ──
  const isValid = await verifyPassword(secondaryPassword, profile.secondary_password_hash);

  if (isValid) {
    // Reset lockout counters and record success timestamp
    await supabase
      .from('user_profiles')
      .update({ failed_step_up_attempts: 0, step_up_locked_until: null })
      .eq('user_id', session.userId);

    const stepUpVerifiedAt = Math.floor(Date.now() / 1000);

    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.AuthStepUp,
        ipRaw: ip,
        metadata: { verified_at: stepUpVerifiedAt },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
    );

    return NextResponse.json({ ok: true, stepUpVerifiedAt }, { status: 200 });
  }

  // ── 7. Failed attempt — increment counter, lock if threshold reached ──
  const newAttempts = (profile.failed_step_up_attempts ?? 0) + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
  const lockUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
    : null;

  await supabase
    .from('user_profiles')
    .update({
      failed_step_up_attempts: newAttempts,
      ...(lockUntil !== null ? { step_up_locked_until: lockUntil } : {}),
    })
    .eq('user_id', session.userId);

  await writeAuditEntry(
    {
      actorId: session.userId,
      action: AuditAction.AuthFailedAttempt,
      ipRaw: ip,
      metadata: { attempt: newAttempts, locked: shouldLock },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase as any,
  );

  return NextResponse.json(
    {
      error: 'Invalid secondary password',
      attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts),
    },
    { status: 401 },
  );
}
