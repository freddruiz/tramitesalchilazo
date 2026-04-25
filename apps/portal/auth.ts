import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';

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
    maxAge: 7 * 24 * 60 * 60, // 7-day session window (client users)
  },

  jwt: {
    maxAge: 15 * 60, // 15-minute access token
  },

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

      // Audit admin logins — IP is unavailable here in NextAuth v5 beta;
      // full IP-logged audit entries are written in the MFA verification routes.
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('id, role')
          .eq('google_sub', account.providerAccountId)
          .single();

        if (userRow?.role === 'admin') {
          await writeAuditEntry(
            {
              actorId: userRow.id as string,
              action: AuditAction.AdminLogin,
              metadata: { email: user.email },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase as any,
          );
        }
      } catch {
        // Audit failure must not block sign-in
      }

      return true;
    },

    async jwt({ token, account, trigger, session }) {
      // Handle client-side session updates (step-up, admin MFA, passkey enrollment flag)
      if (trigger === 'update') {
        if (typeof session?.stepUpVerifiedAt === 'number') {
          token.stepUpVerifiedAt = session.stepUpVerifiedAt;
        }
        if (typeof session?.adminMfaVerifiedAt === 'number') {
          token.adminMfaVerifiedAt = session.adminMfaVerifiedAt;
        }
        if (typeof session?.adminPasskeyEnrolled === 'boolean') {
          token.adminPasskeyEnrolled = session.adminPasskeyEnrolled;
        }
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

        // For admins: check passkey enrollment state at login time
        if (token.role === 'admin' && token.userId) {
          const { data: creds } = await supabase
            .from('admin_webauthn_credentials')
            .select('id')
            .eq('user_id', token.userId)
            .limit(1);
          token.adminPasskeyEnrolled = (creds?.length ?? 0) > 0;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = (token.userId as string | undefined) ?? '';
      session.user.role = (token.role as string | undefined) ?? 'client';
      session.user.profileComplete = (token.profileComplete as boolean | undefined) ?? false;
      session.user.stepUpVerifiedAt = token.stepUpVerifiedAt as number | undefined;
      session.user.adminPasskeyEnrolled = token.adminPasskeyEnrolled as boolean | undefined;
      session.user.adminMfaVerifiedAt = token.adminMfaVerifiedAt as number | undefined;
      return session;
    },
  },
});
