import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      profileComplete: boolean;
      /** Unix timestamp (seconds) when step-up auth was last verified. Set in S2-04. */
      stepUpVerifiedAt?: number;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: string;
    profileComplete?: boolean;
    stepUpVerifiedAt?: number;
  }
}
