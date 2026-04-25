import { describe, it, expect } from 'vitest';
import { deterministicHmac } from '../hmac.js';

describe('hmac', () => {
  it('same input + same secret always produces same hex output', () => {
    const result1 = deterministicHmac('12345678', 'secret-key');
    const result2 = deterministicHmac('12345678', 'secret-key');
    expect(result1).toBe(result2);
  });

  it('different secret produces different output', () => {
    const result1 = deterministicHmac('12345678', 'secret-key-a');
    const result2 = deterministicHmac('12345678', 'secret-key-b');
    expect(result1).not.toBe(result2);
  });

  it('different data produces different output', () => {
    const result1 = deterministicHmac('data-a', 'secret-key');
    const result2 = deterministicHmac('data-b', 'secret-key');
    expect(result1).not.toBe(result2);
  });

  it('output is lowercase hex', () => {
    const result = deterministicHmac('test', 'key');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});
