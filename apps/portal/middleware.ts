import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { checkIpAllowlist, extractClientIp } from './lib/admin/ipAllowlist';

const CLIENT_PREFIXES = ['/dashboard', '/requests', '/documents', '/profile'];
const ADMIN_PREFIXES = ['/admin'];
const AUTH_REQUIRED = [...CLIENT_PREFIXES, ...ADMIN_PREFIXES, '/onboarding', '/step-up'];

// Admin pages/API paths exempt from the MFA-verified check (they ARE the auth flow)
const ADMIN_MFA_EXEMPT = [
  '/admin/mfa',
  '/admin/security/passkeys/enroll',
  '/api/admin/webauthn/',
  '/api/admin/totp/',
];

const ADMIN_MFA_SESSION_HOURS = 4;
const ADMIN_MFA_SESSION_MS = ADMIN_MFA_SESSION_HOURS * 60 * 60 * 1000;

function isProtected(pathname: string): boolean {
  return AUTH_REQUIRED.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

function isAdminPath(pathname: string): boolean {
  return (
    ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/api/admin/')
  );
}

function isMfaExempt(pathname: string): boolean {
  return ADMIN_MFA_EXEMPT.some((p) => pathname === p || pathname.startsWith(p));
}

function forbidden() {
  return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;
  const origin = req.nextUrl.origin;

  // ── Admin path guard (pages + /api/admin/*) ────────────────
  if (isAdminPath(pathname)) {
    // 1. Role check — identical 403 for unauthenticated and wrong-role (no info oracle)
    if (!session || session.user.role !== 'admin') {
      return forbidden();
    }

    // 2. IP allowlist — server-side, before any route handler
    const ip = extractClientIp(req.headers);
    const ipCheck = checkIpAllowlist(ip);
    if (!ipCheck.allowed) {
      return forbidden();
    }

    // API routes handle their own MFA checks via getSession() — skip page-level redirects
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // 3. MFA flow exemptions (passkey enrollment, MFA verification page itself)
    if (isMfaExempt(pathname)) {
      return NextResponse.next();
    }

    // 4. Mandatory passkey enrollment before first admin action
    if (!session.user.adminPasskeyEnrolled) {
      return NextResponse.redirect(new URL('/admin/security/passkeys/enroll', origin));
    }

    // 5. Admin MFA session: must have verified MFA within the last 4 hours
    const mfaTs = session.user.adminMfaVerifiedAt;
    const mfaValid = mfaTs && Date.now() - mfaTs * 1000 < ADMIN_MFA_SESSION_MS;
    if (!mfaValid) {
      return NextResponse.redirect(new URL('/admin/mfa', origin));
    }

    return NextResponse.next();
  }

  // ── Non-admin routes ───────────────────────────────────────
  if (!session && isProtected(pathname)) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === '/login') {
    const dest = session.user.profileComplete ? '/dashboard' : '/onboarding';
    return NextResponse.redirect(new URL(dest, origin));
  }

  if (
    session &&
    !session.user.profileComplete &&
    isProtected(pathname) &&
    pathname !== '/onboarding' &&
    pathname !== '/step-up'
  ) {
    return NextResponse.redirect(new URL('/onboarding', origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
