import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateDek,
  wrapDek,
  encrypt,
  hashPassword,
  deterministicHmac,
} from '@tramitesalchilazo/shared';
import { profileCompleteSchema } from '../../../../lib/schemas/profile';
import { getSession } from '../../../../lib/auth/session';

// ────────────────────────────────────────────────────────────
// Rate limiter — 5 requests per IP per hour (in-memory, per-instance)
// For multi-instance / serverless, upgrade to @upstash/ratelimit.
// ────────────────────────────────────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function POST(req: NextRequest) {
  // ── 1. Rate limit ──────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  // ── 2. Authenticate ────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 3. Already complete? ───────────────────────────────────
  if (session.profileComplete) {
    return NextResponse.json(
      { error: 'Profile already complete' },
      { status: 409 },
    );
  }

  // ── 4. Parse + validate body ───────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = profileCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { full_name, dpi, secondary_password } = parsed.data;

  // ── 5. Cryptographic operations ────────────────────────────
  // DPI plaintext is used only within this function scope and never written
  // to logs, error messages, DB columns, or returned to the client.
  const hmacSecret = requireEnv('HMAC_SECRET');
  const consentVersion = requireEnv('CONSENT_VERSION');

  const [passwordHash, dek] = await Promise.all([
    hashPassword(secondary_password),
    Promise.resolve(generateDek()),
  ]);

  const dekWrapped = wrapDek(dek);
  const dpiEncrypted = encrypt(Buffer.from(dpi, 'utf8'), dek);
  const dpiHmac = deterministicHmac(dpi, hmacSecret);

  // ── 6. Persist ─────────────────────────────────────────────
  const supabase = getSupabaseAdmin();

  const { error: insertError } = await supabase.from('user_profiles').insert({
    user_id: session.userId,
    full_name,
    dpi_encrypted: dpiEncrypted,
    dek_wrapped: dekWrapped,
    dpi_hmac: dpiHmac,
    secondary_password_hash: passwordHash,
  });

  if (insertError) {
    // PostgreSQL unique_violation code
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'A profile with this DPI already exists' },
        { status: 409 },
      );
    }
    console.error('[profile/complete] insert failed:', insertError.code);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const { error: consentError } = await supabase
    .from('users')
    .update({
      consent_version: consentVersion,
      consent_accepted_at: new Date().toISOString(),
    })
    .eq('id', session.userId);

  if (consentError) {
    console.error('[profile/complete] consent update failed:', consentError.code);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // ── 7. Respond ─────────────────────────────────────────────
  // Redirect handled client-side after 200; the session JWT will be refreshed
  // on the next page load to pick up profileComplete = true.
  return NextResponse.json({ ok: true }, { status: 200 });
}
