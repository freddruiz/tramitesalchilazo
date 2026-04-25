# Tramites al Chilazo — Sprint State Machine

> **Source of Truth.** Every agent session MUST read this file first and
> update it on completion. Do not modify code outside the Active Story's scope.

---

## Project Snapshot

- **Product:** Dual-portal (Client + Admin) platform for automated procurement of Guatemalan legal documents (Antecedentes Penales, Antecedentes Policiales, Certificados de Nacimiento RENAP, MINEX Apostillados).
- **Stack:** Next.js 15 (App Router) + TypeScript · Supabase (Postgres + Auth + Storage) · BullMQ on Upstash Redis · Playwright automation worker (Fly.io/Railway) · Vercel (portal hosting).
- **Payments:** Abstracted `IPaymentProvider` with adapters for Recurrente, NeoNet, Visanet, Stripe + manual bank transfer verification.
- **Auth:** Google OAuth → mandatory profile completion (DPI + secondary password + legal consent) → step-up for sensitive actions. Admin: WebAuthn primary + TOTP fallback, IP allowlist.
- **Encryption:** AES-256-GCM envelope (per-user DEK, KMS master key) for PII & external credentials. Argon2id for all portal passwords. HMAC-SHA256 for deterministic lookups on encrypted columns.
- **Retention:** Completed documents available 20 days; email dispatch on completion; automated hard-delete cron.
- **Public Repo Strategy:** Repository is public. PII handling code, gov-portal automation scripts, and any secrets are NEVER committed. Sensitive automation lives local-only or in a separate private repo linked via submodule.

---

## Active Sprint
**Sprint:** S3 — Service Catalog & Request Lifecycle
**Sprint Goal:** Service catalog + pricing, request state machine, client dashboard, request creation flow.

> Sprint 2 (Identity & Consent) closed 2026-04-24.

## Active User Story
**ID:** S3-01
**Title:** Service catalog + pricing (server-authoritative)
**Assigned Model:** Haiku 4.5
**Status:** NOT_STARTED
**Branch:** `feature/S3-01-service-catalog` (to be cut from `dev`)
**Blockers:** none

### Contextual Continuity
1. Read this file. Confirm Active Story = S3-01.
2. Branch from `dev`: `git checkout -b feature/S3-01-service-catalog`
3. Work within `apps/portal/` (service catalog API, pricing, DB migration).
4. On completion: PR to `dev` with AC + Security Constraint checklists ticked. Update this file.

---

## Roadmap

### Epic E0 — Git Workflow & Deployment Protocol (cross-cutting, enforced from S1)
- [ ] S0-01  Branch protection rules on `main`, `prod`, `dev`              [manual + gh CLI]
- [ ] S0-02  PR template, CODEOWNERS, issue templates                      [Haiku 4.5]
- [ ] S0-03  Release workflow: `dev` -> `prod` promotion + tag             [Sonnet 4.6]

### Epic E1 — Foundation & Security Core
- [x] S1-01  Initialize Secure Repository & CI/CD                          [Haiku 4.5]
- [x] S1-02  Crypto utilities (AES-GCM envelope, Argon2id, HMAC)           [Sonnet 4.6]
- [ ] S1-03  Append-only audit log with hash chain (deferred — see tech debt)[Sonnet 4.6]
- [x] S1-04  Zod schema conventions + error taxonomy                       [Haiku 4.5]
- [x] S1-05  Supabase project bootstrap + migrations baseline              [Sonnet 4.6]

### Epic E2 — Identity & Consent
- [x] S2-01  Auth.js + Google OAuth + Supabase session bridge              [Sonnet 4.6]
- [x] S2-02  Session middleware + RBAC + RLS policies                      [Sonnet 4.6]
- [x] S2-03  DPI profile completion + consent capture                      [Sonnet 4.6]
- [x] S2-04  Step-up auth with secondary password                          [Sonnet 4.6]
- [x] S2-05  Admin WebAuthn (passkeys) + TOTP fallback + IP allowlist      [Sonnet 4.6]

### Epic E3 — Service Catalog & Request Lifecycle
- [ ] S3-01  Service catalog + pricing (server-authoritative)              [Haiku 4.5]  ← ACTIVE
- [ ] S3-02  Request state machine + status transitions                    [Sonnet 4.6]
- [ ] S3-03  Client dashboard UI (list + detail)                           [Haiku 4.5]
- [ ] S3-04  Request creation flow (step-up gated)                         [Sonnet 4.6]

### Epic E4 — Payment Orchestration
- [ ] S4-01  `IPaymentProvider` abstraction + normalized event shape       [Sonnet 4.6]
- [ ] S4-02  Recurrente adapter                                            [Sonnet 4.6]
- [ ] S4-03  NeoNet adapter                                                [Sonnet 4.6]
- [ ] S4-04  Visanet adapter                                               [Sonnet 4.6]
- [ ] S4-05  Stripe adapter                                                [Sonnet 4.6]
- [ ] S4-06  Manual bank transfer upload + proof storage                   [Sonnet 4.6]
- [ ] S4-07  Admin transfer-verification workflow                          [Sonnet 4.6]
- [ ] S4-08  Webhook HMAC verification + idempotency keys                  [Sonnet 4.6]

