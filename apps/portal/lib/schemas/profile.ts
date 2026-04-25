import { z } from 'zod';

/**
 * Guatemalan CUI checksum (RENAP specification).
 * Weights [2,3,4,5,6,7] applied twice across first 12 digits.
 * Sum mod 11 must equal digit 13; value 10 is unassigned → invalid.
 */
function isValidDpiChecksum(dpi: string): boolean {
  const digits = dpi.split('').map(Number);
  const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * weights[i]!, 0);
  const computed = sum % 11;
  return computed !== 10 && computed === digits[12];
}

export const guatemalaDpiSchema = z
  .string()
  .regex(/^\d{13}$/, 'DPI must be exactly 13 digits')
  .refine(isValidDpiChecksum, 'Invalid DPI checksum');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const profileCompleteSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required').max(200).trim(),
    dpi: guatemalaDpiSchema,
    secondary_password: passwordSchema,
    confirm_password: z.string(),
    consent_accepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms to continue' }),
    }),
  })
  .strict()
  .refine((data) => data.secondary_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ProfileCompleteInput = z.infer<typeof profileCompleteSchema>;
