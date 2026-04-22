import { z } from 'zod';

export const paginationSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
  })
  .strict();

export const uuidSchema = z.string().uuid();

function validateGuatemalanDpi(dpi: string): boolean {
  if (!/^\d{13}$/.test(dpi)) return false;

  const digits = dpi.split('').map(Number);
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }

  const remainder = sum % 11;
  const expectedCheckDigit = remainder === 0 ? 0 : 11 - remainder;

  const actualCheckDigit = digits[8];
  return actualCheckDigit === expectedCheckDigit;
}

export const guatemalaDpiSchema = z.string().refine(validateGuatemalanDpi, {
  message: 'Invalid Guatemala DPI (CUI)',
});

export const emailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(z.string().email());

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .refine((val) => /[A-Z]/.test(val), 'Password must contain uppercase letter')
  .refine((val) => /[a-z]/.test(val), 'Password must contain lowercase letter')
  .refine((val) => /\d/.test(val), 'Password must contain digit')
  .refine((val) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), 'Password must contain special character');
