import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7-day session window (refresh ceiling)
  },

  jwt: {
    maxAge: 15 * 60, // 15-minute access token; re-issued within session window
  },

  // Explicit cookie settings — httpOnly + Secure + SameSite=Lax required by AC
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      },
    },
  },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google' || !user.email) return false;

      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from('users').upsert(
        {
          google_sub: account.providerAccountId,
          email: user.email.toLowerCase().trim(),
          role: 'client',
        },
        { onConflict: 'google_sub' },
      );

      if (error) {
        console.error('[auth] user upsert failed:', error.message);
        return false;
      }

      return true;
    },

    async jwt({ token, account, trigger, session }) {
      // Handle client-side session updates (e.g., step-up sets stepUpVerifiedAt).
      // The value arrives via update() → PATCH /api/auth/session → this callback.
      if (trigger === 'update' && typeof session?.stepUpVerifiedAt === 'number') {
        token.stepUpVerifiedAt = session.stepUpVerifiedAt;
        return token;
      }

      // Only run heavy DB queries on first sign-in (account is set)
      if (account?.provider === 'google') {
        const supabase = getSupabaseAdmin();

        const { data: userRow } = await supabase
          .from('users')
          .select('id, role')
          .eq('google_sub', account.providerAccountId)
          .single();

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', userRow?.id ?? '')
          .maybeSingle();

        token.userId = userRow?.id ?? '';
        token.role = (userRow?.role as string | undefined) ?? 'client';
        token.profileComplete = !!profile;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = (token.userId as string | undefined) ?? '';
      session.user.role = (token.role as string | undefined) ?? 'client';
      session.user.profileComplete = (token.profileComplete as boolean | undefined) ?? false;
      session.user.stepUpVerifiedAt = token.stepUpVerifiedAt as number | undefined;
      // google_sub is intentionally NOT exposed in the session object
      return session;
    },
  },
});
