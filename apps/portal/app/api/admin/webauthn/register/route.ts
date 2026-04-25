import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../../lib/auth/session';
import { completeRegistration } from '../../../../../lib/admin/webauthn';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

const bodySchema = z.object({
  response: z.record(z.unknown()),
  friendlyName: z.string().max(80).optional(),
});

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 });
  }

  const supabase = getSupabaseAdmin();
  const ip = extractIp(req);

  try {
    const { credentialId } = await completeRegistration(
      session.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.data.response as any,
      parsed.data.friendlyName,
    );

    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.AdminPasskeyEnrolled,
        ipRaw: ip,
        userAgent: req.headers.get('user-agent') ?? undefined,
        metadata: { credentialId },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase as any,
    );

    return NextResponse.json({ ok: true, credentialId });
  } catch (err) {
    console.error('[webauthn] register error:', err);
    return NextResponse.json({ error: 'Passkey registration failed' }, { status: 400 });
  }
}
