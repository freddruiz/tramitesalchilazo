import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Routes that require an authenticated session.
// These correspond to the (client) and (admin) App Router route groups.
const CLIENT_PREFIXES = ['/dashboard', '/requests', '/documents', '/profile'];
const ADMIN_PREFIXES = ['/admin'];
const AUTH_REQUIRED = [...CLIENT_PREFIXES, ...ADMIN_PREFIXES, '/onboarding'];

function isProtected(pathname: string): boolean {
  return AUTH_REQUIRED.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

// Auth.js v5 middleware: req.auth contains the session (null if unauthenticated)
export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;
  const origin = req.nextUrl.origin;

  // Unauthenticated → redirect protected routes to /login
  if (!session && isProtected(pathname)) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated on /login → redirect to appropriate destination
  if (session && pathname === '/login') {
    const dest = session.user.profileComplete ? '/dashboard' : '/onboarding';
    return NextResponse.redirect(new URL(dest, origin));
  }

  // Authenticated but profile incomplete → force /onboarding for client routes
  if (
    session &&
    !session.user.profileComplete &&
    isProtected(pathname) &&
    pathname !== '/onboarding' &&
    !isAdminRoute(pathname)
  ) {
    return NextResponse.redirect(new URL('/onboarding', origin));
  }

  // Admin-role guard: only role=admin may access /admin/*
  if (session && isAdminRoute(pathname) && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all routes except Next.js internals, static assets, and auth API
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
