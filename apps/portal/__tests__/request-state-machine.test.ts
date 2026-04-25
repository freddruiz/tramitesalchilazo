import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../lib/errors';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn() },
}));

import { transitionRequest } from '../lib/requests/transitions';
import { supabaseAdmin } from '@/lib/supabase/admin';

const mockFrom = vi.mocked(supabaseAdmin.from);

const RS = {
  PendingPayment: 'pending_payment',
  Queued: 'queued',
  InProgress: 'in_progress',
  Completed: 'completed',
  Failed: 'failed',
  NeedsManualReview: 'needs_manual_review',
} as const;

function buildMockChain(currentStatus: string) {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockOrder = vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
  const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });
  const mockSingle = vi.fn().mockResolvedValue({ data: { status: currentStatus }, error: null });
  const mockEqSelect = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'service_requests') return { select: mockSelect, update: mockUpdate } as any;
    if (table === 'audit_log')
      return { select: vi.fn().mockReturnValue({ order: mockOrder }), insert: mockInsert } as any;
    return {} as any;
  });

  return { mockInsert, mockUpdate };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transitionRequest — valid transitions write audit entry', () => {
  it('pending_payment → queued: updates status and writes audit log', async () => {
    const { mockInsert, mockUpdate } = buildMockChain('pending_payment');
    await transitionRequest('req-1', RS.Queued as any, 'actor-1');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ action: 'request.status_change' })])
    );
  });

  it('queued → in_progress: updates status and writes audit log', async () => {
    const { mockInsert, mockUpdate } = buildMockChain('queued');
    await transitionRequest('req-2', RS.InProgress as any, 'actor-2');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ action: 'request.status_change' })])
    );
  });

  it('in_progress → completed: updates status and writes audit log', async () => {
    const { mockInsert, mockUpdate } = buildMockChain('in_progress');
    await transitionRequest('req-3', RS.Completed as any, 'actor-3');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ action: 'request.status_change' })])
    );
  });

  it('in_progress → failed: updates status and writes audit log', async () => {
    const { mockInsert, mockUpdate } = buildMockChain('in_progress');
    await transitionRequest('req-4', RS.Failed as any, 'actor-4');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ action: 'request.status_change' })])
    );
  });

  it('in_progress → needs_manual_review: updates status and writes audit log', async () => {
    const { mockInsert, mockUpdate } = buildMockChain('in_progress');
    await transitionRequest('req-5', RS.NeedsManualReview as any, 'actor-5');

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'needs_manual_review' })
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ action: 'request.status_change' })])
    );
  });

  it('audit entry metadata includes from/to status values', async () => {
    const { mockInsert } = buildMockChain('pending_payment');
    await transitionRequest('req-meta', RS.Queued as any, 'actor-meta');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'request.status_change',
          metadata: expect.objectContaining({ from: 'pending_payment', to: 'queued' }),
        }),
      ])
    );
  });
});

describe('transitionRequest — invalid transitions', () => {
  it('throws AppError REQUEST_INVALID_TRANSITION for disallowed transition', async () => {
    buildMockChain('completed');

    await expect(
      transitionRequest('req-bad', RS.Queued as any, 'actor-x')
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      transitionRequest('req-bad', RS.Queued as any, 'actor-x')
    ).rejects.toMatchObject({ code: 'REQUEST_INVALID_TRANSITION' });
  });

  it('does not write audit entry when transition is invalid', async () => {
    const { mockInsert } = buildMockChain('failed');

    await expect(
      transitionRequest('req-bad2', RS.Queued as any, 'actor-x')
    ).rejects.toBeInstanceOf(AppError);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws AppError when request is not found in DB', async () => {
    const mockEqSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });
    mockFrom.mockReturnValue({ select: mockSelect } as any);

    await expect(
      transitionRequest('req-missing', RS.Queued as any, 'actor-x')
    ).rejects.toBeInstanceOf(AppError);
  });
});
