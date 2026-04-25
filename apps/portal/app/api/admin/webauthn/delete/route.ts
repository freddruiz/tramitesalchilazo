import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '../../../../../lib/auth/session';
import { deleteCredential } from '../../../../../lib/admin/webauthn';

const bodySchema = z.object({ credentialId: z.string().uuid() });

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
    return NextResponse.json({ error: 'Invalid credentialId' }, { status: 422 });
  }

  try {
    await deleteCredential(session.userId, parsed.data.credentialId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webauthn] delete error:', err);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}
