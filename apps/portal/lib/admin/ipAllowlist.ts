/**
 * IP allowlist checker — Edge Runtime compatible (pure JS, no Node.js crypto).
 *
 * ADMIN_IP_ALLOWLIST: comma-separated CIDRs or exact IPs, e.g. "10.0.0.0/8,203.0.113.5"
 * If the env var is empty or unset, all IPs are allowed but a warning is logged (local dev).
 */

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return NaN;
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const n = parseInt(parts[i]!, 10);
    if (isNaN(n) || n < 0 || n > 255) return NaN;
    result = result * 256 + n;
  }
  return result >>> 0;
}

function isIpv4InCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.lastIndexOf('/');
  if (slashIdx === -1) return ip === cidr;
  const network = cidr.slice(0, slashIdx);
  const prefix = parseInt(cidr.slice(slashIdx + 1), 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const networkInt = ipv4ToInt(network);
  const ipInt = ipv4ToInt(ip);
  if (isNaN(networkInt) || isNaN(ipInt)) return false;
  return (networkInt & mask) === (ipInt & mask);
}

/** Strip IPv4-mapped IPv6 prefix: "::ffff:1.2.3.4" → "1.2.3.4" */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

export interface IpCheckResult {
  allowed: boolean;
  warning?: string;
}

export function checkIpAllowlist(ip: string): IpCheckResult {
  const allowlistEnv = process.env.ADMIN_IP_ALLOWLIST;
  if (!allowlistEnv || allowlistEnv.trim() === '') {
    console.warn('[admin] ADMIN_IP_ALLOWLIST is not set — all IPs allowed (development mode)');
    return { allowed: true, warning: 'ADMIN_IP_ALLOWLIST not configured' };
  }

  const normalized = normalizeIp(ip.trim());
  const entries = allowlistEnv.split(',').map((e) => e.trim()).filter(Boolean);

  for (const entry of entries) {
    if (entry.includes('/')) {
      if (isIpv4InCidr(normalized, entry)) return { allowed: true };
    } else {
      if (normalized === entry || ip.trim() === entry) return { allowed: true };
    }
  }

  return { allowed: false };
}

/** Extract client IP from a Next.js request (middleware context). */
export function extractClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}
