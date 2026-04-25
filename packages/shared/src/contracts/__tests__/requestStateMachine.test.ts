import { describe, it, expect } from 'vitest';
import {
  RequestStatus,
  validateTransition,
  InvalidTransitionError,
  ALLOWED_TRANSITIONS,
} from '../requestStateMachine.js';

describe('requestStateMachine', () => {
  describe('valid transitions', () => {
    it('pending_payment → queued (payment confirmed)', () => {
      expect(() =>
        validateTransition(RequestStatus.PendingPayment, RequestStatus.Queued)
      ).not.toThrow();
    });

    it('queued → in_progress (worker picks up job)', () => {
      expect(() =>
        validateTransition(RequestStatus.Queued, RequestStatus.InProgress)
      ).not.toThrow();
    });

    it('in_progress → completed (worker success)', () => {
      expect(() =>
        validateTransition(RequestStatus.InProgress, RequestStatus.Completed)
      ).not.toThrow();
    });

    it('in_progress → failed (worker hard failure)', () => {
      expect(() =>
        validateTransition(RequestStatus.InProgress, RequestStatus.Failed)
      ).not.toThrow();
    });

    it('in_progress → needs_manual_review (worker soft failure)', () => {
      expect(() =>
        validateTransition(RequestStatus.InProgress, RequestStatus.NeedsManualReview)
      ).not.toThrow();
    });
  });

  describe('invalid transitions throw InvalidTransitionError', () => {
    it('pending_payment → in_progress (skipping queued)', () => {
      expect(() =>
        validateTransition(RequestStatus.PendingPayment, RequestStatus.InProgress)
      ).toThrow(InvalidTransitionError);
    });

    it('pending_payment → completed', () => {
      expect(() =>
        validateTransition(RequestStatus.PendingPayment, RequestStatus.Completed)
      ).toThrow(InvalidTransitionError);
    });

    it('pending_payment → failed', () => {
      expect(() =>
        validateTransition(RequestStatus.PendingPayment, RequestStatus.Failed)
      ).toThrow(InvalidTransitionError);
    });

    it('queued → completed (skipping in_progress)', () => {
      expect(() =>
        validateTransition(RequestStatus.Queued, RequestStatus.Completed)
      ).toThrow(InvalidTransitionError);
    });

    it('queued → failed (skipping in_progress)', () => {
      expect(() =>
        validateTransition(RequestStatus.Queued, RequestStatus.Failed)
      ).toThrow(InvalidTransitionError);
    });

    it('completed is a terminal state', () => {
      for (const status of Object.values(RequestStatus)) {
        expect(() =>
          validateTransition(RequestStatus.Completed, status as RequestStatus)
        ).toThrow(InvalidTransitionError);
      }
    });

    it('failed is a terminal state', () => {
      for (const status of Object.values(RequestStatus)) {
        expect(() =>
          validateTransition(RequestStatus.Failed, status as RequestStatus)
        ).toThrow(InvalidTransitionError);
      }
    });

    it('needs_manual_review is a terminal state', () => {
      for (const status of Object.values(RequestStatus)) {
        expect(() =>
          validateTransition(RequestStatus.NeedsManualReview, status as RequestStatus)
        ).toThrow(InvalidTransitionError);
      }
    });

    it('InvalidTransitionError carries code, from, and to fields', () => {
      let caught: unknown;
      try {
        validateTransition(RequestStatus.Completed, RequestStatus.Queued);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(InvalidTransitionError);
      const e = caught as InvalidTransitionError;
      expect(e.code).toBe('REQUEST_INVALID_TRANSITION');
      expect(e.from).toBe(RequestStatus.Completed);
      expect(e.to).toBe(RequestStatus.Queued);
      expect(e.message).toContain('completed');
      expect(e.message).toContain('queued');
    });
  });

  describe('ALLOWED_TRANSITIONS map integrity', () => {
    it('all RequestStatus values are keys', () => {
      for (const status of Object.values(RequestStatus)) {
        expect(ALLOWED_TRANSITIONS.has(status as RequestStatus)).toBe(true);
      }
    });

    it('terminal states have no outgoing transitions', () => {
      expect(ALLOWED_TRANSITIONS.get(RequestStatus.Completed)?.size).toBe(0);
      expect(ALLOWED_TRANSITIONS.get(RequestStatus.Failed)?.size).toBe(0);
      expect(ALLOWED_TRANSITIONS.get(RequestStatus.NeedsManualReview)?.size).toBe(0);
    });

    it('in_progress allows exactly completed, failed, needs_manual_review', () => {
      const allowed = ALLOWED_TRANSITIONS.get(RequestStatus.InProgress);
      expect(allowed?.size).toBe(3);
      expect(allowed?.has(RequestStatus.Completed)).toBe(true);
      expect(allowed?.has(RequestStatus.Failed)).toBe(true);
      expect(allowed?.has(RequestStatus.NeedsManualReview)).toBe(true);
    });

    it('pending_payment only allows queued', () => {
      const allowed = ALLOWED_TRANSITIONS.get(RequestStatus.PendingPayment);
      expect(allowed?.size).toBe(1);
      expect(allowed?.has(RequestStatus.Queued)).toBe(true);
    });

    it('queued only allows in_progress', () => {
      const allowed = ALLOWED_TRANSITIONS.get(RequestStatus.Queued);
      expect(allowed?.size).toBe(1);
      expect(allowed?.has(RequestStatus.InProgress)).toBe(true);
    });
  });
});
