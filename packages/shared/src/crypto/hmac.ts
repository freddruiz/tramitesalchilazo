import { createHmac } from 'node:crypto';

export function deterministicHmac(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}
