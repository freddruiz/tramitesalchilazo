import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { buildAuthenticationOptions } from '../../../../../lib/admin/webauthn';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const options = await buildAuthenticationOptions(session.userId);
    return NextResponse.json(options);
  } catch (err) {
    console.error('[webauthn] auth-options error:', err);
    return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 });
  }
}
