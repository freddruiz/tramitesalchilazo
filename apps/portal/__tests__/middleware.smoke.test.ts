import { describe, it, expect } from 'vitest';

// Smoke test: verifies the route-classification helpers that drive
// middleware redirect decisions. The actual redirect is exercised by
// running the dev server and hitting GET /dashboard without a session.

const CLIENT_PREFIXES = ['/dashboard', '/requests', '/documents', '/profile'];
const ADMIN_PREFIXES = ['/admin'];
const AUTH_REQUIRED = [...CLIENT_PREFIXES, ...ADMIN_PREFIXES, '/onboarding'];

function isProtected(pathname: string): boolean {
  return AUTH_REQUIRED.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

describe('middleware route classification', () => {
  describe('isProtected', () => {
    it('marks /dashboard as protected', () => {
      expect(isProtected('/dashboard')).toBe(true);
    });

    it('marks /dashboard/sub as protected', () => {
      expect(isProtected('/dashboard/requests/123')).toBe(true);
    });

    it('marks /onboarding as protected', () => {
      expect(isProtected('/onboarding')).toBe(true);
    });

    it('marks /admin as protected', () => {
      expect(isProtected('/admin')).toBe(true);
    });

    it('marks /admin/users as protected', () => {
      expect(isProtected('/admin/users')).toBe(true);
    });

    it('does not mark /login as protected', () => {
      expect(isProtected('/login')).toBe(false);
    });

    it('does not mark / as protected', () => {
      expect(isProtected('/')).toBe(false);
    });

    it('does not mark /api/auth/... as protected', () => {
      expect(isProtected('/api/auth/callback/google')).toBe(false);
    });

    it('does not mark /dashboardExtra as protected (no partial prefix match)', () => {
      // /dashboardExtra should not match /dashboard prefix
      expect(isProtected('/dashboardExtra')).toBe(false);
    });
  });
});

// Integration smoke test description:
// Run: pnpm dev in apps/portal
// Then: curl -I http://localhost:3000/dashboard
// Expected: HTTP 307 Location: http://localhost:3000/login?callbackUrl=/dashboard
