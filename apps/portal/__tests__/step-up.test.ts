import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock('../lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@tramitesalchilazo/shared', () => ({
  verifyPassword: vi.fn(),
  writeAuditEntry: vi.fn().mockResolvedValue(undefined),
  AuditAction: {
    AuthStepUp: 'auth.step_up',
    AuthFailedAttempt: 'auth.failed_attempt',
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { POST } from '../app/api/auth/step-up/route';
import { requireStepUp } from '../lib/auth/stepUp';
import { getSession } from '../lib/auth/session';
import { verifyPassword } from '@tramitesalchilazo/shared';
import { createClient } from '@supabase/supabase-js';
import type { AppSession } from '../lib/auth/session';
import { NextRequest } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockGetSession = vi.mocked(getSession);
const mockVerifyPassword = vi.mocked(verifyPassword);
const mockCreateClient = vi.mocked(createClient);

function makeSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    userId: 'user-step-up',
    role: 'client',
    profileComplete: true,
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/step-up', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Returns a Supabase-like mock client with chainable builder pattern. */
function makeSupabaseMock(profileRow: {
  secondary_password_hash: string;
  failed_step_up_attempts: number;
  step_up_locked_until: string | null;
}) {
  const updateMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: profileRow, error: null }),
            }),
          }),
          update: updateMock,
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      // audit_log
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    updateMock,
  };

  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

// ─────────────────────────────────────────────────────────────────────────────
// Route handler tests
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/step-up — route handler', () => {
  it('AC: correct secondary password → 200 with stepUpVerifiedAt set', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const supabase = makeSupabaseMock({
      secondary_password_hash: '$argon2id$hash',
      failed_step_up_attempts: 0,
      step_up_locked_until: null,
    });
    mockCreateClient.mockReturnValue(supabase as unknown as ReturnType<typeof createClient>);
    mockVerifyPassword.mockResolvedValue(true);

    const before = Math.floor(Date.now() / 1000);
    const res = await POST(makeRequest({ secondaryPassword: 'GoodPass1!' }));
    const after = Math.floor(Date.now() / 1000);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.stepUpVerifiedAt).toBe('number');
    expect(body.stepUpVerifiedAt).toBeGreaterThanOrEqual(before);
    expect(body.stepUpVerifiedAt).toBeLessThanOrEqual(after);

    // Verify reset of lockout counters
    expect(supabase.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ failed_step_up_attempts: 0, step_up_locked_until: null }),
    );
  });

  it('AC: wrong password → 401, attempt counter incremented', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const supabase = makeSupabaseMock({
      secondary_password_hash: '$argon2id$hash',
      failed_step_up_attempts: 1,
      step_up_locked_until: null,
    });
    mockCreateClient.mockReturnValue(supabase as unknown as ReturnType<typeof createClient>);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(makeRequest({ secondaryPassword: 'WrongPass!' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    // attempt counter incremented from 1 → 2; 3 remaining before lockout
    expect(body.attemptsRemaining).toBe(3);

    // Verify DB update increments the counter
    expect(supabase.updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ failed_step_up_attempts: 2 }),
    );
  });

  it('AC: 5th wrong attempt → 15-minute lockout written to DB', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const supabase = makeSupabaseMock({
      secondary_password_hash: '$argon2id$hash',
      failed_step_up_attempts: 4, // one more failure → triggers lockout
      step_up_locked_until: null,
    });
    mockCreateClient.mockReturnValue(supabase as unknown as ReturnType<typeof createClient>);
    mockVerifyPassword.mockResolvedValue(false);

    const before = Date.now();
    const res = await POST(makeRequest({ secondaryPassword: 'WrongPass!' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.attemptsRemaining).toBe(0);

    // Confirm step_up_locked_until is set roughly 15 min in the future
    const updateCall = supabase.updateMock.mock.calls[0][0] as {
      failed_step_up_attempts: number;
      step_up_locked_until: string;
    };
    expect(updateCall.failed_step_up_attempts).toBe(5);
    const lockUntilMs = new Date(updateCall.step_up_locked_until).getTime();
    const expectedMin = before + 15 * 60 * 1000;
    // Allow ±2 s for test execution time
    expect(lockUntilMs).toBeGreaterThanOrEqual(expectedMin - 2000);
    expect(lockUntilMs).toBeLessThanOrEqual(expectedMin + 2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireStepUp() window tests
// ─────────────────────────────────────────────────────────────────────────────

describe('requireStepUp() — 15-minute window', () => {
  it('AC: step-up verified 14 min ago → passes', async () => {
    const fourteenMinAgo = Math.floor((Date.now() - 14 * 60 * 1000) / 1000);
    const session = makeSession({ stepUpVerifiedAt: fourteenMinAgo });
    mockGetSession.mockResolvedValue(session);

    await expect(requireStepUp()()).resolves.toEqual(session);
  });

  it('AC: step-up verified 16 min ago → blocks with AUTH_STEP_UP_REQUIRED', async () => {
    const sixteenMinAgo = Math.floor((Date.now() - 16 * 60 * 1000) / 1000);
    mockGetSession.mockResolvedValue(makeSession({ stepUpVerifiedAt: sixteenMinAgo }));

    await expect(requireStepUp()()).rejects.toMatchObject({
      code: 'AUTH_STEP_UP_REQUIRED',
      statusCode: 403,
    });
  });
});
