import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IPaymentProvider } from '../IPaymentProvider.js';
import type {
  NormalizedPaymentEvent,
  PaymentIntentParams,
  PaymentIntentResult,
  VerifiedWebhookPayload,
} from '../types.js';

type VisanetEventType = 'TRANSACTION_APPROVED' | 'TRANSACTION_DECLINED' | 'REFUND_PROCESSED';

interface VisanetTransactionResponse {
  transaction_id: string;
  redirect_url: string;
  status: string;
}

interface VisanetWebhookBody {
  event_type: VisanetEventType;
  transaction_id: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

const EVENT_TYPE_MAP: Record<VisanetEventType, NormalizedPaymentEvent['type']> = {
  TRANSACTION_APPROVED: 'payment.succeeded',
  TRANSACTION_DECLINED: 'payment.failed',
  REFUND_PROCESSED: 'payment.refunded',
};

export class VisanetAdapter implements IPaymentProvider {
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    webhookSecret: string,
    baseUrl = 'https://api.visanet.com.gt/v1',
  ) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
    this.baseUrl = baseUrl;
  }

  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'Idempotency-Key': params.idempotencyKey,
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: params.currency,
        reference_id: params.requestId,
        metadata: params.metadata ?? {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Visanet createPaymentIntent failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as VisanetTransactionResponse;
    return {
      intentId: data.transaction_id,
      redirectUrl: data.redirect_url,
      status: data.status,
    };
  }

  async verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
  ): Promise<VerifiedWebhookPayload | null> {
    let sigBuf: Buffer;
    try {
      sigBuf = Buffer.from(signature, 'hex');
    } catch {
      return null;
    }

    const expectedHex = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');

    if (
      sigBuf.length === 0 ||
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      return null;
    }

    // Trusted cast — this adapter is the only authorized producer of VerifiedWebhookPayload.
    return { raw: rawBody, parsed } as unknown as VerifiedWebhookPayload;
  }

  normalizeWebhookEvent(verifiedPayload: VerifiedWebhookPayload): NormalizedPaymentEvent {
    const body = verifiedPayload.parsed as VisanetWebhookBody;
    const type = EVENT_TYPE_MAP[body.event_type];
    if (!type) {
      throw new Error(`Unknown Visanet event type: ${String(body.event_type)}`);
    }
    return {
      type,
      intentId: body.transaction_id,
      amountCents: body.amount,
      currency: body.currency,
      ...(body.metadata ? { metadata: body.metadata } : {}),
    };
  }
}
