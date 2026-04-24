import { createClient } from '@supabase/supabase-js';

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!url || !anonKey || !jwtSecret) {
    throw new Error('Supabase env vars not configured');
  }
  return { url, anonKey, jwtSecret };
}

/**
 * Signs a short-lived HS256 JWT that PostgREST accepts as an authenticated
 * session. The `sub` claim becomes `auth.uid()` inside RLS policies, and the
 * `app.current_user_id` session parameter is set via the `set_app_current_user`
 * DB function so policies can use current_setting('app.current_user_id', true).
 *
 * Uses the Web Crypto API (Node 20 / Edge runtime) — no extra packages needed.
 */
async function signUserJWT(userId: string, jwtSecret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
      iat: now,
      exp: now + 60, // 1-minute TTL — only used for the duration of the request
    }),
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sig = Buffer.from(sigBuf).toString('base64url');

  return `${signingInput}.${sig}`;
}

/**
 * Creates a Supabase client scoped to `userId` for use in server-side code.
 *
 * The JWT bridge sets `auth.uid() = userId` via the JWT `sub` claim so all
 * existing RLS policies are enforced. It also calls `set_app_current_user` to
 * populate the `app.current_user_id` session parameter for policies that prefer
 * that approach.
 *
 * Never call this client-side — the JWT secret must not leave the server.
 */
export async function createServerClient(userId: string) {
  const { url, anonKey, jwtSecret } = getConfig();
  const token = await signUserJWT(userId, jwtSecret);

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  // Set app.current_user_id so RLS policies can use
  // current_setting('app.current_user_id', true)::uuid.
  await client.rpc('set_app_current_user', { p_user_id: userId }).throwOnError();

  return client;
}
