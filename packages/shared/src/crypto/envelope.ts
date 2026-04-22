import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptedEnvelope {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encrypt(plaintext: Buffer, dek: Buffer): EncryptedEnvelope {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes for AES-256-GCM');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, dek, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
  };
}

export function decrypt(
  ciphertext: string,
  iv: string,
  tag: string,
  dek: Buffer,
): Buffer {
  if (dek.length !== 32) {
    throw new Error('DEK must be 32 bytes for AES-256-GCM');
  }

  const ivBuf = Buffer.from(iv, 'base64url');
  const tagBuf = Buffer.from(tag, 'base64url');
  const ciphertextBuf = Buffer.from(ciphertext, 'base64url');

  if (ivBuf.length !== IV_LENGTH) {
    throw new Error('IV must be 12 bytes');
  }
  if (tagBuf.length !== TAG_LENGTH) {
    throw new Error('Auth tag must be 16 bytes');
  }

  const decipher = createDecipheriv(ALGORITHM, dek, ivBuf);
  decipher.setAuthTag(tagBuf);

  return Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);
}