### Epic E5 — Automation Engine (MVP: Antecedentes Penales + Policiales)
- [ ] S5-01  Worker scaffold (Fly.io/Railway) + KMS credential decryption  [Sonnet 4.6]
- [ ] S5-02  `IGovPortalAdapter` contract + shared state machine helpers   [Sonnet 4.6]
- [ ] S5-03  **Antecedentes Penales** adapter                              [Sonnet 4.6]
- [ ] S5-04  **Antecedentes Policiales** adapter                           [Sonnet 4.6]
- [ ] S5-05  Credential rotation + password-reset flow                     [Sonnet 4.6]
- [ ] S5-06  Manual-review escalation queue                                [Haiku 4.5]

### Epic E6 — Document Pipeline
- [ ] S6-01  Supabase Storage bucket + SSE + lifecycle rules               [Sonnet 4.6]
- [ ] S6-02  20-day retention cron + hard delete + audit                   [Sonnet 4.6]
- [ ] S6-03  Email dispatch on completion (Resend)                         [Haiku 4.5]
- [ ] S6-04  Signed single-use download endpoint (IDOR-guarded)            [Sonnet 4.6]

### Epic E7 — Admin Dashboard
- [ ] S7-01  Admin layout + RBAC guards                                    [Haiku 4.5]
- [ ] S7-02  Real-time request monitor (Supabase Realtime)                 [Sonnet 4.6]
- [ ] S7-03  Transfer verification UI                                      [Haiku 4.5]
- [ ] S7-04  New-submission email triggers                                 [Haiku 4.5]
- [ ] S7-05  Audit log viewer                                              [Haiku 4.5]

### Epic E8 — v1 Hardening & Launch (Antecedentes only)
- [ ] S8-01  OWASP ZAP + semgrep full scan remediation                     [Sonnet 4.6]
- [ ] S8-02  Load test + rate-limit tuning                                 [Sonnet 4.6]
- [ ] S8-03  Observability: Sentry, OTel, Grafana dashboards               [Haiku 4.5]
- [ ] S8-04  Runbooks: incident response, key rotation, retention          [Haiku 4.5]
- [ ] S8-05  External pen-test + remediation                               [Sonnet 4.6]
- [ ] S8-06  Promote `dev` -> `prod`, tag `v1.0.0`                         [manual]

### Epic E9 — v2: RENAP + MINEX Apostillado
- [ ] S9-01  RENAP adapter (Certificado de Nacimiento)                     [Sonnet 4.6]
- [ ] S9-02  MINEX Apostillado adapter                                     [Sonnet 4.6]
- [ ] S9-03  Multi-step request chaining (e.g., RENAP -> MINEX)            [Sonnet 4.6]
- [ ] S9-04  Feature flag rollout + v2 hardening                           [Sonnet 4.6]
- [ ] S9-05  Promote `dev` -> `prod`, tag `v2.0.0`                         [manual]

---

## Completed

