# Sprint.md — Tramites al Chilazo
# SOURCE OF TRUTH: All story status and active work tracked here.
# Claude Code reads this file at the start of every story to confirm the active story.

---

## REPO CONTEXT (Claude Code reads this every run — do not re-discover)

- Monorepo root: pnpm workspace
- Apps: `apps/portal` (Next.js 15, App Router), `apps/worker` (Node.js/BullMQ)
- Shared package: `packages/shared` — exports `encrypt`, `decrypt`, `hashPassword`, `verifyPassword`, `hmac`, `writeAuditEntry`, `AuditAction`
- **Supabase admin client:** `import { supabaseAdmin } from '@/lib/supabase/admin'` — created in S3-04. Never copy-paste `getSupabaseAdmin()` into individual files.
- **Session helper:** `import { getSession } from '@/lib/auth/session'`
- **RBAC:** `import { requireRole, requireStepUp } from '@/lib/auth/rbac'`
- **Audit:** `import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared'`
- **IP extraction:** `import { extractClientIp } from '@/lib/admin/ipAllowlist'`
- **PRE-EXISTING TEST FAILURES (ignore):** `profile-complete.test.ts` and `step-up.test.ts` fail with "Cannot find module zod" — vitest workspace resolution issue from S2-04. Do not fix.
- **PRE-EXISTING TS ERRORS (ignore):** `apps/portal` tsc reports "Cannot find module" for workspace packages when run from `apps/portal` root — CI runs from workspace root where paths resolve. Not regressions.
- Node version: v24.x (ignore pnpm "Unsupported engine" warnings)

---

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| v1.0.0 | Antecedentes Penales + Policiales (Sprints 1–8) | In Progress |
| v2.0.0 | RENAP Nacimiento + MINEX Apostillado (Sprint 9) | Planned |

---

## Sprint 1 — Foundation ✅

| Story | Title | Status |
|-------|-------|--------|
| S1-01 | Repo scaffold + CI/CD | ✅ Done |
| S1-02 | Crypto utils (AES-256-GCM, Argon2id, HMAC) | ✅ Done |
| S1-03 | Audit log + hash chain | ✅ Done |
| S1-04 | Zod error helpers | ✅ Done |
| S1-05 | Supabase bootstrap + RLS | ✅ Done |

---

## Sprint 2 — Auth + Admin MFA ✅

| Story | Title | Status |
|-------|-------|--------|
| S2-01 | Google OAuth (Auth.js v5) | ✅ Done |
| S2-02 | RBAC middleware | ✅ Done |
| S2-03 | DPI profile completion + consent | ✅ Done |
| S2-04 | Step-up auth (secondary password) | ✅ Done |
| S2-05 | Admin WebAuthn + TOTP fallback + IP allowlist | ✅ Done |

---

## Sprint 3 — Request Creation ✅

| Story | Title | Status |
|-------|-------|--------|
| S3-01 | Service catalog + pricing (server-authoritative) | ✅ Done |
| S3-02 | Request state machine + status transitions | ✅ Done |
| S3-03 | Client dashboard UI | ✅ Done |
| S3-04 | Request creation flow (step-up gated) | ✅ Done |

---

## Sprint 4 — Payments 🔄

### Active Story: S4-01

| Story | Title | Status |
|-------|-------|--------|
| S4-01 | IPaymentProvider abstraction + event types | **🟡 Active** |
| S4-02 | Recurrente adapter | ⬜ Planned |
| S4-03 | NeoNet adapter | ⬜ Planned |
| S4-04 | Visanet adapter | ⬜ Planned |
| S4-05 | Stripe adapter | ⬜ Planned |
| S4-06 | Manual bank transfer upload + proof storage | ⬜ Planned |
| S4-07 | Admin transfer verification workflow | ⬜ Planned |
| S4-08 | Webhook HMAC verification + idempotency keys | ⬜ Planned |

---

## Sprint 5 — Worker + Gov Portal Automation

| Story | Title | Status |
|-------|-------|--------|
| S5-01 | Worker scaffold + KMS credential decryption | ⬜ Planned |
| S5-02 | IGovPortalAdapter contract + state machine | ⬜ Planned |
| S5-03 | Antecedentes Penales adapter scaffold | ⬜ Planned |
| S5-04 | Antecedentes Policiales adapter scaffold | ⬜ Planned |
| S5-05 | Credential rotation + password-reset flow | ⬜ Planned |
| S5-06 | Manual review escalation queue | ⬜ Planned |

