import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { listCredentials } from '../../../../../lib/admin/webauthn';
import { hasTotpConfigured } from '../../../../../lib/admin/totp';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [credentials, totpConfigured] = await Promise.all([
      listCredentials(session.userId),
      hasTotpConfigured(session.userId),
    ]);
    return NextResponse.json({ credentials, hasTotpConfigured: totpConfigured });
  } catch (err) {
    console.error('[webauthn] list error:', err);
    return NextResponse.json({ error: 'Failed to list credentials' }, { status: 500 });
  }
}
