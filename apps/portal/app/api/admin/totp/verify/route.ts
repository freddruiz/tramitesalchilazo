import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '../../../../../lib/auth/session';
import { verifyTotpCode, verifyBackupCode } from '../../../../../lib/admin/totp';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function extractIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

const bodySchema = z.object({
  token: z.string().min(1),
  isBackupCode: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }

  const { token, isBackupCode } = parsed.data;
  const supabase = getSupabaseAdmin();
  const ip = extractIp(req);
  const adminMfaVerifiedAt = Math.floor(Date.now() / 1000);

  const isValid = isBackupCode
    ? await verifyBackupCode(session.userId, token)
    : await verifyTotpCode(session.userId, token);

  if (!isValid) {
    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.AdminMfaFailed,
        ipRaw: ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
        metadata: { method: isBackupCode ? 'backup_code' : 'totp' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
    ).catch(() => {});

    return NextResponse.json(
      { error: isBackupCode ? 'Invalid backup code' : 'Invalid TOTP code' },
      { status: 401 },
    );
  }

  await writeAuditEntry(
    {
      actorId: session.userId,
      action: AuditAction.AdminTotpVerified,
      ipRaw: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
      metadata: { method: isBackupCode ? 'backup_code' : 'totp', verifiedAt: adminMfaVerifiedAt },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase as any,
  );

  return NextResponse.json({ ok: true, adminMfaVerifiedAt });
}
