import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIpAllowlist } from '../lib/admin/ipAllowlist';

// ── IP allowlist tests ─────────────────────────────────────

describe('checkIpAllowlist', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows all IPs when ADMIN_IP_ALLOWLIST is not set', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '');
    const result = checkIpAllowlist('1.2.3.4');
    expect(result.allowed).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('allows IP that exactly matches an entry', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '203.0.113.5,10.0.0.1');
    expect(checkIpAllowlist('203.0.113.5').allowed).toBe(true);
  });

  it('blocks IP not in the allowlist', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '203.0.113.5');
    expect(checkIpAllowlist('1.2.3.4').allowed).toBe(false);
  });

  it('allows IP within a /24 CIDR block', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '192.168.1.0/24');
    expect(checkIpAllowlist('192.168.1.100').allowed).toBe(true);
    expect(checkIpAllowlist('192.168.1.255').allowed).toBe(true);
  });

  it('blocks IP outside a /24 CIDR block', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '192.168.1.0/24');
    expect(checkIpAllowlist('192.168.2.1').allowed).toBe(false);
  });

  it('allows IP within a /8 CIDR block (private range)', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '10.0.0.0/8');
    expect(checkIpAllowlist('10.255.255.255').allowed).toBe(true);
    expect(checkIpAllowlist('10.0.0.1').allowed).toBe(true);
  });

  it('blocks IP outside a /8 CIDR block', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '10.0.0.0/8');
    expect(checkIpAllowlist('11.0.0.1').allowed).toBe(false);
  });

  it('handles comma-separated multiple CIDRs', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16');
    expect(checkIpAllowlist('10.1.2.3').allowed).toBe(true);
    expect(checkIpAllowlist('172.20.0.1').allowed).toBe(true);
    expect(checkIpAllowlist('192.168.99.1').allowed).toBe(true);
    expect(checkIpAllowlist('8.8.8.8').allowed).toBe(false);
  });

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '127.0.0.0/8');
    expect(checkIpAllowlist('::ffff:127.0.0.1').allowed).toBe(true);
  });

  it('handles /32 (single host) CIDR', () => {
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '203.0.113.5/32');
    expect(checkIpAllowlist('203.0.113.5').allowed).toBe(true);
    expect(checkIpAllowlist('203.0.113.6').allowed).toBe(false);
  });
});

// ── Admin MFA session TTL ──────────────────────────────────

const ADMIN_MFA_SESSION_MS = 4 * 60 * 60 * 1000;

function isMfaSessionValid(adminMfaVerifiedAt?: number): boolean {
  if (!adminMfaVerifiedAt) return false;
  return Date.now() - adminMfaVerifiedAt * 1000 < ADMIN_MFA_SESSION_MS;
}

describe('admin MFA session TTL (4 hours)', () => {
  it('passes when MFA was verified 1 minute ago', () => {
    const ts = Math.floor((Date.now() - 60_000) / 1000);
    expect(isMfaSessionValid(ts)).toBe(true);
  });

  it('passes when MFA was verified exactly 3h 59m ago', () => {
    const ts = Math.floor((Date.now() - (4 * 60 * 60 * 1000 - 60_000)) / 1000);
    expect(isMfaSessionValid(ts)).toBe(true);
  });

  it('blocks when MFA was verified 4h 1m ago', () => {
    const ts = Math.floor((Date.now() - (4 * 60 * 60 * 1000 + 60_000)) / 1000);
    expect(isMfaSessionValid(ts)).toBe(false);
  });

  it('blocks when adminMfaVerifiedAt is absent', () => {
    expect(isMfaSessionValid(undefined)).toBe(false);
  });
});
