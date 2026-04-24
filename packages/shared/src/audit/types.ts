export enum AuditAction {
  AuthLogin = 'auth.login',
  AuthLogout = 'auth.logout',
  AuthStepUp = 'auth.step_up',
  AuthFailedAttempt = 'auth.failed_attempt',

  ProfileCreate = 'profile.create',
  ProfileUpdate = 'profile.update',

  RequestCreate = 'request.create',
  RequestStatusChange = 'request.status_change',

  DocumentDownload = 'document.download',
  DocumentExpired = 'document.expired',
  DocumentDeleted = 'document.deleted',

  PaymentInitiated = 'payment.initiated',
  PaymentVerified = 'payment.verified',
  PaymentFailed = 'payment.failed',

  AdminLogin = 'admin.login',
  AdminTransferApprove = 'admin.transfer_approve',
  AdminTransferReject = 'admin.transfer_reject',
  AdminViewRequest = 'admin.view_request',
}

export interface AuditEntryInput {
  actorId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipRaw?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntry {
  id?: number;
  actor_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_hash?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  prev_hash?: string;
  curr_hash: string;
  created_at?: string;
}
