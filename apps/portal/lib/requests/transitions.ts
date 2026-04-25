import { supabaseAdmin } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';
import {
  validateTransition,
  InvalidTransitionError,
  RequestStatus,
} from '@tramitesalchilazo/shared';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';

export { RequestStatus };

export async function transitionRequest(
  requestId: string,
  toStatus: RequestStatus,
  actorId: string,
): Promise<void> {
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('service_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  if (fetchError || !row) {
    throw new AppError('REQUEST_INVALID_TRANSITION', 404, `Request ${requestId} not found`);
  }

  const fromStatus = row.status as RequestStatus;

  try {
    validateTransition(fromStatus, toStatus);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new AppError('REQUEST_INVALID_TRANSITION', 422, err.message);
    }
    throw err;
  }

  const { error: updateError } = await supabaseAdmin
    .from('service_requests')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) {
    throw new Error(`Failed to update request status: ${updateError.message}`);
  }

  await writeAuditEntry(
    {
      actorId,
      action: AuditAction.RequestStatusChange,
      resourceType: 'service_request',
      resourceId: requestId,
      metadata: { from: fromStatus, to: toStatus },
    },
    supabaseAdmin,
  );
}
