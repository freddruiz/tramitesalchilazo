import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../hash.js';

describe('hash', () => {
  it('hashPassword produces a valid argon2id hash', async () => {
    const hash = await hashPassword('mypassword');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('hashPassword produces different hashes for same input (random salt)', async () => {
    const hash1 = await hashPassword('samepassword');
    const hash2 = await hashPassword('samepassword');
    expect(hash1).not.toBe(hash2);
  });

  it('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('correcthorsebatterystaple');
    expect(await verifyPassword('correcthorsebatterystaple', hash)).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correctpassword');
    expect(await verifyPassword('wrongpassword', hash)).toBe(false);
  });

  it('hashPassword throws if input already looks like an argon2 hash (double-hashing guard)', async () => {
    const hash = await hashPassword('original');
    await expect(hashPassword(hash)).rejects.toThrow(
      'Double-hashing detected',
    );
  });
});
