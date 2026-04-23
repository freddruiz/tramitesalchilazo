import { getSession } from './session';
import type { AppSession } from './session';
import { AppError } from '../errors';

/**
 * Step-up window is exactly 15 minutes — no configurable override.
 * Any change to this value requires a new ADL entry (per security constraints).
 */
const STEP_UP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Step-up is required for: request creation, payment initiation,
 * profile edits, and credential saves.
 *
 * Returns a factory you call to run the check:
 *   const session = await requireStepUp()();
 *
 * Throws AppError(AUTH_STEP_UP_REQUIRED, 403) when:
 *   - No session exists
 *   - stepUpVerifiedAt is absent
 *   - stepUpVerifiedAt is older than 15 minutes
 */
export function requireStepUp(): () => Promise<AppSession> {
  return async function checkStepUp(): Promise<AppSession> {
    const session = await getSession();
    if (!session) {
      throw new AppError('AUTH_INSUFFICIENT_PERMISSIONS', 403, 'Forbidden');
    }

    const { stepUpVerifiedAt } = session;
    if (!stepUpVerifiedAt) {
      throw new AppError('AUTH_STEP_UP_REQUIRED', 403, 'Step-up authentication required');
    }

    if (Date.now() - stepUpVerifiedAt * 1000 > STEP_UP_WINDOW_MS) {
      throw new AppError('AUTH_STEP_UP_REQUIRED', 403, 'Step-up authentication expired');
    }

    return session;
  };
}
