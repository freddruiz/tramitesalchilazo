import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { completeAuthentication } from '../../../../../lib/admin/webauthn';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const ip = extractIp(req);
  const adminMfaVerifiedAt = Math.floor(Date.now() / 1000);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { credentialId } = await completeAuthentication(session.userId, body as any);

    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.AdminMfaVerified,
        ipRaw: ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
        metadata: { method: 'passkey', credentialId, verifiedAt: adminMfaVerifiedAt },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
    );

    return NextResponse.json({ ok: true, adminMfaVerifiedAt });
  } catch (err) {
    console.error('[webauthn] auth error:', err);

    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.AdminMfaFailed,
        ipRaw: ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
        metadata: { method: 'passkey' },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
    ).catch(() => {});

    return NextResponse.json({ error: 'Passkey authentication failed' }, { status: 401 });
  }
}
