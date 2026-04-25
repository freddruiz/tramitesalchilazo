import type { IPaymentProvider } from '@tramitesalchilazo/shared';
import { PaymentMethodEnum } from '@tramitesalchilazo/shared';

const _registry = new Map<PaymentMethodEnum, IPaymentProvider>();

export function registerPaymentProvider(
  method: PaymentMethodEnum,
  provider: IPaymentProvider,
): void {
  _registry.set(method, provider);
}

export function getPaymentProvider(method: PaymentMethodEnum): IPaymentProvider {
  const provider = _registry.get(method);
  if (!provider) {
    throw new Error(`Payment provider not configured for method: ${method}`);
  }
  return provider;
}

// Exposed only for test isolation — do not call in application code.
export function _resetRegistryForTests(): void {
  _registry.clear();
}
