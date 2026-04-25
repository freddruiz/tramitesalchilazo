import type {
  NormalizedPaymentEvent,
  PaymentIntentParams,
  PaymentIntentResult,
  VerifiedWebhookPayload,
} from './types.js';

export interface IPaymentProvider {
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
  // Returns a branded VerifiedWebhookPayload on success, null if signature is invalid.
  // The return type is the only way to produce a VerifiedWebhookPayload, which
  // normalizeWebhookEvent requires — compile-time enforcement of verification order.
  verifyWebhookSignature(rawBody: Buffer, signature: string): Promise<VerifiedWebhookPayload | null>;
  normalizeWebhookEvent(verifiedPayload: VerifiedWebhookPayload): NormalizedPaymentEvent;
}
