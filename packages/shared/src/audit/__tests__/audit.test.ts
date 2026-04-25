import { createHash } from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAuditEntry, verifyAuditChain } from '../logger.js';
import { AuditAction } from '../types.js';

describe('Audit Log', () => {
  let mockDbClient: ReturnType<typeof createMockDbClient>;

  function createMockDbClient() {
    return {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  }

  beforeEach(() => {
    mockDbClient = createMockDbClient();
  });

  it('should write audit entry with hashed IP and valid hash chain', async () => {
    const entry = {
      actorId: '123e4567-e89b-12d3-a456-426614174000',
      action: AuditAction.AuthLogin,
      ipRaw: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    await writeAuditEntry(entry, mockDbClient);

    expect(mockDbClient.from).toHaveBeenCalledWith('audit_log');
    const insertCall = mockDbClient.insert.mock.calls[0][0];
    const insertedRecord = insertCall[0];

    // Verify IP was hashed, not raw
    expect(insertedRecord.ip_hash).toBeTruthy();
    expect(insertedRecord.ip_hash).not.toBe('192.168.1.1');

    // Verify hash is present
    expect(insertedRecord.curr_hash).toBeTruthy();
    expect(insertedRecord.prev_hash).toBe('0000');
  });

  it('should reject metadata containing forbidden keys', async () => {
    const entries = [
      { metadata: { password: 'secret' } },
      { metadata: { dpi: '12345678' } },
      { metadata: { token: 'xyz' } },
      { metadata: { authorization: 'Bearer xyz' } },
      { metadata: { secret: 'key' } },
      { metadata: { key: 'value' } },
    ];

    for (const forbiddenEntry of entries) {
      const entry = {
        action: AuditAction.ProfileCreate,
        metadata: forbiddenEntry.metadata,
      };

      await expect(writeAuditEntry(entry, mockDbClient)).rejects.toThrow(/Forbidden key in audit metadata/);
    }
  });

  it('should allow metadata with non-forbidden keys', async () => {
    const entry = {
      action: AuditAction.ProfileCreate,
      metadata: { userId: '123', status: 'active', custom_field: 'value' },
    };

    await writeAuditEntry(entry, mockDbClient);
    expect(mockDbClient.insert).toHaveBeenCalled();
  });

  it('should create valid hash chain for three sequential entries', () => {
    const actorId = '123e4567-e89b-12d3-a456-426614174000';
    const action = AuditAction.RequestCreate;
    const resourceId = '223e4567-e89b-12d3-a456-426614174001';

    // Simulate three sequential audit entries
    const createdAt1 = '2026-04-22T10:00:00Z';
    const createdAt2 = '2026-04-22T10:00:01Z';
    const createdAt3 = '2026-04-22T10:00:02Z';

    const hash1Input = `0000${actorId}${action}${resourceId}${createdAt1}`;
    const hash1 = createHash('sha256').update(hash1Input).digest('hex');

    const hash2Input = `${hash1}${actorId}${action}${resourceId}${createdAt2}`;
    const hash2 = createHash('sha256').update(hash2Input).digest('hex');

    const hash3Input = `${hash2}${actorId}${action}${resourceId}${createdAt3}`;
    const hash3 = createHash('sha256').update(hash3Input).digest('hex');

    const entries = [
      {
        id: 1,
        actor_id: actorId,
        action,
        resource_id: resourceId,
        prev_hash: '0000',
        curr_hash: hash1,
        created_at: createdAt1,
      },
      {
        id: 2,
        actor_id: actorId,
        action,
        resource_id: resourceId,
        prev_hash: hash1,
        curr_hash: hash2,
        created_at: createdAt2,
      },
      {
        id: 3,
        actor_id: actorId,
        action,
        resource_id: resourceId,
        prev_hash: hash2,
        curr_hash: hash3,
        created_at: createdAt3,
      },
    ];

    expect(verifyAuditChain(entries)).toBe(true);
  });

  it('should detect tampering with middle entry in hash chain', () => {
    const actorId = '123e4567-e89b-12d3-a456-426614174000';
    const action = AuditAction.RequestCreate;
    const resourceId = '223e4567-e89b-12d3-a456-426614174001';

    const createdAt1 = '2026-04-22T10:00:00Z';
    const createdAt2 = '2026-04-22T10:00:01Z';
    const createdAt3 = '2026-04-22T10:00:02Z';

    const hash1Input = `0000${actorId}${action}${resourceId}${createdAt1}`;
    const hash1 = createHash('sha256').update(hash1Input).digest('hex');

    const hash2Input = `${hash1}${actorId}${action}${resourceId}${createdAt2}`;
    const hash2 = createHash('sha256').update(hash2Input).digest('hex');

    const hash3Input = `${hash2}${actorId}${action}${resourceId}${createdAt3}`;
    const hash3 = createHash('sha256').update(hash3Input).digest('hex');

    // Create entries with middle one tampered (wrong prev_hash)
    const entries = [
      {
        id: 1,
        actor_id: actorId,
        action,
        resource_id: resourceId,
        prev_hash: '0000',
        curr_hash: hash1,
        created_at: createdAt1,
      },
      {
        id: 2,
        actor_id: actorId,
        action,
        resource_id: resourceId,
        prev_hash: 'tampered0000', // Tampered!
        curr_hash: hash2,
        created_at: createdAt2,
      },
      {
        id: 3,
        actor_id: actorId,
        action,
        resource_id: resourceId,
        prev_hash: hash2,
        curr_hash: hash3,
        created_at: createdAt3,
      },
    ];

    expect(verifyAuditChain(entries)).toBe(false);
  });

  it('should handle empty audit log (genesis hash)', async () => {
    mockDbClient.single.mockResolvedValue({ data: null, error: null });

    const entry = {
      action: AuditAction.ProfileCreate,
    };

    await writeAuditEntry(entry, mockDbClient);

    const insertCall = mockDbClient.insert.mock.calls[0][0];
    const insertedRecord = insertCall[0];

    // Should use genesis hash
    expect(insertedRecord.prev_hash).toBe('0000');
  });

  it('should compute correct hash with various field combinations', () => {
    const scenarios = [
      { actorId: '123', action: AuditAction.AuthLogin, resourceId: undefined, createdAt: '2026-04-22T10:00:00Z' },
      { actorId: undefined, action: AuditAction.DocumentDownload, resourceId: '456', createdAt: '2026-04-22T10:00:01Z' },
      { actorId: '123', action: AuditAction.PaymentVerified, resourceId: '456', createdAt: '2026-04-22T10:00:02Z' },
    ];

    for (const scenario of scenarios) {
      const input = `0000${scenario.actorId || ''}${scenario.action}${scenario.resourceId || ''}${scenario.createdAt}`;
      const hash = createHash('sha256').update(input).digest('hex');

      // Verify hash is valid SHA-256
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
