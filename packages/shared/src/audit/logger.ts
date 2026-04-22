import { createHash } from 'crypto';
import { deterministicHmac } from '../crypto/hmac.js';
import type { AuditEntryInput } from './types.js';

const FORBIDDEN_METADATA_KEYS = ['password', 'dpi', 'token', 'authorization', 'secret', 'key'];

function validateMetadata(metadata?: Record<string, unknown>): void {
  if (!metadata) return;

  const lowerKeys = Object.keys(metadata).map((k) => k.toLowerCase());
  for (const key of FORBIDDEN_METADATA_KEYS) {
    if (lowerKeys.includes(key)) {
      throw new Error(`Forbidden key in audit metadata: "${key}"`);
    }
  }
}

interface DbClient {
  from(table: string): {
    select(fields: string): {
      order(field: string, options: { ascending: boolean }): {
        limit(n: number): {
          single(): Promise<{ data: { curr_hash: string } | null; error: Error | null }>;
        };
      };
    };
    insert(records: Record<string, unknown>[]): Promise<{ data: unknown; error: Error | null }>;
  };
}

function computeHash(prevHash: string, actorId: string | undefined, action: string, resourceId: string | undefined, createdAt: string): string {
  const input = `${prevHash}${actorId || ''}${action}${resourceId || ''}${createdAt}`;
  return createHash('sha256').update(input).digest('hex');
}

export async function writeAuditEntry(entry: AuditEntryInput, dbClient: DbClient): Promise<void> {
  validateMetadata(entry.metadata);

  // This would be called from an edge function or API route with a Supabase client
  // For now, we provide the interface; actual DB integration happens in the edge function
  const now = new Date().toISOString();

  // In a real implementation, query the database for the last entry
  // For testing, we'll assume this function receives a client that can query
  let prevHash = '0000';
  try {
    const { data: lastEntry } = await dbClient
      .from('audit_log')
      .select('curr_hash')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (lastEntry) {
      prevHash = lastEntry.curr_hash;
    }
  } catch (_err) {
    // No previous entry or query error — use genesis hash
    prevHash = '0000';
  }

  const currHash = computeHash(prevHash, entry.actorId, entry.action, entry.resourceId, now);
  const ipHash = entry.ipRaw ? deterministicHmac(entry.ipRaw, 'audit-ip-hash-secret') : undefined;

  const auditRecord = {
    actor_id: entry.actorId || null,
    action: entry.action,
    resource_type: entry.resourceType || null,
    resource_id: entry.resourceId || null,
    ip_hash: ipHash || null,
    user_agent: entry.userAgent || null,
    metadata: entry.metadata || null,
    prev_hash: prevHash,
    curr_hash: currHash,
    created_at: now,
  };

  const { error } = await dbClient.from('audit_log').insert([auditRecord]);

  if (error) {
    throw new Error(`Failed to write audit entry: ${error.message}`);
  }
}

interface AuditLogEntry {
  id: number;
  actor_id?: string;
  action: string;
  resource_id?: string;
  prev_hash: string;
  curr_hash: string;
  created_at: string;
}

export function verifyAuditChain(entries: AuditLogEntry[]): boolean {
  if (entries.length === 0) return true;

  // Sort by ID to ensure order
  const sorted = [...entries].sort((a, b) => a.id - b.id);

  let expectedPrevHash = '0000';
  for (const entry of sorted) {
    // Verify the stored prev_hash matches the expected prev_hash
    if (entry.id === 1 && expectedPrevHash !== '0000') {
      return false;
    }
    if (entry.id > 1 && entry.prev_hash !== expectedPrevHash) {
      return false;
    }

    // Reconstruct the hash from the entry data
    const reconstructedHash = createHash('sha256')
      .update(`${expectedPrevHash}${entry.actor_id || ''}${entry.action}${entry.resource_id || ''}${entry.created_at}`)
      .digest('hex');

    if (reconstructedHash !== entry.curr_hash) {
      return false;
    }

    expectedPrevHash = entry.curr_hash;
  }

  return true;
}
