import { getSession } from './session';
import type { UserRole, AppSession } from './session';
import { AppError } from '../errors';

/**
 * Middleware factory that enforces a minimum role requirement.
 *
 * Role is validated server-side from the JWT session — never from any
 * client-supplied header or request body field.
 *
 * Usage in a Route Handler or Server Action:
 *   const session = await requireRole('admin')();
 *
 * Throws AppError(AUTH_INSUFFICIENT_PERMISSIONS, 403) when:
 *   - No session exists (unauthenticated)
 *   - Session role does not match the required role
 */
export function requireRole(role: UserRole): () => Promise<AppSession> {
  return async function checkRole(): Promise<AppSession> {
    const session = await getSession();
    if (!session || session.role !== role) {
      throw new AppError('AUTH_INSUFFICIENT_PERMISSIONS', 403, 'Forbidden');
    }
    return session;
  };
}
