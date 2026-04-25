import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      profileComplete: boolean;
      stepUpVerifiedAt?: number;
      /** True once the admin has enrolled at least one passkey. */
      adminPasskeyEnrolled?: boolean;
      /** Unix timestamp (seconds) when admin completed MFA verification (4-hour window). */
      adminMfaVerifiedAt?: number;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: string;
    profileComplete?: boolean;
    stepUpVerifiedAt?: number;
    adminPasskeyEnrolled?: boolean;
    adminMfaVerifiedAt?: number;
  }
}
