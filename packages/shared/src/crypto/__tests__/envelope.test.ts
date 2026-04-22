import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../envelope.js';
import { randomBytes } from 'node:crypto';

describe('envelope', () => {
  const dek = randomBytes(32);

  it('round-trip: decrypt(encrypt(plaintext)) equals original', () => {
    const plaintext = Buffer.from('hello, tramites al chilazo');
    const { ciphertext, iv, tag } = encrypt(plaintext, dek);
    const recovered = decrypt(ciphertext, iv, tag, dek);
    expect(recovered).toEqual(plaintext);
  });

  it('two encryptions of same plaintext produce different ciphertexts (IV randomness)', () => {
    const plaintext = Buffer.from('same plaintext');
    const first = encrypt(plaintext, dek);
    const second = encrypt(plaintext, dek);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });

  it('outputs are base64url strings (no + / = padding)', () => {
    const { ciphertext, iv, tag } = encrypt(Buffer.from('test'), dek);
    const base64urlPattern = /^[A-Za-z0-9_-]+$/;
    expect(ciphertext).toMatch(base64urlPattern);
    expect(iv).toMatch(base64urlPattern);
    expect(tag).toMatch(base64urlPattern);
  });

  it('throws on wrong dek size', () => {
    expect(() => encrypt(Buffer.from('x'), randomBytes(16))).toThrow(
      'DEK must be 32 bytes',
    );
  });

  it('throws when auth tag is tampered', () => {
    const { ciphertext, iv } = encrypt(Buffer.from('secret'), dek);
    const badTag = randomBytes(16).toString('base64url');
    expect(() => decrypt(ciphertext, iv, badTag, dek)).toThrow();
  });
});
