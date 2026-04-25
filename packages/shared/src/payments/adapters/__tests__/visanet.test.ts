import { createHmac } from 'node:crypto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { VisanetAdapter } from '../visanet.js';
import type { NormalizedPaymentEvent, VerifiedWebhookPayload } from '../../types.js';

const API_KEY = 'test-api-key';
const WEBHOOK_SECRET = 'test-webhook-secret';

function makeAdapter(baseUrl = 'https://api.visanet.test/v1'): VisanetAdapter {
  return new VisanetAdapter(API_KEY, WEBHOOK_SECRET, baseUrl);
}

function signBody(body: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
}

function makeVerifiedPayload(body: object): VerifiedWebhookPayload {
  return { raw: Buffer.from(JSON.stringify(body)), parsed: body } as unknown as VerifiedWebhookPayload;
}

describe('VisanetAdapter', () => {
  const adapter = makeAdapter();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── createPaymentIntent ───────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    const params = {
      amountCents: 9500,
      currency: 'GTQ',
      requestId: 'req-001',
      idempotencyKey: 'idem-uuid-001',
    };

    it('returns intentId, redirectUrl, and status on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            transaction_id: 'txn_abc123',
            redirect_url: 'https://pay.visanet.test/txn_abc123',
            status: 'PENDING',
          }),
        }),
      );

      const result = await adapter.createPaymentIntent(params);

      expect(result.intentId).toBe('txn_abc123');
      expect(result.redirectUrl).toBe('https://pay.visanet.test/txn_abc123');
      expect(result.status).toBe('PENDING');
      expect(result.clientSecret).toBeUndefined();
    });

    it('sends Authorization header and Idempotency-Key', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transaction_id: 'txn_xyz',
          redirect_url: 'https://pay.visanet.test/txn_xyz',
          status: 'PENDING',
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      await adapter.createPaymentIntent(params);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe(`Bearer ${API_KEY}`);
      expect(headers['Idempotency-Key']).toBe(params.idempotencyKey);
    });

    it('throws when response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({ ok: false, status: 422 }),
      );

      await expect(adapter.createPaymentIntent(params)).rejects.toThrow(
        'Visanet createPaymentIntent failed: HTTP 422',
      );
    });
  });

  // ─── verifyWebhookSignature ────────────────────────────────────────────

  describe('verifyWebhookSignature', () => {
    const body = JSON.stringify({ event_type: 'TRANSACTION_APPROVED', transaction_id: 'txn_1' });
    const rawBody = Buffer.from(body);

    it('returns VerifiedWebhookPayload for a valid HMAC-SHA256 signature', async () => {
      const sig = signBody(body);
      const result = await adapter.verifyWebhookSignature(rawBody, sig);

      expect(result).not.toBeNull();
      expect((result as VerifiedWebhookPayload).raw).toEqual(rawBody);
    });

    it('returns null for an incorrect signature', async () => {
      const result = await adapter.verifyWebhookSignature(rawBody, 'deadbeef'.repeat(8));
      expect(result).toBeNull();
    });

    it('returns null for an empty signature', async () => {
      const result = await adapter.verifyWebhookSignature(rawBody, '');
      expect(result).toBeNull();
    });

    it('returns null for a valid signature computed with the wrong secret', async () => {
      const badSig = createHmac('sha256', 'wrong-secret').update(rawBody).digest('hex');
      const result = await adapter.verifyWebhookSignature(rawBody, badSig);
      expect(result).toBeNull();
    });

    it('returns null if body is not valid JSON', async () => {
      const invalidBody = Buffer.from('not-json');
      const sig = createHmac('sha256', WEBHOOK_SECRET).update(invalidBody).digest('hex');
      const result = await adapter.verifyWebhookSignature(invalidBody, sig);
      expect(result).toBeNull();
    });
  });

  // ─── normalizeWebhookEvent ─────────────────────────────────────────────

  describe('normalizeWebhookEvent', () => {
    const baseBody = {
      transaction_id: 'txn_norm_1',
      amount: 8500,
      currency: 'GTQ',
      timestamp: '2026-04-25T12:00:00Z',
    };

    it('maps TRANSACTION_APPROVED → payment.succeeded', () => {
      const payload = makeVerifiedPayload({ ...baseBody, event_type: 'TRANSACTION_APPROVED' });
      const event: NormalizedPaymentEvent = adapter.normalizeWebhookEvent(payload);

      expect(event.type).toBe('payment.succeeded');
      expect(event.intentId).toBe('txn_norm_1');
      expect(event.amountCents).toBe(8500);
      expect(event.currency).toBe('GTQ');
    });

    it('maps TRANSACTION_DECLINED → payment.failed', () => {
      const payload = makeVerifiedPayload({ ...baseBody, event_type: 'TRANSACTION_DECLINED' });
      const event = adapter.normalizeWebhookEvent(payload);

      expect(event.type).toBe('payment.failed');
      expect(event.intentId).toBe('txn_norm_1');
    });

    it('maps REFUND_PROCESSED → payment.refunded', () => {
      const payload = makeVerifiedPayload({ ...baseBody, event_type: 'REFUND_PROCESSED' });
      const event = adapter.normalizeWebhookEvent(payload);

      expect(event.type).toBe('payment.refunded');
      expect(event.intentId).toBe('txn_norm_1');
    });

    it('includes metadata when present', () => {
      const payload = makeVerifiedPayload({
        ...baseBody,
        event_type: 'TRANSACTION_APPROVED',
        metadata: { requestId: 'req-99' },
      });
      const event = adapter.normalizeWebhookEvent(payload);

      expect(event.metadata).toEqual({ requestId: 'req-99' });
    });

    it('omits metadata key when not present', () => {
      const payload = makeVerifiedPayload({ ...baseBody, event_type: 'TRANSACTION_APPROVED' });
      const event = adapter.normalizeWebhookEvent(payload);

      expect(Object.hasOwn(event, 'metadata')).toBe(false);
    });

    it('throws for unknown event types', () => {
      const payload = makeVerifiedPayload({ ...baseBody, event_type: 'UNKNOWN_EVENT' });
      expect(() => adapter.normalizeWebhookEvent(payload)).toThrow('Unknown Visanet event type');
    });
  });

  // ─── adapter is stateless between calls ───────────────────────────────

  describe('isolation', () => {
    it('two adapter instances with different secrets produce different signatures', async () => {
      const adapter2 = new VisanetAdapter(API_KEY, 'different-secret');
      const body = Buffer.from('{"event_type":"TRANSACTION_APPROVED"}');
      const sig = signBody(body.toString());

      expect(await adapter.verifyWebhookSignature(body, sig)).not.toBeNull();
      expect(await adapter2.verifyWebhookSignature(body, sig)).toBeNull();
    });
  });
});
