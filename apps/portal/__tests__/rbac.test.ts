import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../lib/errors';

// Mock getSession before importing modules that use it
vi.mock('../lib/auth/session', () => ({
  getSession: vi.fn(),
}));

import { requireRole } from '../lib/auth/rbac';
import { requireStepUp } from '../lib/auth/stepUp';
import { getSession } from '../lib/auth/session';
import type { AppSession } from '../lib/auth/session';

const mockGetSession = vi.mocked(getSession);

function makeSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    userId: 'user-123',
    role: 'client',
    profileComplete: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireRole', () => {
  it('throws 403 AUTH_INSUFFICIENT_PERMISSIONS when role is client but admin required', async () => {
    mockGetSession.mockResolvedValue(makeSession({ role: 'client' }));

    await expect(requireRole('admin')()).rejects.toMatchObject({
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      statusCode: 403,
    });
  });

  it('throws 403 AUTH_INSUFFICIENT_PERMISSIONS when unauthenticated (no session)', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requireRole('admin')()).rejects.toMatchObject({
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      statusCode: 403,
    });
  });

  it('resolves with session when role matches (client → client)', async () => {
    const session = makeSession({ role: 'client' });
    mockGetSession.mockResolvedValue(session);

    await expect(requireRole('client')()).resolves.toEqual(session);
  });

  it('resolves with session when role matches (admin → admin)', async () => {
    const session = makeSession({ role: 'admin' });
    mockGetSession.mockResolvedValue(session);

    await expect(requireRole('admin')()).resolves.toEqual(session);
  });

  it('throws an AppError instance', async () => {
    mockGetSession.mockResolvedValue(makeSession({ role: 'client' }));

    await expect(requireRole('admin')()).rejects.toBeInstanceOf(AppError);
  });
});

describe('requireStepUp', () => {
  it('throws 403 AUTH_STEP_UP_REQUIRED when stepUpVerifiedAt is absent', async () => {
    mockGetSession.mockResolvedValue(makeSession({ stepUpVerifiedAt: undefined }));

    await expect(requireStepUp()()).rejects.toMatchObject({
      code: 'AUTH_STEP_UP_REQUIRED',
      statusCode: 403,
    });
  });

  it('throws 403 AUTH_STEP_UP_REQUIRED when stepUpVerifiedAt is older than 15 minutes', async () => {
    const sixteenMinutesAgo = Math.floor((Date.now() - 16 * 60 * 1000) / 1000);
    mockGetSession.mockResolvedValue(makeSession({ stepUpVerifiedAt: sixteenMinutesAgo }));

    await expect(requireStepUp()()).rejects.toMatchObject({
      code: 'AUTH_STEP_UP_REQUIRED',
      statusCode: 403,
    });
  });

  it('resolves with session when stepUpVerifiedAt is within the last 15 minutes', async () => {
    const fiveMinutesAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
    const session = makeSession({ stepUpVerifiedAt: fiveMinutesAgo });
    mockGetSession.mockResolvedValue(session);

    await expect(requireStepUp()()).resolves.toEqual(session);
  });

  it('resolves when stepUpVerifiedAt is exactly at the boundary (just under 15 min)', async () => {
    const justUnder15Min = Math.floor((Date.now() - 14 * 60 * 1000 - 59 * 1000) / 1000);
    const session = makeSession({ stepUpVerifiedAt: justUnder15Min });
    mockGetSession.mockResolvedValue(session);

    await expect(requireStepUp()()).resolves.toEqual(session);
  });

  it('throws 403 AUTH_INSUFFICIENT_PERMISSIONS when unauthenticated (no session)', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requireStepUp()()).rejects.toMatchObject({
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      statusCode: 403,
    });
  });
});
