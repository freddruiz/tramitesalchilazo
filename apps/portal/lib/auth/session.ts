import { auth } from '@/auth';

export type UserRole = 'client' | 'admin';

export interface AppSession {
  userId: string;
  role: UserRole;
  profileComplete: boolean;
  /** Unix timestamp (seconds) set by step-up auth (S2-04). */
  stepUpVerifiedAt?: number;
}

/**
 * Returns the typed session for the current server-side request.
 * Returns null if there is no active session.
 *
 * Call from Server Components, Route Handlers, or Server Actions.
 * Role is read from the signed JWT — never from client-supplied headers.
 */
export async function getSession(): Promise<AppSession | null> {
  const raw = await auth();
  if (!raw?.user?.id) return null;
  return {
    userId: raw.user.id,
    role: (raw.user.role as UserRole) ?? 'client',
    profileComplete: raw.user.profileComplete ?? false,
    stepUpVerifiedAt: raw.user.stepUpVerifiedAt,
  };
}
