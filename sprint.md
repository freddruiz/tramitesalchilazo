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
**Sprint:** S1 — Foundation & Security Core
**Sprint Goal:** Secure repo scaffold, CI/CD gates, crypto primitives, audit log.

## Active User Story
**ID:** S1-04
**Title:** Zod schema conventions + error taxonomy
**Assigned Model:** Haiku 4.5
**Status:** NOT_STARTED
**Branch:** `feature/S1-04-zod-schemas` (to be cut from `dev`)
**Blockers:** none (depends on S1-03 audit log)

### Contextual Continuity
1. Read this file. Confirm Active Story = S1-03.
2. Branch from `dev`: `git checkout -b feature/S1-03-audit-log`
3. Work only within `packages/shared/audit/` and related test files.
4. On completion: PR to `dev` with AC + Security Constraint checklists ticked. Update this file (move S1-03 to Completed, promote S1-04 to Active).

---

## Roadmap

### Epic E0 — Git Workflow & Deployment Protocol (cross-cutting, enforced from S1)
- [ ] S0-01  Branch protection rules on `main`, `prod`, `dev`              [manual + gh CLI]
- [ ] S0-02  PR template, CODEOWNERS, issue templates                      [Haiku 4.5]
- [ ] S0-03  Release workflow: `dev` -> `prod` promotion + tag             [Sonnet 4.6]

### Epic E1 — Foundation & Security Core
- [x] S1-01  Initialize Secure Repository & CI/CD                          [Haiku 4.5]
- [x] S1-02  Crypto utilities (AES-GCM envelope, Argon2id, HMAC)           [Sonnet 4.6]
- [x] S1-03  Append-only audit log with hash chain                         [Sonnet 4.6]
- [ ] S1-04  Zod schema conventions + error taxonomy                       [Haiku 4.5]
- [ ] S1-05  Supabase project bootstrap + migrations baseline              [Sonnet 4.6]

### Epic E2 — Identity & Consent
- [ ] S2-01  Auth.js + Google OAuth + Supabase session bridge              [Sonnet 4.6]
- [ ] S2-02  Session middleware + RBAC + RLS policies                      [Sonnet 4.6]
- [ ] S2-03  DPI profile completion + consent capture                      [Sonnet 4.6]
- [ ] S2-04  Step-up auth with secondary password                          [Sonnet 4.6]
- [ ] S2-05  Admin WebAuthn (passkeys) + TOTP fallback + IP allowlist      [Sonnet 4.6]

### Epic E3 — Service Catalog & Request Lifecycle
- [ ] S3-01  Service catalog + pricing (server-authoritative)              [Haiku 4.5]
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

### S1-03 — Append-only audit log with hash chain
**Status:** COMPLETED (2026-04-22)
**Branch:** `feature/S1-03-audit-log`
**Summary:**
- `supabase/migrations/001_audit_log.sql`: Creates audit_log table with hash chain columns (id, actor_id, action, resource_type, resource_id, ip_hash, user_agent, metadata, prev_hash, curr_hash, created_at); RLS policies granting INSERT-only to authenticated and service_role; REVOKE UPDATE/DELETE/TRUNCATE
- `packages/shared/src/audit/types.ts`: AuditAction enum with 20 actions (auth.*, profile.*, request.*, document.*, payment.*, admin.*); AuditEntryInput and AuditEntry interfaces
- `packages/shared/src/audit/logger.ts`: `writeAuditEntry(entry, dbClient)` reads last curr_hash, computes curr_hash=SHA256(prev_hash+actorId+action+resourceId+createdAt), hashes ipRaw via deterministicHmac, validates metadata for forbidden keys (password, dpi, token, authorization, secret, key); `verifyAuditChain(entries)` detects tampering by verifying prev_hash chain + hash reconstruction
- `packages/shared/src/audit/index.ts`: barrel export of types and functions
- 7 unit tests: all passing (IP hashing, metadata validation, 3-entry hash chain, tampering detection, genesis hash, field combinations)

**AC Checklist:**
- [x] `001_audit_log.sql` — audit_log table with required columns + RLS policies + REVOKE UPDATE/DELETE/TRUNCATE
- [x] `audit/types.ts` — AuditAction enum with all 20 actions
- [x] `audit/logger.ts` — writeAuditEntry with hash chain + IP hashing + metadata validation
- [x] `audit/index.ts` — barrel export
- [x] All 7 unit tests passing (chain, tampering detection, IP hashing)

**Security Constraints:**
- [x] Raw IP address never stored — always HMAC-SHA256 hashed before insert
- [x] metadata JSONB rejects forbidden keys (password, dpi, token, authorization, secret, key) — runtime guard throws
- [x] Application role INSERT-only on audit_log — UPDATE/DELETE/TRUNCATE explicitly revoked
- [x] Hash chain integrity verified: prev_hash + curr_hash reconstruction detect any tampering

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
