import { randomBytes } from 'node:crypto';
import { encrypt, decrypt } from './envelope.js';

export function generateDek(): Buffer {
  return randomBytes(32);
}

function getMasterKey(): Buffer {
  const secret = process.env['SUPABASE_VAULT_SECRET'];
  if (!secret) {
    throw new Error('SUPABASE_VAULT_SECRET environment variable is not set');
  }

  const keyBytes = Buffer.from(secret, 'base64url');
  if (keyBytes.length !== 32) {
    throw new Error(
      'SUPABASE_VAULT_SECRET must decode to exactly 32 bytes (use base64url-encoded 256-bit key)',
    );
  }

  return keyBytes;
}

export function wrapDek(dek: Buffer): string {
  const masterKey = getMasterKey();
  const envelope = encrypt(dek, masterKey);
  return JSON.stringify(envelope);
}

export function unwrapDek(wrapped: string): Buffer {
  const masterKey = getMasterKey();
  const { ciphertext, iv, tag } = JSON.parse(wrapped) as {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  return decrypt(ciphertext, iv, tag, masterKey);
}
