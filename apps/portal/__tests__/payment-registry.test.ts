import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentMethodEnum } from '@tramitesalchilazo/shared';
import type { IPaymentProvider } from '@tramitesalchilazo/shared';
import {
  getPaymentProvider,
  registerPaymentProvider,
  _resetRegistryForTests,
} from '../lib/payments/registry';

function makeStubProvider(name: string): IPaymentProvider {
  return {
    createPaymentIntent: async () => ({ intentId: `${name}-intent`, status: 'pending' }),
    verifyWebhookSignature: async () => null,
    normalizeWebhookEvent: () => {
      throw new Error('not implemented');
    },
  };
}

describe('Payment Provider Registry', () => {
  beforeEach(() => {
    _resetRegistryForTests();
  });

  it('throws when provider is not configured', () => {
    expect(() => getPaymentProvider(PaymentMethodEnum.Recurrente)).toThrow(
      'Payment provider not configured for method: recurrente',
    );
  });

  it('throws for each unconfigured method', () => {
    for (const method of Object.values(PaymentMethodEnum)) {
      expect(() => getPaymentProvider(method as PaymentMethodEnum)).toThrow(
        `Payment provider not configured for method: ${method}`,
      );
    }
  });

  it('returns the registered provider for a given method', () => {
    const stub = makeStubProvider('recurrente');
    registerPaymentProvider(PaymentMethodEnum.Recurrente, stub);

    const result = getPaymentProvider(PaymentMethodEnum.Recurrente);
    expect(result).toBe(stub);
  });

  it('returns the correct provider class per method enum value', () => {
    const recurrente = makeStubProvider('recurrente');
    const stripe = makeStubProvider('stripe');
    const neonet = makeStubProvider('neonet');

    registerPaymentProvider(PaymentMethodEnum.Recurrente, recurrente);
    registerPaymentProvider(PaymentMethodEnum.Stripe, stripe);
    registerPaymentProvider(PaymentMethodEnum.NeoNet, neonet);

    expect(getPaymentProvider(PaymentMethodEnum.Recurrente)).toBe(recurrente);
    expect(getPaymentProvider(PaymentMethodEnum.Stripe)).toBe(stripe);
    expect(getPaymentProvider(PaymentMethodEnum.NeoNet)).toBe(neonet);
  });

  it('does not return a provider registered under a different method', () => {
    const stub = makeStubProvider('stripe');
    registerPaymentProvider(PaymentMethodEnum.Stripe, stub);

    expect(() => getPaymentProvider(PaymentMethodEnum.Recurrente)).toThrow();
  });

  it('overwrites a previously registered provider for the same method', () => {
    const first = makeStubProvider('first');
    const second = makeStubProvider('second');

    registerPaymentProvider(PaymentMethodEnum.Visanet, first);
    registerPaymentProvider(PaymentMethodEnum.Visanet, second);

    expect(getPaymentProvider(PaymentMethodEnum.Visanet)).toBe(second);
  });
});
