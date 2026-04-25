# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
**Do not rediscover anything listed here.** Read this file and `sprint.md`, then implement.

---

## Repository

**Tramites al Chilazo** — Automated legal service procurement platform for Guatemala.
Repo: https://github.com/freddruiz/tramitesalchilazo

---

## Git Protocol (Every Story)

```bash
git fetch origin && git checkout dev && git pull --ff-only origin dev
git checkout -b feature/SX-XX-short-description
```

On completion: push branch, open PR to `dev`, output the PR URL as the **final line** of your response.
Never branch from a local feature branch unless the story explicitly says to.

---

## Quick Start Commands

```bash
pnpm install          # from workspace root
pnpm dev              # all apps in parallel
pnpm build            # all packages
pnpm typecheck        # tsc across all packages (run from root, not apps/portal)
pnpm lint             # ESLint + Prettier check
pnpm test             # Vitest across all packages
pnpm test -- [path]   # single test file
pnpm audit            # npm audit (production deps)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Portal (Client + Admin) | Next.js 15 (App Router) + React 19 + TypeScript |
| Authentication | Auth.js v5 (NextAuth) + Google OAuth + WebAuthn passkeys + TOTP |
| Database / Storage | Supabase (PostgreSQL + RLS + Storage) |
| Cryptography | AES-256-GCM (envelope), Argon2id (passwords), HMAC-SHA256 |
| Worker / Automation | Node.js + TypeScript + Playwright → Fly.io |
| Job Queue | BullMQ on Upstash Redis |
| Payments | Recurrente, NeoNet, Visanet, Stripe, manual bank transfer |
| Email | Resend |
| Testing | Vitest (globals, node environment) |
| Package Manager | pnpm 9.1.0 / Node 20.11.0 |

---

## Monorepo Structure

```
.
├── apps/
│   ├── portal/                   # Next.js 15 portal
│   │   ├── app/
│   │   │   ├── (client)/         # Client routes (group, not in URL)
│   │   │   ├── (admin)/          # Admin routes (group, not in URL)
│   │   │   ├── api/              # API routes
│   │   │   ├── login/
│   │   │   ├── onboarding/
│   │   │   └── step-up/
│   │   ├── __tests__/
│   │   ├── lib/
│   │   │   ├── auth/             # session.ts, rbac.ts, stepUp.ts
│   │   │   ├── admin/            # webauthn.ts, totp.ts, ipAllowlist.ts
│   │   │   ├── supabase/
│   │   │   │   └── admin.ts      # ← singleton supabaseAdmin (see below)
│   │   │   ├── errors/
│   │   │   ├── schemas/
│   │   │   └── payments/
│   │   ├── auth.ts               # NextAuth config
│   │   └── middleware.ts         # Route-level auth guards
│   │
│   └── worker/                   # Node.js automation worker
│       └── src/
│           ├── adapters/         # Gov-portal adapters (ADL-009: stubs only)
│           ├── automation/       # stateMachine.ts, screenshotRedactor.ts
│           ├── crypto/           # decryptCredentials.ts
│           └── queue/            # worker.ts, jobSchema.ts
│
├── packages/
│   ├── shared/src/
│   │   ├── crypto/               # encrypt, decrypt, hash, hmac, kms
│   │   ├── audit/                # writeAuditEntry, AuditAction
│   │   ├── payments/             # IPaymentProvider, types, adapters
│   │   └── contracts/            # IGovPortalAdapter, requestChain
│   └── ui/                       # Placeholder
│
├── supabase/migrations/          # Sequential SQL (see Migration Sequence below)
├── infra/
│   ├── loadtest/                 # k6 scripts
│   └── runbooks/                 # Incident response docs
├── sprint.md                     # SOURCE OF TRUTH for active work
├── SECURITY.md
├── CLAUDE.md                     # This file
└── .env.example
```

---

## Canonical Imports — Always Use These

### Supabase Admin Client
**Never copy-paste a local `getSupabaseAdmin()` into any file.**
Always import the singleton created in S3-04:

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin';
```

The file (`apps/portal/lib/supabase/admin.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

### Auth, RBAC, Errors

```typescript
import { getSession } from '@/lib/auth/session';
import { requireRole, requireStepUp } from '@/lib/auth/rbac';
import { AppError } from '@/lib/errors';
import { extractClientIp } from '@/lib/admin/ipAllowlist';
import { handlers, auth, signIn, signOut } from '@/auth';
```

### Shared Package

```typescript
import {
  encrypt, decrypt, EncryptedEnvelope,
  generateDek, wrapDek, unwrapDek,
  hashPassword, verifyPassword,
  deterministicHmac,
  writeAuditEntry, AuditAction,
} from '@tramitesalchilazo/shared';
```

---

## Standard Route Handler Pattern

```typescript
// 1. Auth
const session = await getSession();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// 2. Role / step-up (throws AppError on failure)
await requireRole('admin')();
// or: await requireStepUp()();

// 3. Validate input
const parsed = schema.safeParse(await req.json());
if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 422 });

// 4. DB via singleton
const { data, error } = await supabaseAdmin.from('table').insert(...);

// 5. Audit log
await writeAuditEntry({
  actorId: session.userId,
  action: AuditAction.SomeAction,
  ipRaw: extractClientIp(req.headers, req.ip),
  userAgent: req.headers.get('user-agent') ?? undefined,
  metadata: { ... },
});

