import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────
// Must be hoisted before any imports that transitively require these modules.

vi.mock('../lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@tramitesalchilazo/shared', () => ({
  generateDek: vi.fn(),
  wrapDek: vi.fn(),
  encrypt: vi.fn(),
  hashPassword: vi.fn(),
  deterministicHmac: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// ── Imports (after mocks are registered) ─────────────────────────────────────
import { POST } from '../app/api/profile/complete/route';
import { getSession } from '../lib/auth/session';
import {
  generateDek,
  wrapDek,
  encrypt,
  hashPassword,
  deterministicHmac,
} from '@tramitesalchilazo/shared';
import { createClient } from '@supabase/supabase-js';
import { guatemalaDpiSchema, profileCompleteSchema } from '../lib/schemas/profile';
import type { AppSession } from '../lib/auth/session';
import { NextRequest } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Valid Guatemalan DPI: 1234567890128
 * Weights [2,3,4,5,6,7,2,3,4,5,6,7] applied to first 12 digits:
 *   2+6+12+20+30+42+14+24+36+0+6+14 = 206  →  206 % 11 = 8  →  verifier = 8
 */
const VALID_DPI = '1234567890128';
const INVALID_DPI_CHECKSUM = '1234567890123'; // last digit 3 ≠ 8

const mockGetSession = vi.mocked(getSession);
const mockGenerateDek = vi.mocked(generateDek);
const mockWrapDek = vi.mocked(wrapDek);
const mockEncrypt = vi.mocked(encrypt);
const mockHashPassword = vi.mocked(hashPassword);
const mockDeterministicHmac = vi.mocked(deterministicHmac);
const mockCreateClient = vi.mocked(createClient);

function makeSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    userId: 'user-abc',
    role: 'client',
    profileComplete: false,
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/profile/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    full_name: 'María García López',
    dpi: VALID_DPI,
    secondary_password: 'SecurePass1',
    confirm_password: 'SecurePass1',
    consent_accepted: true as const,
  };
}

function setupCryptoMocks() {
  const fakeDek = Buffer.alloc(32, 0xab);
  mockGenerateDek.mockReturnValue(fakeDek);
  mockWrapDek.mockReturnValue('{"ciphertext":"abc","iv":"def","tag":"ghi"}');
  mockEncrypt.mockReturnValue({ ciphertext: 'enc', iv: 'iv1', tag: 'tag1' });
  mockHashPassword.mockResolvedValue('$argon2id$...');
  mockDeterministicHmac.mockReturnValue('deadbeef');
  return fakeDek;
}

function setupSupabaseMock(insertError: unknown = null, updateError: unknown = null) {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: updateError }),
  });
  const mockInsert = vi.fn().mockResolvedValue({ error: insertError });
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'user_profiles') return { insert: mockInsert };
    if (table === 'users') return { update: mockUpdate };
    return {};
  });
  mockCreateClient.mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createClient>);
  return { mockInsert, mockUpdate, mockFrom };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.HMAC_SECRET = 'test-hmac-secret-that-is-long-enough-32b';
  process.env.CONSENT_VERSION = 'v1.0';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test 1: Valid DPI + password → profile row created
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/profile/complete — happy path', () => {
  it('inserts profile row and returns 200 when all inputs are valid', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    setupCryptoMocks();
    const { mockInsert } = setupSupabaseMock();

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });

    expect(mockInsert).toHaveBeenCalledOnce();
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.user_id).toBe('user-abc');
    expect(inserted.full_name).toBe('María García López');
    expect(inserted.dpi_hmac).toBe('deadbeef');
    // dpi plaintext must NOT appear in the inserted object
    expect(JSON.stringify(inserted)).not.toContain(VALID_DPI);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test 2: Invalid DPI checksum → 422
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/profile/complete — invalid DPI checksum', () => {
  it('returns 422 with validation issues when DPI checksum is wrong', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    setupCryptoMocks();
    setupSupabaseMock();

    const res = await POST(makeRequest({ ...validBody(), dpi: INVALID_DPI_CHECKSUM }));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
    expect(json.issues).toBeInstanceOf(Array);
    const dpiIssue = (json.issues as Array<{ path: string[] }>).find(
      (i) => i.path[0] === 'dpi',
    );
    expect(dpiIssue).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test 3: Duplicate DPI (same HMAC) → 409 conflict
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/profile/complete — duplicate DPI', () => {
  it('returns 409 when Supabase unique constraint is violated', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    setupCryptoMocks();
    setupSupabaseMock({ code: '23505', message: 'duplicate key value' });

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('DPI');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test 4: DPI ciphertext differs between two encryptions of the same DPI
// (random IV per call → ciphertext differs even for same plaintext + same key)
// ═══════════════════════════════════════════════════════════════════════════════
describe('DPI ciphertext randomness', () => {
  it('produces different ciphertext for the same DPI when encrypted twice', async () => {
    // Use the real encrypt function from shared for this test
    const { encrypt: realEncrypt, generateDek: realGenerateDek } =
      await vi.importActual<typeof import('@tramitesalchilazo/shared')>(
        '@tramitesalchilazo/shared',
      );

    const dek1 = realGenerateDek();
    const dek2 = realGenerateDek();
    const plaintext = Buffer.from(VALID_DPI, 'utf8');

    const envelope1 = realEncrypt(plaintext, dek1);
    const envelope2 = realEncrypt(plaintext, dek2);

    // Different DEKs → different ciphertexts AND different IVs
    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
    expect(envelope1.iv).not.toBe(envelope2.iv);

    // Even same DEK, different call → different IV (AES-GCM uses random IV)
    const envelope3 = realEncrypt(plaintext, dek1);
    expect(envelope1.iv).not.toBe(envelope3.iv);
    expect(envelope1.ciphertext).not.toBe(envelope3.ciphertext);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Test 5: Extra fields in POST body → 422 (Zod .strict())
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/profile/complete — extra fields rejected', () => {
  it('returns 422 when POST body contains unrecognised fields', async () => {
    mockGetSession.mockResolvedValue(makeSession());
    setupCryptoMocks();
    setupSupabaseMock();

    const res = await POST(
      makeRequest({ ...validBody(), admin_override: true, role: 'admin' }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Schema unit tests (isolated, no HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
describe('guatemalaDpiSchema', () => {
  it('accepts a DPI with correct checksum', () => {
    expect(guatemalaDpiSchema.safeParse(VALID_DPI).success).toBe(true);
  });

  it('rejects a DPI with wrong checksum', () => {
    expect(guatemalaDpiSchema.safeParse(INVALID_DPI_CHECKSUM).success).toBe(false);
  });

  it('rejects a DPI that is not 13 digits', () => {
    expect(guatemalaDpiSchema.safeParse('123456789012').success).toBe(false);
    expect(guatemalaDpiSchema.safeParse('12345678901234').success).toBe(false);
  });

  it('rejects a DPI containing non-digit characters', () => {
    expect(guatemalaDpiSchema.safeParse('123456789012X').success).toBe(false);
  });
});

describe('profileCompleteSchema (.strict())', () => {
  it('rejects extra fields', () => {
    const result = profileCompleteSchema.safeParse({
      ...validBody(),
      extra: 'field',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = profileCompleteSchema.safeParse({
      ...validBody(),
      confirm_password: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when consent_accepted is false', () => {
    const result = profileCompleteSchema.safeParse({
      ...validBody(),
      consent_accepted: false,
    });
    expect(result.success).toBe(false);
  });
});