### S2-05 — Admin WebAuthn (passkeys) + TOTP fallback + IP allowlist
**Status:** COMPLETED (2026-04-24)
**Branch:** `feature/S2-05-admin-2fa`
**Summary:**
- `supabase/migrations/009_admin_mfa.sql`: creates `admin_webauthn_credentials` (credential_id UNIQUE, public_key TEXT, counter BIGINT, device_type, backed_up, transports, friendly_name); `admin_totp_secrets` (secret_envelope JSONB AES-256-GCM, backup_codes JSONB [{hash,used}], verified BOOLEAN); `admin_webauthn_challenges` (5-min TTL challenge store for stateless serverless); all tables RLS-enabled, REVOKE ALL from authenticated — service_role only
- `apps/portal/lib/admin/webauthn.ts`: `buildRegistrationOptions` / `completeRegistration` / `buildAuthenticationOptions` / `completeAuthentication` using `@simplewebauthn/server@13.3.0`; challenge stored in DB (consumed & deleted on verify); counter updated post-auth (replay prevention); `isoBase64URL` for Uint8Array↔base64url public key serialization
- `apps/portal/lib/admin/totp.ts`: `setupTotp` generates `otplib` authenticator secret, encrypts with AES-256-GCM (`ADMIN_TOTP_ENCRYPTION_KEY`), stores envelope + Argon2id-hashed backup codes; `verifyTotpCode` / `verifyBackupCode` (backup codes single-use); `hasTotpConfigured`
- `apps/portal/lib/admin/ipAllowlist.ts`: Edge Runtime-compatible pure-JS IPv4 CIDR check; normalizes IPv4-mapped IPv6 (`::ffff:x.x.x.x`); if `ADMIN_IP_ALLOWLIST` is unset → warn + allow (local dev); blocks with 403 otherwise
- `apps/portal/middleware.ts`: admin path guard now covers both `/admin/*` pages AND `/api/admin/*` routes; IP allowlist checked before any route handler; page routes redirect to `/admin/security/passkeys/enroll` if `!adminPasskeyEnrolled`, redirect to `/admin/mfa` if MFA not verified within 4 hours; API routes handle own auth state; MFA-exempt paths: `/admin/mfa`, `/admin/security/passkeys/enroll`, `/api/admin/webauthn/*`, `/api/admin/totp/*`
- `apps/portal/auth.ts`: JWT callback handles `trigger==='update'` for `adminMfaVerifiedAt` and `adminPasskeyEnrolled`; on first admin login queries `admin_webauthn_credentials` to set `adminPasskeyEnrolled` flag; `signIn` callback writes `AuditAction.AdminLogin` for admin users
- `apps/portal/types/next-auth.d.ts` + `lib/auth/session.ts`: added `adminPasskeyEnrolled?: boolean` and `adminMfaVerifiedAt?: number` to Session, JWT, AppSession
- API routes (all require role=admin): `GET /api/admin/webauthn/register-options`, `POST /api/admin/webauthn/register` (audit: AdminPasskeyEnrolled), `GET /api/admin/webauthn/auth-options`, `POST /api/admin/webauthn/auth` (audit: AdminMfaVerified / AdminMfaFailed), `GET /api/admin/webauthn/list`, `POST /api/admin/webauthn/delete`, `GET /api/admin/totp/setup`, `POST /api/admin/totp/verify` (audit: AdminTotpVerified / AdminMfaFailed)
- Admin pages: `app/(admin)/admin/mfa/page.tsx` (passkey tab primary, TOTP fallback tab with backup code toggle); `app/(admin)/admin/security/passkeys/enroll/page.tsx` (forced first-time enrollment, calls `update({ adminPasskeyEnrolled: true })` post-enroll); `app/(admin)/admin/security/passkeys/page.tsx` (list/add/delete passkeys + TOTP setup with QR code + one-time backup codes display)
- `packages/shared/src/audit/types.ts`: added `AdminLoginFailed`, `AdminMfaVerified`, `AdminMfaFailed`, `AdminPasskeyEnrolled`, `AdminTotpVerified`
- `apps/portal/lib/errors/index.ts`: added `ADMIN_MFA_REQUIRED`, `ADMIN_PASSKEY_REQUIRED`, `ADMIN_IP_BLOCKED`, `WEBAUTHN_VERIFICATION_FAILED`, `TOTP_VERIFICATION_FAILED`, `TOTP_NOT_CONFIGURED`
- `apps/portal/package.json`: added `@simplewebauthn/browser@13.3.0`, `@simplewebauthn/server@13.3.0`, `otplib@12.0.1`, `qrcode@1.5.4`, `@supabase/supabase-js@2.45.4`, `next-auth@5.0.0-beta.25`, `zod@3.23.8`, `@tramitesalchilazo/shared@workspace:*` (prior stories' packages were never committed to package.json — fixed here)
- `.env.example`: added `ADMIN_IP_ALLOWLIST`, `ADMIN_TOTP_ENCRYPTION_KEY`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`
- 14 new unit tests (71 total passing): 10 IP allowlist cases (exact match, /8, /24, /32, IPv4-mapped IPv6, multi-CIDR) + 4 MFA session TTL cases (1min, 3h59m, 4h1m, absent)

**AC Checklist:**
- [x] Admin login flow: Google OAuth → role check (admin only) → redirect to /admin/mfa if MFA not verified
- [x] Supabase MFA API: TOTP implemented via `otplib` (Supabase MFA API requires Supabase Auth users; project uses Auth.js — see ADL note below)
- [x] WebAuthn/passkey enrollment page at `/admin/security/passkeys` using SimpleWebAuthn
- [x] `/admin/mfa` page: passkey authentication first; TOTP input as fallback tab
- [x] Admin session requires MFA verification — middleware blocks all /admin/* without mfa_verified flag
- [x] IP allowlist: `ADMIN_IP_ALLOWLIST` env var (comma-separated CIDRs); 403 for IPs outside allowlist; empty → warn + allow (local dev)
- [x] Mandatory passkey enrollment: forced to `/admin/security/passkeys/enroll` before any admin page
- [x] Audit log on every admin login (AdminLogin), MFA verification (AdminMfaVerified/AdminTotpVerified), passkey registration (AdminPasskeyEnrolled), MFA failure (AdminMfaFailed)
- [x] `.env.example` updated: `ADMIN_IP_ALLOWLIST` placeholder

**Security Constraints:**
- [x] No SMS 2FA
- [x] TOTP is fallback only — passkey is the first tab presented
- [x] IP allowlist check server-side in middleware before any route handler runs
- [x] All admin auth events audit-logged with actor_id, IP hash, user_agent
- [x] Admin session TTL: `adminMfaVerifiedAt` enforced at 4 hours in middleware (independent of 7-day client session)

**ADL note:** AC required `supabase.auth.mfa.enroll / challenge / verify` but Supabase MFA API is tied to Supabase Auth users. This project uses Auth.js (not Supabase Auth) per ADL from S2-01; Supabase Auth users do not exist. TOTP implemented with `otplib` + AES-256-GCM encrypted secret. If project migrates to Supabase Auth, revisit.

**Tech Debt:**
- [ ] `adminPasskeyEnrolled` JWT flag not updated when admin deletes ALL passkeys (requires logout/re-login to clear). Low risk — typical admin won't delete all passkeys.
- [ ] IP logging absent from `signIn` audit entry — NextAuth v5 beta `signIn` callback does not expose request object. IP is captured in subsequent MFA verification routes.

---

### S2-04 — Step-up auth with secondary password
**Status:** COMPLETED (2026-04-24)
**Branch:** `feature/S2-04-step-up-auth`
**Summary:**
- `supabase/migrations/008_step_up_tracking.sql`: creates `audit_log` table (INSERT-only RLS, revokes UPDATE/DELETE/TRUNCATE); adds `failed_step_up_attempts` (INT, default 0) and `step_up_locked_until` (TIMESTAMPTZ) to `user_profiles` — lockout state survives session refresh by living in DB, not JWT
- `apps/portal/app/api/auth/step-up/route.ts`: POST handler; Zod validation (`{ secondaryPassword: string }`); per-user HTTP rate limit (10 req/user/15 min, in-memory); loads `secondary_password_hash` + lockout state from `user_profiles`; checks `step_up_locked_until > now` → 423; `verifyPassword` (Argon2id constant-time); on success: resets counters, returns `{ ok: true, stepUpVerifiedAt }` 200; on failure: increments `failed_step_up_attempts`, locks for 15 min on attempt ≥ 5; writes `AuditAction.AuthStepUp` or `AuditAction.AuthFailedAttempt` via `writeAuditEntry` on every path
- `apps/portal/app/step-up/page.tsx`: modal-style client page; posts to `/api/auth/step-up`; on 200 calls NextAuth `update({ stepUpVerifiedAt })` to refresh JWT; shows remaining attempts and lockout messages; redirects to `callbackUrl` on success
- `apps/portal/auth.ts`: `jwt` callback handles `trigger: 'update'` to persist `stepUpVerifiedAt` into the signed JWT cookie
- `apps/portal/lib/auth/stepUp.ts`: unchanged — already reads `stepUpVerifiedAt` from session JWT and enforces the 15-minute window (implemented in S2-02)
- `apps/portal/lib/errors/index.ts`: added `AUTH_STEP_UP_LOCKED` to `ErrorCode` union
- `apps/portal/middleware.ts`: added `/step-up` to `AUTH_REQUIRED`; exempts `/step-up` from the profile-incomplete redirect (profile is already complete when step-up runs)
- `packages/shared/src/audit/`: cherry-picked audit module from S1-03 commit — `logger.ts`, `types.ts`, `index.ts`, `__tests__/`; `packages/shared/src/index.ts` re-exports from `./audit/index.js`
- 5 new unit tests (57 total passing): correct password → 200 + `stepUpVerifiedAt`; wrong password → 401 + counter incremented; 5th wrong attempt → lockout timestamp written; 14 min ago → `requireStepUp()` passes; 16 min ago → `requireStepUp()` blocks

**AC Checklist:**
- [x] `POST /api/auth/step-up`: Zod validation; loads `secondary_password_hash`; `verifyPassword` (Argon2id); on success sets `stepUpVerifiedAt` in session JWT; on failure 401 + attempt counter; 5 failures → 15-min lockout + audit log
- [x] `/step-up` page: modal-style form; shown when `requireStepUp()` returns 403; calls `update()` to refresh JWT on success
- [x] `apps/portal/lib/auth/stepUp.ts` reads `step_up_verified_at` from session JWT (15-min window)
- [x] Audit log on every attempt (success and failure): `auth.step_up` / `auth.failed_attempt`
- [x] Unit tests: 5/5 AC cases passing

**Security Constraints:**
- [x] `verifyPassword` uses Argon2 library (constant-time) — no `===` comparison
- [x] Failed attempts counter in DB (`user_profiles.failed_step_up_attempts`) — never in client cookie/header
- [x] Lockout state in DB (`step_up_locked_until`) — survives session refresh
- [x] HTTP rate limit: 10 req/user/15 min (in-memory, server-side)
- [x] Audit on every attempt: `AuditAction.AuthStepUp` (success) and `AuditAction.AuthFailedAttempt` (failure/locked)

---

### S2-03 — DPI profile completion + consent capture
**Status:** COMPLETED (2026-04-23)
**Branch:** `feature/S2-03-dpi-profile`
**Summary:**
- `supabase/migrations/007_user_profiles_dpi.sql`: adds `full_name`, `dpi_encrypted` (JSONB, AES-256-GCM envelope), `dek_wrapped` (TEXT, per-user DEK wrapped under KMS master key), `dpi_hmac` (TEXT, unique — HMAC-SHA256 for duplicate detection), `secondary_password_hash` (TEXT) to `user_profiles`; adds `consent_version` + `consent_accepted_at` to `users`; RLS policies for select/insert/update own profile; `touch_updated_at` trigger
- `apps/portal/lib/schemas/profile.ts`: `guatemalaDpiSchema` (13-digit + RENAP CUI checksum), `passwordSchema` (min 8, upper/lower/digit), `profileCompleteSchema` (.strict() — rejects extra fields)
- `apps/portal/app/api/profile/complete/route.ts`: POST handler; rate-limited (5/IP/hour, in-memory); Zod validation; Argon2id hash of secondary_password; per-user DEK generated + wrapped via kms.ts; DPI encrypted via envelope.ts; HMAC computed via deterministicHmac (HMAC_SECRET env); inserts `user_profiles` row; updates `users.consent_version` + `consent_accepted_at`; returns `{ ok: true }` on success; 409 on unique constraint (dpi_hmac collision); 422 on Zod failure; DPI plaintext never logged/returned
- `apps/portal/app/onboarding/page.tsx`: full client-side form (full_name, DPI, secondary_password, confirm_password, consent checkbox); field-level Zod error display; redirect to /dashboard on success; rate-limit, duplicate-DPI, and generic error messages
- `apps/portal/lib/errors/index.ts`: added `PROFILE_VALIDATION`, `PROFILE_DUPLICATE_DPI`, `PROFILE_ALREADY_COMPLETE`, `RATE_LIMIT_EXCEEDED` to `ErrorCode` union
- `apps/portal/package.json`: added `zod@3.23.8` and `@tramitesalchilazo/shared@workspace:*`
- `packages/shared/tsconfig.json`: added `"noEmit": false` (root tsconfig has `noEmit: true`; without this, `tsc` built no output even with `outDir` set)
- `.env.example`: `SUPABASE_VAULT_SECRET` (base64url 32-byte KMS master key), `HMAC_SECRET` (min 32 bytes, separate from NEXTAUTH_SECRET), `CONSENT_VERSION` (e.g. "v1.0")
- 12 new unit tests: 5 AC-required cases + 7 schema unit tests; all 45 tests in the suite passing

**AC Checklist:**
- [x] `/onboarding` page: full_name, DPI (13-digit), secondary_password, confirm_password, legal consent checkbox
- [x] `POST /api/profile/complete`: Zod `.strict()` validation (gujaratDpiSchema + passwordSchema); Argon2id hash; per-user DEK + wrap; AES-256-GCM encrypt DPI; HMAC dpi_hmac; insert `user_profiles`; update consent on `users`; redirect to /dashboard
- [x] Middleware: `/(client)/*` routes redirect to /onboarding if `!profileComplete` (handled via `CLIENT_PREFIXES` guard in middleware.ts, in place since S2-02)
- [x] `.env.example`: `HMAC_SECRET`, `CONSENT_VERSION`, `SUPABASE_VAULT_SECRET`
- [x] Unit tests: valid DPI → 200; invalid checksum → 422; duplicate DPI → 409; ciphertext randomness; extra fields → 422

**Security Constraints:**
- [x] DPI plaintext never in logs, error messages, DB columns, URL params, or client state — used only within route handler scope
- [x] Secondary password: Argon2id (memoryCost=65536, timeCost=3, parallelism=4) via `packages/shared/src/crypto/hash.ts`
- [x] `dpi_hmac` uses dedicated `HMAC_SECRET` env var — not NEXTAUTH_SECRET
- [x] Consent version stored as string (`CONSENT_VERSION`) — version bump forces re-consent
- [x] Rate limit: 5 requests per IP per hour on `POST /api/profile/complete`

---

### S2-02 — Session middleware + RBAC + RLS policies
**Status:** COMPLETED (2026-04-23)
**Branch:** `feature/S2-02-rbac-middleware`
**Summary:**
- `apps/portal/lib/errors/index.ts`: `AppError` class + `ErrorCode` union (`AUTH_UNAUTHENTICATED`, `AUTH_INSUFFICIENT_PERMISSIONS`, `AUTH_STEP_UP_REQUIRED`)
- `apps/portal/lib/auth/session.ts`: `getSession()` — calls `auth()` server-side; returns typed `AppSession` (`userId`, `role`, `profileComplete`, `stepUpVerifiedAt`); returns `null` if unauthenticated
- `apps/portal/lib/auth/rbac.ts`: `requireRole(role: UserRole)` factory; throws `AppError(AUTH_INSUFFICIENT_PERMISSIONS, 403)` for wrong role OR no session; role read from signed JWT only
- `apps/portal/lib/auth/stepUp.ts`: `requireStepUp()` factory; 15-minute window, fixed — no configurable override; throws `AUTH_STEP_UP_REQUIRED` if absent or expired; `stepUpVerifiedAt` field wired through JWT/session callbacks (populated in S2-04)
- `apps/portal/lib/supabase/server.ts`: `createServerClient(userId)` — generates a 1-min HS256 JWT (sub=userId, role=authenticated) via Web Crypto API (no extra package); passes as Authorization Bearer so `auth.uid()` works in RLS; also calls `set_app_current_user` to populate `current_setting('app.current_user_id', true)`
- `apps/portal/middleware.ts`: admin routes (`/(admin)/*`) now return identical `403 { error: 'Forbidden' }` for both unauthenticated AND wrong-role requests (no information oracle); checked before the general `/login` redirect
- `apps/portal/types/next-auth.d.ts`: added `stepUpVerifiedAt?: number` to `Session.user` and `JWT`
- `apps/portal/auth.ts`: `session` callback forwards `stepUpVerifiedAt` from token
- `supabase/migrations/006_rls_jwt_bridge.sql`: `set_app_current_user(uuid)` SECURITY DEFINER function; grants to `authenticated` only
- `.env.example`: `SUPABASE_JWT_SECRET` added
- 19 unit tests: all passing (9 smoke + 5 requireRole + 5 requireStepUp)

**AC Checklist:**
- [x] `apps/portal/lib/auth/session.ts` — `getSession()` returns typed session with `userId` + `role`
- [x] `apps/portal/lib/auth/rbac.ts` — `requireRole(role)` factory throws 403 `AUTH_INSUFFICIENT_PERMISSIONS` if role mismatch
- [x] `apps/portal/lib/auth/stepUp.ts` — `requireStepUp()` checks `stepUpVerifiedAt` within 15 min; throws 403 `AUTH_STEP_UP_REQUIRED` if absent or expired
- [x] `apps/portal/middleware.ts` — `/(admin)/*` returns 403 for wrong role; identical response for unauthenticated (no info oracle)
- [x] `apps/portal/lib/supabase/server.ts` — `createServerClient(userId)` sets `app.current_user_id` via JWT bridge + RPC
- [x] Unit tests: `requireRole('admin')` with client → 403; `requireRole('client')` with client → pass; `requireStepUp()` expired → 403; `requireStepUp()` fresh → pass

**Security Constraints:**
- [x] Role check server-side from JWT — never from client-supplied header or body field
- [x] Step-up window exactly 15 minutes — no configurable override; constant in `stepUp.ts`
- [x] Admin routes return identical 403 for wrong role vs. unauthenticated — admin guard checked before the login redirect branch

---

### S2-01 — Auth.js v5 + Google OAuth + Supabase session bridge
**Status:** COMPLETED (2026-04-23)
**Branch:** `feature/S2-01-google-oauth`
**Summary:**
- `apps/portal/auth.ts`: NextAuth v5 config; Google provider; JWT strategy (15-min access token, 7-day session window); httpOnly+Secure+SameSite=Lax cookies explicitly configured; `signIn` callback upserts `public.users` via Supabase service_role; `jwt` callback stores `userId`, `role`, `profileComplete`; `google_sub` never exposed in session or API responses
- `apps/portal/app/api/auth/[...nextauth]/route.ts`: catch-all handler for `/api/auth/*`; Auth.js CSRF protection enabled (not disabled)
- `apps/portal/middleware.ts`: protects `(client)/*` routes (`/dashboard`, `/requests`, `/documents`, `/profile`) and `(admin)/*`; unauthenticated → `/login?callbackUrl=...`; profile incomplete → `/onboarding`; role=admin guard on `/admin/*`
- `apps/portal/app/login/page.tsx`: Google sign-in page using Server Action
- `apps/portal/app/onboarding/page.tsx`: stub; server-side session check + redirect logic
- `apps/portal/app/(client)/dashboard/page.tsx`: protected stub; sign-out Server Action
- `apps/portal/types/next-auth.d.ts`: Session + JWT module augmentation
- `supabase/migrations/005_auth_google_users.sql`: drops `auth.users` FK from `users` table, adds `google_sub TEXT UNIQUE`, drops auth sync trigger (Auth.js manages user lifecycle)
- `.env.example`: NEXTAUTH_SECRET generation command documented (`openssl rand -base64 32`)
- 9 middleware smoke tests: all passing

**AC Checklist:**
- [x] Auth.js v5 (NextAuth) installed in apps/portal (`5.0.0-beta.25`)
- [x] Google OAuth provider configured; callback URL `/api/auth/callback/google`
- [x] On first Google sign-in: user row upserted in `users` table (`google_sub`, `email`, `role=client`)
- [x] Session strategy: JWT with 15-min access token (`jwt.maxAge`), 7-day refresh (`session.maxAge`)
- [x] Session cookie: `httpOnly=true`, `secure=true` (prod), `sameSite=lax`, `path=/`
- [x] After OAuth callback: redirects to `/onboarding` if `profileComplete=false`; else `/dashboard` (via middleware)
- [x] `middleware.ts`: all `/(client)/*` and `/(admin)/*` routes protected; redirect to `/login` if no session
- [x] `/api/auth/*` route handler wired (`handlers` export)
- [x] `.env.example` updated: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` (with generation command), `NEXTAUTH_URL`
- [x] No credentials committed; all env vars from `process.env` only
- [x] Smoke test: `isProtected('/dashboard')` = true, `isProtected('/login')` = false — 9/9 passing

**Security Constraints:**
- [x] `NEXTAUTH_SECRET` min 32 bytes — generation command `openssl rand -base64 32` in `.env.example`
- [x] Session cookies: `httpOnly` + `Secure` (prod) + `SameSite=Lax` — explicitly configured in `auth.ts`
- [x] `google_sub` stored in DB only; never in JWT payload exposed to client; `session.user` has no `google_sub` field
- [x] CSRF: Auth.js built-in CSRF token active — not disabled anywhere

**ADL note:** Auth.js manages user lifecycle instead of Supabase Auth. Migration 005 removes the `auth.users` FK. RLS policies will be re-aligned in S2-02 using a Supabase JWT bridge.

---

### S1-02 — Crypto utilities (AES-GCM envelope, Argon2id, HMAC)
**Status:** COMPLETED (2026-04-22)
**Branch:** `feature/S1-02-crypto-utils-clean`
**Summary:**
- `packages/shared/src/crypto/envelope.ts`: AES-256-GCM encrypt/decrypt; IV = `randomBytes(12)` per call; all outputs base64url
- `packages/shared/src/crypto/kms.ts`: `generateDek` (`randomBytes(32)`), `wrapDek`/`unwrapDek` via `SUPABASE_VAULT_SECRET` env var only
- `packages/shared/src/crypto/hash.ts`: `hashPassword`/`verifyPassword` Argon2id with memoryCost=65536, timeCost=3, parallelism=4; double-hash guard
- `packages/shared/src/crypto/hmac.ts`: `deterministicHmac` HMAC-SHA256 hex for DPI lookup columns
- `packages/shared/src/crypto/index.ts`: barrel export
- `.github/semgrep.yml`: custom rules blocking MD5, SHA1, bcrypt, PBKDF2, AES-ECB, static/zeroed IVs
- 14 unit tests: all passing (round-trip, IV randomness, salt randomness, verify correct/wrong, determinism, double-hash guard, auth-tag tamper detection)

**AC Checklist:**
- [x] `envelope.ts` — encrypt/decrypt AES-256-GCM, IV randomBytes(12), base64url output
- [x] `kms.ts` — generateDek, wrapDek, unwrapDek via env var only
- [x] `hash.ts` — argon2id mandatory params, double-hashing guard
- [x] `hmac.ts` — HMAC-SHA256 hex deterministic
- [x] `crypto/index.ts` — barrel export
- [x] `.github/semgrep.yml` — rules blocking forbidden algorithms
- [x] All 14 unit tests passing

**Security Constraints:**
- [x] Argon2id params: memoryCost=65536, timeCost=3, parallelism=4
- [x] IV: randomBytes(12) per call — never static
- [x] DEK: randomBytes(32) — never derived from password
- [x] No plaintext keys in source — all from process.env
- [x] Forbidden algorithms blocked by semgrep rule

---

### S1-01 — Initialize Secure Repository & CI/CD
**Status:** COMPLETED (2026-04-22)
**Branch:** `feature/S1-01-repo-scaffold`
**Summary:** 
- pnpm workspace scaffold with root + apps/* + packages/* structure
- Node 20.11.0 and pnpm 9.1.0 pinned in .nvmrc and engines
- CI/CD: GitHub Actions workflow with lint, typecheck, test, semgrep, gitleaks, npm audit
- Husky hooks: pre-commit (lint-staged), pre-push (blocks main/prod), commit-msg (commitlint)
- ESLint v9 flat config, Prettier, commitlint for Conventional Commits
- .env.example with all required variables
- All deps exact-pinned; pnpm-lock.yaml committed
- Next.js 15.5.15 portal on localhost:3000, Node.js worker stub
- packages/shared and packages/ui stubs with barrel exports
- npm audit --audit-level=high: zero critical/high (4 moderate remaining)

---

## Architectural Decision Log (ADL)

### ADL-001 — Modular Monolith over Microservices
**Context:** Small team, tight launch window, clear domain boundaries.
**Decision:** Modular monolith in Next.js + one isolated Playwright worker process.
**Consequences:** Faster iteration; requires discipline on module boundaries. Revisit at >10k MAU.

### ADL-002 — Playwright over Puppeteer/Selenium
**Context:** Need resilient gov-site automation with modern anti-bot handling.
**Decision:** Playwright, Chromium-only, with stealth techniques.
**Consequences:** Modern API, better debugging. Tied to Microsoft maintenance cadence.

### ADL-003 — AES-256-GCM Envelope Encryption for Gov Credentials
**Context:** Storing user passwords for third-party gov portals is high-risk but required.
**Decision:** Per-user DEK wrapped by KMS master key; decrypt only inside worker job scope; zero in `finally`.
**Consequences:** Higher complexity; acceptable for the threat model. Requires KMS availability (Supabase Vault or AWS KMS).

### ADL-004 — Payment Provider Abstraction
**Context:** User wants Recurrente, NeoNet, Visanet, and Stripe.
**Decision:** `IPaymentProvider` interface with one adapter per gateway. Provider selected per-request by method/currency/user preference. All webhooks normalized to a single internal event shape. Amounts always server-computed.
**Consequences:** More surface area; one normalization layer to maintain. Easier to A/B test providers and add new ones.

### ADL-005 — Worker Hosting Split (not on Vercel)
**Context:** Vercel functions are ephemeral and can't reliably ship a Chromium binary.
**Decision:** Playwright worker runs on Fly.io (primary) in a dedicated Docker container with locked-down egress.
**Consequences:** Two deploy targets. Acceptable for security isolation benefits.

### ADL-006 — Admin 2FA: WebAuthn Primary + TOTP Fallback
**Context:** Admin dashboard can approve payments and view PII; TOTP alone is phishable.
**Decision:** WebAuthn (passkeys) primary, TOTP fallback, no SMS. Mandatory passkey enrollment before first admin action.
**Consequences:** Admin onboarding needs a supported browser + platform authenticator. Worth it.

### ADL-007 — MVP Scope
**Context:** User wants to ship fastest path to revenue.
**Decision:** v1 = Antecedentes Penales + Policiales. v2 = RENAP + MINEX behind feature flag.
**Consequences:** Automation engine contract (`IGovPortalAdapter`) designed to support all four from day one; only v1 adapters implemented initially.

### ADL-009 — Public Repo + Local-Only Sensitive Code
**Context:** Repo made public so branch protection rulesets work on GitHub Free.
**Decision:** Repo is public. PII processing code, gov-portal automation adapters (Playwright), and any credential-handling utilities are NEVER committed to this repo. They live locally or in a separate private repo. The public repo contains: portal UI, API contracts, queue infrastructure, payment abstractions, CI/CD, and non-sensitive utilities.
**Consequences:** Contributors (future) can see the architecture but not the automation scripts that interact with gov portals. Separation of concerns enforces the security boundary at the repo level. Before onboarding contributors, establish clear guidelines on what can/cannot be committed.

### ADL-008 — Branch Model: main / dev / prod
**Context:** User requested per-story pushes to `dev`, promotion to `prod` at launch.
**Decision:**
- `main` = protected, nothing merges directly (holds repo bootstrap files only).
- `dev` = integration branch; every story PR merges here via squash-merge.
- `prod` = production branch; only fast-forward from `dev` via release PR; merge triggers production deploy.
- Feature branches: `feature/<STORY-ID>-<slug>` cut from `dev`.
**Consequences:** Clear promotion path. Requires branch protection configured (S0-01).

---

## Technical Debt & Open Questions
_(agents append here — never silently)_

- [ ] **Branch protection bypass for solo dev:** `required_approving_review_count=0` since sole developer cannot approve own PRs. CI gates are the real guard. Before onboarding any collaborator, raise to `1` required reviewer.
- [ ] **Sensitive code not in repo:** PII handling (DPI encryption), gov-portal automation adapters, and Playwright scripts are local-only per ADL-009. Decide before v2 whether to use a private submodule or keep fully separate.

---

## Directory Structure (authoritative)

```
tramitesalchilazo/
├── apps/
│   ├── portal/                 # Next.js 15 client + admin portal
│   │   ├── app/
│   │   │   ├── (client)/
│   │   │   ├── (admin)/
│   │   │   └── api/
│   │   ├── middleware.ts
│   │   └── lib/
│   └── worker/                 # Playwright automation worker (Fly.io)
│       ├── adapters/
│       │   ├── antecedentes-penales/
│       │   ├── antecedentes-policiales/
│       │   ├── renap/          # v2
│       │   └── minex/          # v2
│       ├── queue/
│       └── sandbox/
├── packages/
│   ├── shared/
│   │   ├── crypto/             # AES-GCM envelope, Argon2id, HMAC
│   │   ├── contracts/          # Zod schemas, shared TS types
│   │   ├── audit/              # Append-only log helpers
│   │   ├── payments/           # IPaymentProvider + adapters
│   │   └── errors/             # Error taxonomy
│   └── ui/                     # shadcn-based shared components
├── infra/
│   ├── docker/                 # Worker image
│   ├── fly/                    # Fly.io config
│   └── runbooks/               # Incident response, key rotation
├── supabase/
│   ├── migrations/             # SQL migrations
│   └── config.toml
├── .github/
│   ├── workflows/              # CI + release
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── sprint.md                   # <- THIS FILE (source of truth)
├── SECURITY.md
└── README.md
```

---

## Per-Story Git Protocol (applies to EVERY story)

1. Ensure `dev` is up to date: `git fetch origin && git checkout dev && git pull --ff-only`
2. Cut feature branch: `git checkout -b feature/<STORY-ID>-<slug>`
3. Commit in small logical units using Conventional Commits (`feat(auth): ...`, `fix(crypto): ...`, `chore(ci): ...`)
4. Open PR to `dev` with:
   - Story ID and link to this file's story section
   - AC checklist with evidence (test output, screenshots)
   - Security Constraint checklist signed off
5. CI gates must pass: lint, typecheck, unit, integration, semgrep, gitleaks, audit.
6. Squash-merge to `dev` after review.
7. In the SAME PR: update `sprint.md` — tick story's AC, move to Completed section with timestamp, promote next story to Active, append ADL / tech-debt entries as needed.
8. Push to `dev` triggers Vercel preview + Supabase branch DB.

### Promotion to `prod` (end of sprint / at launch)
- Release PR: `dev` -> `prod`
- PR body includes changelog, migration dry-run output, rollback plan.
- Merge to `prod` triggers production deploy + Supabase migration apply.
- Tag `v<MAJOR>.<MINOR>.<PATCH>` immediately after merge.

### Branch Protection (configured in S0-01)
- `main`: fully locked (no direct commits, no force-push).
- `prod`: requires PR from `dev` only, 1 reviewer, all checks pass, linear history, signed commits.
- `dev`: requires PR, 1 reviewer, all checks pass, linear history.

---

## Agent Protocol (read every session)

1. Read this entire file.
2. Identify the Active Story. Do not work on anything else unless explicitly redirected.
3. Stay within the directory scope noted in the story.
4. Respect Security Constraints — these are non-negotiable.
5. On completion:
   - Tick AC checkboxes
   - Move story from Roadmap to Completed with timestamp
   - Promote next story to Active
   - Append ADL entries for any architectural deviation
   - Append Technical Debt entries for any known shortcut
6. Never silently skip an AC. If blocked, set `Status: BLOCKED` and describe the blocker.
