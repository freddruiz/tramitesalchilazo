import { NextRequest, NextResponse } from 'next/server';
import { PaymentMethodEnum } from '@tramitesalchilazo/shared';
import type { NormalizedPaymentEvent } from '@tramitesalchilazo/shared';
import { getPaymentProvider } from '../../../../lib/payments/registry';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'refunded']);

const STATUS_MAP: Record<NormalizedPaymentEvent['type'], string> = {
  'payment.succeeded': 'succeeded',
  'payment.failed': 'failed',
  'payment.refunded': 'refunded',
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Raw body — MUST use arrayBuffer, not req.json(), to preserve signature integrity
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get('x-visanet-signature') ?? '';

  // 2. Verify signature BEFORE any DB access
  const provider = getPaymentProvider(PaymentMethodEnum.Visanet);
  const verified = await provider.verifyWebhookSignature(rawBody, signature);
  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // 3. Normalize to internal event shape
    const event = provider.normalizeWebhookEvent(verified);

    // 4. Idempotency: if payment already in terminal state, accept silently
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, request_id, status')
      .eq('idempotency_key', event.intentId)
      .maybeSingle();

    if (payment && TERMINAL_STATUSES.has(payment.status as string)) {
      return NextResponse.json({ ok: true });
    }

    // 5. Update payment status
    await supabaseAdmin
      .from('payments')
      .update({ status: STATUS_MAP[event.type] })
      .eq('idempotency_key', event.intentId);

    // 6. Enqueue automation job on success
    // TODO(S5-01): wire BullMQ job — worker infrastructure not yet built
    // if (event.type === 'payment.succeeded' && payment) {
    //   await jobQueue.add('process-request', { requestId: payment.request_id });
    // }
  } catch (err) {
    // Log server-side; never surface internal errors to the gateway
    console.error('[webhook/visanet]', err);
  }

  // Always acknowledge with 200 after signature validation
  return NextResponse.json({ ok: true });
}
