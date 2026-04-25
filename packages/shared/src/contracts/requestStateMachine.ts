export enum RequestStatus {
  PendingPayment = 'pending_payment',
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  NeedsManualReview = 'needs_manual_review',
}

export const ALLOWED_TRANSITIONS: ReadonlyMap<RequestStatus, ReadonlySet<RequestStatus>> = new Map([
  [RequestStatus.PendingPayment, new Set([RequestStatus.Queued])],
  [RequestStatus.Queued, new Set([RequestStatus.InProgress])],
  [RequestStatus.InProgress, new Set([RequestStatus.Completed, RequestStatus.Failed, RequestStatus.NeedsManualReview])],
  [RequestStatus.Completed, new Set()],
  [RequestStatus.Failed, new Set()],
  [RequestStatus.NeedsManualReview, new Set()],
]);

export class InvalidTransitionError extends Error {
  readonly code = 'REQUEST_INVALID_TRANSITION' as const;
  readonly from: RequestStatus;
  readonly to: RequestStatus;

  constructor(from: RequestStatus, to: RequestStatus) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function validateTransition(from: RequestStatus, to: RequestStatus): void {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  if (!allowed || !allowed.has(to)) {
    throw new InvalidTransitionError(from, to);
  }
}
