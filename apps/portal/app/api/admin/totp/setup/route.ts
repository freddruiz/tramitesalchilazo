import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '../../../../../lib/auth/session';
import { setupTotp } from '../../../../../lib/admin/totp';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', session.userId)
    .single();

  if (!user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const { qrDataUrl, backupCodes } = await setupTotp(session.userId, user.email as string);
    // backupCodes shown once — admin must save them; qrDataUrl for authenticator app setup
    return NextResponse.json({ qrDataUrl, backupCodes });
  } catch (err) {
    console.error('[totp] setup error:', err);
    return NextResponse.json({ error: 'Failed to set up TOTP' }, { status: 500 });
  }
}
