import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  paginationSchema,
  uuidSchema,
  guatemalaDpiSchema,
  emailSchema,
  passwordSchema,
} from '../base.js';

describe('Zod Schemas', () => {
  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, limit: 50 });
      }
    });

    it('should reject extra fields (strict mode)', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 50, extra: 'field' });
      expect(result.success).toBe(false);
    });

    it('should reject page < 1', () => {
      const result = paginationSchema.safeParse({ page: 0, limit: 50 });
      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe('uuidSchema', () => {
    it('should accept valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = uuidSchema.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });
  });

  describe('guatemalaDpiSchema', () => {
    it('should accept valid Guatemala DPI (CUI)', () => {
      const validDpi = '1234567820000';
      const result = guatemalaDpiSchema.safeParse(validDpi);
      expect(result.success).toBe(true);
    });

    it('should reject invalid check digit', () => {
      const invalidDpi = '1234567890000';
      const result = guatemalaDpiSchema.safeParse(invalidDpi);
      expect(result.success).toBe(false);
    });

    it('should reject wrong length', () => {
      const shortDpi = '123456789012';
      const result = guatemalaDpiSchema.safeParse(shortDpi);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric input', () => {
      const nonNumeric = '123456789012a';
      const result = guatemalaDpiSchema.safeParse(nonNumeric);
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should accept valid email and normalize to lowercase', () => {
      const result = emailSchema.safeParse('User@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user@example.com');
      }
    });

    it('should trim whitespace', () => {
      const result = emailSchema.safeParse('  user@example.com  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('user@example.com');
      }
    });

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('should accept strong password', () => {
      const result = passwordSchema.safeParse('SecurePass123!');
      expect(result.success).toBe(true);
    });

    it('should reject password < 12 chars', () => {
      const result = passwordSchema.safeParse('Short1!');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('lowercase123!');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('UPPERCASE123!');
      expect(result.success).toBe(false);
    });

    it('should reject password without digit', () => {
      const result = passwordSchema.safeParse('NoDigitsHere!');
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('NoSpecial123');
      expect(result.success).toBe(false);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '[', ']', '{', '}', ';', ':', "'", '"', '\\', '|', ',', '.', '<', '>', '/', '?'];
      for (const char of specialChars) {
        const password = `SecurePass123${char}`;
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true, `Should accept special char: ${char}`);
      }
    });
  });
});
