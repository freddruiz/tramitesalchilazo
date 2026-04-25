import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { buildRegistrationOptions } from '../../../../../lib/admin/webauthn';
import { createClient } from '@supabase/supabase-js';

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
    const options = await buildRegistrationOptions(session.userId, user.email as string);
    return NextResponse.json(options);
  } catch (err) {
    console.error('[webauthn] register-options error:', err);
    return NextResponse.json({ error: 'Failed to generate registration options' }, { status: 500 });
  }
}