---

## Sprint 6 — Documents + Storage

| Story | Title | Status |
|-------|-------|--------|
| S6-01 | Supabase storage buckets + SSE + lifecycle | ⬜ Planned |
| S6-02 | 20-day retention cron + hard delete + audit | ⬜ Planned |
| S6-03 | Email dispatch on completion (Resend) | ⬜ Planned |
| S6-04 | Signed single-use document download | ⬜ Planned |

---

## Sprint 7 — Admin UI

| Story | Title | Status |
|-------|-------|--------|
| S7-01 | Admin layout + RBAC guards | ⬜ Planned |
| S7-02 | Real-time request monitor (Supabase Realtime) | ⬜ Planned |
| S7-03 | Transfer verification UI (admin) | ⬜ Planned |
| S7-04 | New submission email triggers (admin notifications) | ⬜ Planned |
| S7-05 | Audit log viewer (admin) | ⬜ Planned |

---

## Sprint 8 — Security Hardening + Release v1.0.0

| Story | Title | Status |
|-------|-------|--------|
| S8-01 | OWASP ZAP + semgrep full scan remediation | ⬜ Planned |
| S8-02 | Load test + rate-limit tuning | ⬜ Planned |
| S8-03 | Observability: Sentry + OTel + Grafana | ⬜ Planned |
| S8-04 | Runbooks: incident response, key rotation, retention, backup | ⬜ Planned |
| S8-05 | External pen-test remediation | ⬜ Planned |
| S8-06 | Promote dev → prod, tag v1.0.0 | ⬜ Planned |

---

## Sprint 9 — v2.0.0: RENAP + MINEX

| Story | Title | Status |
|-------|-------|--------|
| S9-01 | RENAP adapter scaffold (Certificado de Nacimiento) | ⬜ Planned |
| S9-02 | MINEX Apostillado adapter scaffold | ⬜ Planned |
| S9-03 | Multi-step request chaining (RENAP → MINEX) | ⬜ Planned |
| S9-04 | Feature flag rollout + v2 hardening | ⬜ Planned |
| S9-05 | Promote dev → prod, tag v2.0.0 | ⬜ Planned |

---

## Migration Sequence

| # | File | Story | Description |
|---|------|-------|-------------|
| 005 | 005_auth_google_users.sql | S2-01 | Google OAuth users |
| 006 | 006_rls_jwt_bridge.sql | S2-02 | RLS JWT bridge |
| 007 | 007_user_profiles_dpi.sql | S2-03 | DPI profile + consent |
| 008 | 008_step_up_tracking.sql | S2-04 | Step-up tracking |
| 009 | 009_admin_mfa.sql | S2-05 | WebAuthn credentials + TOTP + challenges |
| 010 | 010_service_requests.sql | S3-02 | Service requests table + status CHECK constraint |
| 011 | 011_payments.sql | S4-01 | Payments table |
| 012 | 012_external_credentials.sql | S5-05 | Gov-portal credentials (encrypted) |
| 013 | 013_storage_buckets.sql | S6-01 | Supabase storage bucket config |
| 014 | 014_documents.sql | S6-02 | Documents table + retention |
| 015 | 015_request_chains.sql | S9-03 | Chained request support |

---

## AuditAction Enum (all values)

Add these to `packages/shared/src/audit/types.ts` as stories require them:

```
AdminLogin, AdminMfaVerified, AdminMfaFailed, AdminPasskeyEnrolled, AdminTotpVerified,
RequestCreate, TransferProofUploaded, AdminTransferApprove, AdminTransferReject,
DocumentDownload, DocumentDeleted, AdminRequestResolved, AdminRequestFailed,
CredentialUpdated
```

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

## Tech Debt

_(Add deferred findings from S8-01 and S8-05 here with justification and resolution timeline)_

---

## PR Checklist (every story)

- [ ] Branch from dev (or last active feature branch if dev not yet updated)
- [ ] No `getSupabaseAdmin()` local copies — import from `@/lib/supabase/admin`
- [ ] Migration numbered sequentially from table above
- [ ] `.env.example` updated if new env vars added
- [ ] Audit log entry for every state-changing operation
- [ ] sprint.md updated: this story → Done, next story → Active
- [ ] PR opened to dev, URL output as final line