// 6. Return
return NextResponse.json({ ok: true });
```

---

## Middleware (Already Enforced — Do Not Duplicate)

`apps/portal/middleware.ts` handles for every request:
1. Session authentication
2. Role check (client vs admin)
3. IP allowlist for `/admin/*`
4. Admin MFA session (4-hour window)
5. Mandatory passkey enrollment before first admin action

Route handlers still call `requireRole()` / `requireStepUp()` as defense-in-depth,
but do **not** re-implement IP or MFA logic.

Protected prefixes: `CLIENT_PREFIXES = ['/dashboard', '/requests', '/documents', '/profile']`, `ADMIN_PREFIXES = ['/admin']`

---

## Migration Sequence

Next migration number: check highest file in `supabase/migrations/` and increment by 1.

| # | File | Story | Description |
|---|------|-------|-------------|
| 005 | 005_auth_google_users.sql | S2-01 | Google OAuth users |
| 006 | 006_rls_jwt_bridge.sql | S2-02 | RLS JWT bridge |
| 007 | 007_user_profiles_dpi.sql | S2-03 | DPI profile + consent |
| 008 | 008_step_up_tracking.sql | S2-04 | Step-up tracking |
| 009 | 009_admin_mfa.sql | S2-05 | WebAuthn credentials, TOTP, challenges |
| 010 | 010_service_requests.sql | S3-02 | Service requests table + status CHECK constraint |
| 011 | 011_payments.sql | S4-01 | Payments table |
| 012 | 012_external_credentials.sql | S5-05 | Gov-portal credentials (encrypted) |
| 013 | 013_storage_buckets.sql | S6-01 | Supabase storage bucket config |
| 014 | 014_documents.sql | S6-02 | Documents table + retention |
| 015 | 015_request_chains.sql | S9-03 | Chained request support |

Update this table in the same PR that adds the migration.

---

## AuditAction Values

Add to `packages/shared/src/audit/types.ts` as stories require them:

```
AdminLogin, AdminMfaVerified, AdminMfaFailed, AdminPasskeyEnrolled, AdminTotpVerified,
RequestCreate, TransferProofUploaded, AdminTransferApprove, AdminTransferReject,
DocumentDownload, DocumentDeleted, AdminRequestResolved, AdminRequestFailed,
CredentialUpdated
```

---

## Known Issues — Do Not Investigate or Fix

| File | Error | Cause | Action |
|------|-------|-------|--------|
| `profile-complete.test.ts` | Cannot find module zod | vitest workspace resolution, S2-04 | **Ignore** |
| `step-up.test.ts` | Cannot find module zod | Same | **Ignore** |
| `apps/portal` tsc (run from apps/portal root) | Cannot find module for workspace packages | pnpm workspace paths; CI runs from root | **Ignore** |
| pnpm install | Unsupported engine (Node v24 vs v20.11.0) | Local Node newer than .nvmrc | **Ignore** |

---

## Installing Packages

Check `apps/portal/package.json` or `apps/worker/package.json` **before** running `pnpm add`.
Try `@latest` first — only pin a version if the install fails.
Never run `pnpm view` to discover versions unless `@latest` fails.

---

## Security Rules

- **No local `getSupabaseAdmin()` copies** — import singleton from `@/lib/supabase/admin`
- **Price always from SERVICE_CATALOG server-side** — never from request body
- **Webhook signature verified before any DB write**
- **Raw body for webhook sig** — use `Buffer.from(await req.arrayBuffer())`, not parsed JSON
- **Credentials zeroed after use** — `creds.username = ''; creds.password = '';` in `finally`
- **s3_key never in any response body or header**
- **403 and 404 responses byte-identical** where enumeration is a risk
- **Signed URLs max 300 seconds TTL** — never stored or cached
- **Admin notification emails** — no DPI, full name, or user email; only request ID, service type, timestamp

---

## ADL Decisions

| ADL | Decision |
|-----|----------|
| ADL-001 | Auth.js v5 (NextAuth) with JWT strategy |
| ADL-002 | Supabase as primary database + storage |
| ADL-003 | AES-256-GCM envelope encryption for all PII |
| ADL-004 | Argon2id for password hashing |
| ADL-005 | HMAC-SHA256 for deterministic DPI lookup |
| ADL-006 | BullMQ + Redis for automation job queue |
| ADL-007 | Playwright for gov-portal automation (worker only) |
| ADL-008 | Resend for transactional email |
| ADL-009 | Sensitive automation code is local-only — only structural scaffolds committed |

---

## Environment Variables

Always update `.env.example` in the same PR that introduces a new env var.

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- **Auth:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Encryption:** `KMS_KEY_ID`, `KMS_REGION`, `SUPABASE_VAULT_SECRET`, `HMAC_SECRET`, `CONSENT_VERSION`
- **Payments:** `RECURRENTE_API_KEY`, `NEONET_API_KEY`, `VISANET_API_KEY`, `STRIPE_*`, `RECURRENTE_WEBHOOK_SECRET`, etc.
- **Worker:** `REDIS_URL`, `PORTAL_INTERNAL_WEBHOOK_SECRET`, `SUPABASE_VAULT_SECRET`, `UPSTASH_REDIS_*`
- **Email:** `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `ADMIN_NOTIFICATION_EMAIL`
- **Admin MFA:** `ADMIN_IP_ALLOWLIST`, `ADMIN_TOTP_ENCRYPTION_KEY`, `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME`
- **Feature Flags:** `ENABLE_RENAP_ADAPTER`, `ENABLE_MINEX_ADAPTER`
- **Cron:** `CRON_SECRET`
- **Observability:** `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `OTEL_EXPORTER_ENDPOINT`
- **Rate Limiting:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## Commit Convention

`feat(S3-04): request creation flow with step-up auth`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

---

## CI Gates (must all pass before merge)

ESLint + Prettier · TypeScript typecheck (from root) · Vitest · Semgrep · GitLeaks · `pnpm audit --audit-level=high`
