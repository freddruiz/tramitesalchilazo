import { handlers } from '@/auth';

// Auth.js v5 catch-all route: handles /api/auth/callback/google,
// /api/auth/signin, /api/auth/signout, /api/auth/session, etc.
// CSRF protection is built into Auth.js and must NOT be disabled.
export const { GET, POST } = handlers;
