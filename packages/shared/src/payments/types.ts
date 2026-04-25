export enum PaymentMethodEnum {
  Recurrente = 'recurrente',
  NeoNet = 'neonet',
  Visanet = 'visanet',
  Stripe = 'stripe',
  BankTransfer = 'bank_transfer',
}

export interface PaymentIntentParams {
  amountCents: number;
  currency: string;
  requestId: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  intentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  status: string;
}

// Branded opaque type — only producible by IPaymentProvider.verifyWebhookSignature.
// Passing this as the sole input to normalizeWebhookEvent enforces verification order
// at compile time: you cannot normalize an unverified payload.
declare const _verifiedBrand: unique symbol;
export type VerifiedWebhookPayload = {
  readonly [_verifiedBrand]: void;
  readonly raw: Buffer;
  readonly parsed: unknown;
};

export interface NormalizedPaymentEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
  intentId: string;
  amountCents: number;
  currency: string;
  metadata?: Record<string, string>;
}
