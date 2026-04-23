import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  if (plain.startsWith('$argon2')) {
    throw new Error(
      'Double-hashing detected: input is already an Argon2 hash string',
    );
  }
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return argon2.verify(hash, plain);
}
