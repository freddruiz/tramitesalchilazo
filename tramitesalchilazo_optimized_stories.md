# Tramites al Chilazo — Story Prompts (Trimmed)
# Git protocol, repo URL, and stack are in CLAUDE.md — not repeated here.
# Each prompt is only the delta: story ID, acceptance criteria, constraints, sprint update.

---

## HOW TO USE

1. Open Claude Code in the repo root (where CLAUDE.md lives)
2. Set model: type `/model sonnet` or `/model haiku` as noted
3. Paste only the story block below — nothing else needed

---

## S3-01 — Service Catalog + Pricing (Server-Authoritative)
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S3-01. Sprint 3 is active.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/portal/lib/catalog/services.ts` — SERVICE_CATALOG constant (hardcoded server-side, not from DB): `{ id: service_enum, name, description, priceGTQ, processingDays, available }`. Entries: antecedentes_penales, antecedentes_policiales (available: true); renap, minex (available: false)
- [ ] `GET /api/services` — returns only available services; price always server-computed from catalog
- [ ] `apps/portal/app/(client)/services/page.tsx` — service selection UI showing available services with price and processing time
- [ ] Unit test: POST /api/requests with tampered price in body → server uses catalog price, not submitted price

**SECURITY:**
- Price derived from SERVICE_CATALOG server-side only — any client-submitted amount is ignored
- Unavailable services (renap, minex) return 404 if requested — not just hidden from UI

**SPRINT.MD UPDATE:** S3-01 done → S3-02 active.

---

## S3-02 — Request State Machine + Status Transitions
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S3-02.

**ACCEPTANCE CRITERIA:**
- [ ] `packages/shared/src/contracts/requestStateMachine.ts` — allowed transitions:
  - pending_payment → queued (payment confirmed)
  - queued → in_progress (worker picks up job)
  - in_progress → completed (worker success)
  - in_progress → failed (worker hard failure)
  - in_progress → needs_manual_review (worker soft failure)
  - Any other transition throws REQUEST_INVALID_TRANSITION AppError
- [ ] Add to `packages/shared/src/contracts/index.ts` and re-export from `packages/shared/src/index.ts`
- [ ] `apps/portal/lib/requests/transitions.ts` — `transitionRequest(requestId, toStatus, actorId)`: validates transition; updates service_requests.status via supabaseAdmin; writes audit log (AuditAction.RequestStatusChange); throws on invalid transition
- [ ] Unit tests: all valid transitions pass; all invalid transitions throw; audit entry written on each
- [ ] DB: service_requests status column has CHECK constraint matching allowed enum values (add to migration 010 or a new migration 010b if 010 already exists)

**SECURITY:**
- Status transitions callable from server-side code only (supabaseAdmin) — never from a client API route
- Every transition produces an audit log entry

**SPRINT.MD UPDATE:** S3-02 done → S3-03 active.

---

## S3-03 — Client Dashboard UI
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S3-03.

**ACCEPTANCE CRITERIA:**
- [ ] `/dashboard` — paginated list (10/page) of user's service_requests: status badge, created_at, service type, action buttons; empty state; loading skeletons
- [ ] Status badge colors: pending_payment=gray, queued=blue, in_progress=yellow, completed=green, failed=red, needs_manual_review=orange, expired=gray
- [ ] `/dashboard/requests/[id]` detail — full request info, payment status, document download button (only if completed + not expired)
- [ ] `GET /api/requests` — paginated list for current user (RLS enforced + session.user.id filter)
- [ ] `GET /api/requests/[id]` — single request; explicit check `request.user_id === session.user.id`; 404 if not owned (not 403)

**SECURITY:**
- `GET /api/requests/[id]` verifies ownership server-side explicitly — do not rely on RLS alone
- Response must not include s3_key, dek_wrapped, or any encrypted field

**SPRINT.MD UPDATE:** S3-03 done → S3-04 active.

## S3-04 — Request Creation Flow (Step-Up Gated)
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S3-04.

**First file in this PR:** create `apps/portal/lib/supabase/admin.ts` (singleton supabaseAdmin — see CLAUDE.md). All subsequent files import from there.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/portal/lib/supabase/admin.ts` — singleton Supabase admin client (service_role)
- [ ] `apps/portal/lib/catalog/services.ts` — SERVICE_CATALOG with antecedentes_penales, antecedentes_policiales (available=true); renap, minex (available=false)
- [ ] `/services/[serviceId]/new` page — confirmation screen: service name, price, processing time, legal disclaimer. 404 if service not in catalog or available=false
- [ ] `POST /api/requests`:
  - `requireStepUp()` before any DB write
  - Validates serviceId against SERVICE_CATALOG server-side; 404 if unavailable
  - Creates service_requests row: status=pending_payment, price from catalog only
  - Returns `{ requestId, paymentAmount }`
  - Writes audit log (AuditAction.RequestCreate)
- [ ] After creation, client redirects to `/requests/[id]/pay`
- [ ] Idempotency: same user + same service while status=pending_payment or queued → return existing requestId
- [ ] Migration `010_service_requests.sql`: service_requests table (id, user_id, service_type enum, status enum, price_cents, created_at, updated_at, retention_expires_at)

**SECURITY:**
- `requireStepUp()` before any DB write
- Price from SERVICE_CATALOG only — never from request body
- Unavailable services return 404 even if serviceId is a valid enum value

**SPRINT.MD UPDATE:** S3-04 done. Sprint 3 complete → S4-01 active, Sprint 4 begins.

---

## S4-01 — IPaymentProvider Abstraction + Normalized Event Shape
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S4-01. Sprint 4 is active.

**ACCEPTANCE CRITERIA:**
- [ ] `packages/shared/src/payments/IPaymentProvider.ts` — interface: `createPaymentIntent`, `verifyWebhookSignature`, `normalizeWebhookEvent`. Type design: `normalizeWebhookEvent` only accepts a pre-verified payload type — enforces verification order
- [ ] `packages/shared/src/payments/types.ts` — PaymentIntentParams `{ amountCents, currency, requestId, idempotencyKey, metadata }`, PaymentIntentResult `{ intentId, clientSecret?, redirectUrl?, status }`, NormalizedPaymentEvent `{ type: 'payment.succeeded'|'payment.failed'|'payment.refunded', intentId, amountCents, currency, metadata }`
- [ ] `packages/shared/src/payments/index.ts` — barrel export
- [ ] `packages/shared/src/index.ts` — add `export * from './payments/index.js'`
- [ ] `apps/portal/lib/payments/registry.ts` — `getPaymentProvider(method: PaymentMethodEnum): IPaymentProvider`; throws if method not configured
- [ ] Unit test: registry returns correct provider class per method enum value
- [ ] Migration `011_payments.sql`: payments table (id, request_id FK, method enum, status enum, amount_cents, idempotency_key UNIQUE, transfer_proof_s3_key, verified_by, verified_at, created_at)

**SECURITY:**
- `amountCents` always from SERVICE_CATALOG server-side
- `idempotencyKey` generated server-side: `crypto.randomUUID()`

**SPRINT.MD UPDATE:** S4-01 done → S4-02 active.

---

## S4-02 through S4-05 — Payment Gateway Adapters
> `/model sonnet`
> Run once per adapter. Replace SLUG/NAME throughout.

Read `sprint.md`. Confirm Active Story = S4-0X.

| Story | Name | Slug | Env prefix |
|-------|------|------|-----------|
| S4-02 | Recurrente | recurrente | RECURRENTE_ |
| S4-03 | NeoNet | neonet | NEONET_ |
| S4-04 | Visanet | visanet | VISANET_ |
| S4-05 | Stripe | stripe | STRIPE_ |

Branch: `feature/S4-0X-SLUG-adapter`

**ACCEPTANCE CRITERIA:**
- [ ] `packages/shared/src/payments/adapters/SLUG.ts` implementing IPaymentProvider: `createPaymentIntent`, `verifyWebhookSignature`, `normalizeWebhookEvent`
- [ ] API keys from env: `SLUG_API_KEY`, `SLUG_WEBHOOK_SECRET`
- [ ] `.env.example` updated with gateway placeholders
- [ ] Unit tests (vitest mocks): createPaymentIntent shape; valid/invalid signature; all 3 event type normalizations
- [ ] `POST /api/webhooks/SLUG`:
  - Raw body: `Buffer.from(await req.arrayBuffer())`
  - `verifyWebhookSignature` first — 400 if fails
  - `normalizeWebhookEvent` → update payment status → enqueue next job if succeeded
  - Always returns 200 (log errors server-side, never surface them)
  - Idempotent: duplicate event_id silently accepted (check payments.idempotency_key)
- [ ] Register adapter in `apps/portal/lib/payments/registry.ts`

**SECURITY:**
- Raw body for signature — not parsed JSON
- API keys never logged or in error messages
- `verifyWebhookSignature` before any DB write

**SPRINT.MD UPDATE:** S4-0X done → S4-0(X+1) active (or S4-06 after S4-05).

---

## S4-06 — Manual Bank Transfer Upload + Proof Storage
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S4-06.

**ACCEPTANCE CRITERIA:**
- [ ] `/requests/[id]/pay/transfer` page — bank account details + file upload for receipt
- [ ] `POST /api/payments/[id]/transfer-proof`:
  - `requireStepUp()` first
  - Accepts multipart/form-data; JPEG/PNG/PDF only; max 5MB
  - Validates by magic bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47`, PDF `25 50 44 46`
  - Uploads to Supabase Storage `receipts/` with key `receipts/{UUID}.{ext}` — never original filename
  - Stores s3_key in `payments.transfer_proof_s3_key`
  - Sets `payments.status = 'pending'`
  - Writes audit log (AuditAction.TransferProofUploaded)
- [ ] `.env.example`: SUPABASE_STORAGE_BUCKET_RECEIPTS

**SECURITY:**
- Magic bytes validation — extension ignored entirely
- Filename = UUID only
- Receipts bucket private (service_role only)
- 5MB enforced server-side

**SPRINT.MD UPDATE:** S4-06 done → S4-07 active.

---

## S4-07 — Admin Transfer Verification Workflow
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S4-07.

**ACCEPTANCE CRITERIA:**
- [ ] `/admin/payments` page — lists payments with method=bank_transfer AND status=pending, sorted created_at asc
- [ ] `/admin/payments/[id]` detail — payment info + signed URL (300s TTL) to view receipt + approve/reject buttons + optional notes
- [ ] `POST /api/admin/payments/[id]/verify`:
  - `requireRole('admin')` + `requireStepUp()`
  - Body: `{ action: 'approve' | 'reject', notes?: string }`
  - Approve: status=completed, verified_by=adminId, verified_at=now(); transition request to queued; send confirmation email
  - Reject: status=failed; send rejection email with notes
  - Audit log (AuditAction.AdminTransferApprove or AdminTransferReject)
- [ ] Signed receipt URL: 300s TTL, generated fresh per page load — never stored or cached

**SECURITY:**
- `requireRole('admin')` + `requireStepUp()` mandatory
- Guard: `payment.user_id !== session.user.id` (admin cannot approve own payment)
- Signed URL generated fresh — never stored

**SPRINT.MD UPDATE:** S4-07 done → S4-08 active.

---

## S4-08 — Webhook HMAC Verification + Idempotency Keys
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S4-08.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/portal/lib/payments/webhookGuard.ts` — `verifyAndExtractEvent(req, provider): Promise<NormalizedPaymentEvent | null>`:
  - Raw body: `Buffer.from(await req.arrayBuffer())`
  - `provider.verifyWebhookSignature` → throws AppError(400) if fails
  - `provider.normalizeWebhookEvent`
  - Check `payments.idempotency_key` for duplicate event_id → return `null` if already processed
- [ ] All four gateway webhook routes refactored to use `verifyAndExtractEvent`
- [ ] Unit tests: duplicate event_id returns null; invalid signature throws

**SECURITY:**
- Raw body preserved before any JSON parsing
- Idempotency check AFTER signature verification

**SPRINT.MD UPDATE:** S4-08 done. Sprint 4 complete → S5-01 active, Sprint 5 begins.

---

## S5-01 — Worker Scaffold + KMS Credential Decryption
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S5-01. Sprint 5 is active.

ADL-009: scaffold only — no real credentials or navigation logic committed.

**Packages to add in apps/worker** (check package.json first): `bullmq@5.x ioredis@5.x zod@3.x dotenv@16.x`

**ACCEPTANCE CRITERIA:**
- [ ] `apps/worker/src/queue/jobSchema.ts` — Zod AutomationJob schema: `{ jobId, requestId, userId, portalType: gov_portal_enum, encryptedCredentials: { username_encrypted, password_encrypted, dek_wrapped } }`
- [ ] `apps/worker/src/queue/worker.ts` — BullMQ Worker on queue `'automation'`: routes by `job.data.portalType`; try/catch; on success POSTs HMAC-signed body to `/api/internal/job-result`; credentials zeroed in `finally`
- [ ] `apps/worker/src/crypto/decryptCredentials.ts` — `decryptCredentials(enc): { username, password }`: unwrapDek → decrypt; caller zeros after use
- [ ] `apps/worker/Dockerfile` — Node 20 Alpine, `USER node`, read-only rootfs
- [ ] `apps/worker/fly.toml` — stub deploy config
- [ ] `.env.example` worker additions: REDIS_URL, PORTAL_INTERNAL_WEBHOOK_SECRET, SUPABASE_VAULT_SECRET

**SECURITY:**
- Credentials zeroed: `creds.username = ''; creds.password = '';` in `finally`
- Worker has no direct DB access — only queue + signed webhook
- Internal webhook verified with HMAC (PORTAL_INTERNAL_WEBHOOK_SECRET)

**SPRINT.MD UPDATE:** S5-01 done → S5-02 active.

---

## S5-02 — IGovPortalAdapter Contract + State Machine Helpers
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S5-02.

**ACCEPTANCE CRITERIA:**
- [ ] `packages/shared/src/contracts/IGovPortalAdapter.ts`: interface with `portalType` and `execute(job, credentials): Promise<AdapterResult>`; AdapterResult type; AdapterErrorType enum: INVALID_CREDENTIALS, CAPTCHA_REQUIRED, MAINTENANCE, UNEXPECTED_PAGE, TIMEOUT, ACCOUNT_LOCKED
- [ ] `packages/shared/src/contracts/index.ts` — barrel export; add to `packages/shared/src/index.ts`
- [ ] `apps/worker/src/automation/stateMachine.ts` — NavigationStep type + `executeStep(page, step)`: runs action then assertion with `step.timeoutMs`; on assertion failure throws step.name + UNEXPECTED_PAGE; on timeout throws TIMEOUT; takes screenshot on failure → screenshotRedactor → encrypted upload to Supabase Storage (7-day TTL)
- [ ] `apps/worker/src/automation/screenshotRedactor.ts` — `redactPii(buf: Buffer): Buffer` stub with placeholder black-rectangle logic
- [ ] Unit tests: successful step passes; failing assertion throws correct error type; timeout triggers TIMEOUT

**SECURITY:**
- Screenshots through `redactPii` before storage
- Only AdapterErrorType returned to portal — never raw exception messages
- Credentials zeroed in `finally` at execute() call site

**SPRINT.MD UPDATE:** S5-02 done → S5-03 active.

---

## S5-03 — Antecedentes Penales Adapter (Scaffold)
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S5-03.

ADL-009: zero real URLs, selectors, or navigation logic — TODO stubs only.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/worker/src/adapters/antecedentes-penales/selectors.ts` — all values `'TODO'`
- [ ] `apps/worker/src/adapters/antecedentes-penales/steps.ts` — NavigationStep stubs: LOGIN_NAVIGATE, LOGIN_ASSERT_FORM, LOGIN_SUBMIT, ASSERT_DASHBOARD, NAVIGATE_REQUEST, SUBMIT_REQUEST, ASSERT_RESULT, DOWNLOAD_DOCUMENT
- [ ] `apps/worker/src/adapters/antecedentes-penales/index.ts` implementing IGovPortalAdapter: `portalType = 'antecedentes_penales'`; `execute()` with full try/catch/finally; credential zeroing in finally; returns AdapterResult
- [ ] `apps/worker/src/adapters/index.ts` — registry mapping gov_portal_enum → adapter instances
- [ ] Unit test: adapter registered; `execute()` with mock credentials returns AdapterResult shape

**SECURITY:**
- TODO stubs only — no real selectors or URLs
- Credentials zeroed in `finally`
- Max 1 login retry per 24h per user — enforced in `execute()` wrapper via DB check

**SPRINT.MD UPDATE:** S5-03 done → S5-04 active.

---

## S5-04 — Antecedentes Policiales Adapter (Scaffold)
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S5-04.

ADL-009 applies. Registry already exists at `apps/worker/src/adapters/index.ts` from S5-03.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/worker/src/adapters/antecedentes-policiales/selectors.ts` — all values `'TODO'`
- [ ] `apps/worker/src/adapters/antecedentes-policiales/steps.ts` — NavigationStep stubs: LOGIN_NAVIGATE, LOGIN_ASSERT_FORM, LOGIN_SUBMIT, ASSERT_DASHBOARD, NAVIGATE_REQUEST, SUBMIT_REQUEST, ASSERT_RESULT, DOWNLOAD_DOCUMENT
- [ ] `apps/worker/src/adapters/antecedentes-policiales/index.ts` — same structure as S5-03, `portalType = 'antecedentes_policiales'`
- [ ] Adapter added to registry in `apps/worker/src/adapters/index.ts`
- [ ] Unit test: adapter registered; `execute()` returns AdapterResult shape

**SECURITY:** Same as S5-03.

**SPRINT.MD UPDATE:** S5-04 done → S5-05 active.

---

## S5-05 — Credential Rotation + Password-Reset Flow
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S5-05.

**ACCEPTANCE CRITERIA:**
- [ ] Migration `012_external_credentials.sql`: external_credentials (id, user_id FK, portal_type gov_portal_enum, username_encrypted JSONB, password_encrypted JSONB, dek_wrapped TEXT, last_rotation TIMESTAMPTZ; UNIQUE(user_id, portal_type))
- [ ] `POST /api/credentials/[portal]`: requireStepUp(); encrypt username+password with new per-user DEK; upsert external_credentials; last_rotation=now(); send "credentials updated" email; audit log (AuditAction.CredentialUpdated)
- [ ] `GET /api/credentials/[portal]/status`: returns `{ hasCredentials: boolean, lastRotation: string|null }` — never decrypted values
- [ ] `apps/portal/app/(client)/settings/credentials/page.tsx` — per-portal credential entry/update UI
- [ ] Worker: INVALID_CREDENTIALS from adapter → set request to needs_manual_review; notify admin; do NOT auto-reset password

**SECURITY:**
- Step-up required before any credential write
- Status endpoint never returns decrypted values
- New DEK generated on every rotation

**SPRINT.MD UPDATE:** S5-05 done → S5-06 active.

---

## S5-06 — Manual Review Escalation Queue
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S5-06.

**ACCEPTANCE CRITERIA:**
- [ ] Worker → needs_manual_review: Resend email to admin with request ID, portal name, AdapterErrorType category (not raw error), link to `/admin/manual-review`
- [ ] `/admin/manual-review` page — lists all requests in needs_manual_review
- [ ] `POST /api/admin/requests/[id]/resolve`: requireRole('admin'); status → queued; re-enqueue job; audit log (AuditAction.AdminRequestResolved)
- [ ] `POST /api/admin/requests/[id]/fail`: requireRole('admin'); status → failed; notify user via email; audit log (AuditAction.AdminRequestFailed)
- [ ] User-facing status text: "Processing delayed — our team is reviewing your request"

**SECURITY:**
- User messages: generic only — no error codes or portal responses
- Admin email: request ID, portal name, AdapterErrorType category only — no PII

**SPRINT.MD UPDATE:** S5-06 done. Sprint 5 complete → S6-01 active, Sprint 6 begins.

---

## S6-01 — Supabase Storage Bucket + Lifecycle Rules
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S6-01. Sprint 6 is active.

**ACCEPTANCE CRITERIA:**
- [ ] Migration `013_storage_buckets.sql`: creates `documents` bucket (private, 20MB, application/pdf) and `receipts` bucket (private, 5MB, image/jpeg + image/png + application/pdf) via `storage.buckets` insert
- [ ] `apps/portal/lib/storage/documents.ts`: `uploadDocument(requestId, buffer, sha256): Promise<{ s3Key }>` (key: `documents/{requestId}/{uuid}.pdf`); `getSignedDownloadUrl(s3Key, expiresInSeconds=300): Promise<string>`
- [ ] `apps/portal/lib/storage/receipts.ts` — equivalent for receipts bucket
- [ ] `.env.example`: SUPABASE_STORAGE_BUCKET_DOCUMENTS, SUPABASE_STORAGE_BUCKET_RECEIPTS

**SECURITY:**
- Both buckets private
- s3_key never in any API response
- Signed URLs max 300s

**SPRINT.MD UPDATE:** S6-01 done → S6-02 active.

---

## S6-02 — 20-Day Retention Cron + Hard Delete + Audit
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S6-02.

**ACCEPTANCE CRITERIA:**
- [ ] Migration `014_documents.sql`: documents table (id, request_id FK, s3_key TEXT, sha256 TEXT, expires_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ, created_at)
- [ ] Worker: on document upload sets `documents.expires_at = NOW() + INTERVAL '20 days'` and `service_requests.retention_expires_at = same`
- [ ] `GET /api/cron/expire-documents` (schedule `0 2 * * *`): verify `Authorization: Bearer {CRON_SECRET}`; find docs where expires_at ≤ NOW() AND deleted_at IS NULL; delete from storage; set deleted_at=NOW(); write audit log per doc (AuditAction.DocumentDeleted); return `{ deleted: count }`
- [ ] `GET /api/documents/[id]/download`: returns 410 Gone if expires_at ≤ NOW()
- [ ] `vercel.json` cron config

**SECURITY:**
- Cron: CRON_SECRET header — 401 if missing/wrong
- Hard delete: file removed from storage
- 410 must not reveal whether document belonged to a different user

**SPRINT.MD UPDATE:** S6-02 done → S6-03 active.

---

## S6-03 — Email Dispatch on Completion (Resend)
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S6-03.

Check `apps/portal/package.json` before installing — add `resend@latest` if not present.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/portal/lib/email/sender.ts` — `sendEmail(to, template, data)` using Resend SDK
- [ ] `apps/portal/lib/email/templates/requestCompleted.tsx` — service name, request ID, link to `/requests/[id]` (portal page, not S3 direct), expiry date
- [ ] `apps/portal/lib/email/templates/requestFailed.tsx` — service name, request ID, generic failure, support contact
- [ ] `apps/portal/lib/email/templates/paymentReceived.tsx` — amount, method, request ID
- [ ] `apps/portal/lib/email/templates/transferRejected.tsx` — reason (from admin notes), support contact
- [ ] On request completion (worker callback to `/api/internal/job-result`): call sendEmail
- [ ] `.env.example`: RESEND_API_KEY, EMAIL_FROM_ADDRESS

**SECURITY:**
- Download link in email → portal page (requires auth), not S3 direct
- No DPI, secondary password, or PII in any email

**SPRINT.MD UPDATE:** S6-03 done → S6-04 active.

---

## S6-04 — Signed Single-Use Document Download
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S6-04.

**ACCEPTANCE CRITERIA:**
- [ ] `GET /api/documents/[id]/download`:
  - Explicit IDOR check: `document.request.user_id === session.user.id` (not just RLS)
  - Wrong owner → 404 (not 403)
  - Expired → 410 Gone
  - Valid → `getSignedDownloadUrl(s3Key, 300)` → return `{ url }`
  - Audit log (AuditAction.DocumentDownload) with IP hash, user agent, document ID
- [ ] 403 and 404 response bodies byte-identical (same constant)
- [ ] Fuzz test: 50 random UUIDs as authenticated user B who owns none → all return 404

**SECURITY:**
- Explicit IDOR check server-side — do not rely on RLS alone
- s3_key never in response body or header
- 403 and 404 byte-identical

**SPRINT.MD UPDATE:** S6-04 done. Sprint 6 complete → S7-01 active, Sprint 7 begins.

---

## S7-01 — Admin Layout + RBAC Guards
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S7-01. Sprint 7 is active.

The minimal layout scaffold from S2-05 exists at `app/(admin)/admin/layout.tsx` — replace it with the full shell.

**ACCEPTANCE CRITERIA:**
- [ ] `app/(admin)/admin/layout.tsx` — server component: calls `requireRole('admin')` + verifies `session.user.adminMfaVerifiedAt` within 4 hours; sidebar nav: Dashboard, Requests, Payments, Manual Review, Audit Log, Settings; shows admin name + logout
- [ ] `/admin/dashboard` — stats cards: active requests, pending transfers, needs_manual_review count, documents expiring in 48h; all fetched server-side via supabaseAdmin

**SECURITY:**
- Role + MFA check in layout — cannot be bypassed by navigating to child route directly
- Stats via supabaseAdmin — never anon client

**SPRINT.MD UPDATE:** S7-01 done → S7-02 active.

---

## S7-02 — Real-Time Request Monitor (Supabase Realtime)
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S7-02.

**ACCEPTANCE CRITERIA:**
- [ ] `/admin/requests` — table: all service_requests with masked email (`j***@gmail.com`), service type, status badge, created_at, payment status
- [ ] Realtime updates via SSE endpoint `GET /api/admin/requests/stream` — authenticates server-side, forwards Supabase Realtime events. Service_role key stays server-side — never in browser
- [ ] `/admin/requests/[id]` — full detail with unmasked email
- [ ] Status badge colors consistent with client dashboard

**SECURITY:**
- Realtime via server-side SSE — service_role key never in browser
- List view masks email; full email on detail page only

**SPRINT.MD UPDATE:** S7-02 done → S7-03 active.

---

## S7-03 — Transfer Verification UI (Admin)
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S7-03.

The API (`POST /api/admin/payments/[id]/verify`) already exists from S4-07. This story is UI only.

**ACCEPTANCE CRITERIA:**
- [ ] `/admin/payments` — tab for pending bank transfers: amount, masked user, submitted_at, relative age ("2 hours ago")
- [ ] Click row → modal: embedded receipt preview (PDF/image via signed URL) + approve/reject buttons + optional notes
- [ ] On approve/reject: optimistic UI update + toast; calls existing S4-07 API
- [ ] Empty state when no pending transfers

**SECURITY:** All S4-07 API constraints apply. Do not cache or persist signed receipt URL between renders.

**SPRINT.MD UPDATE:** S7-03 done → S7-04 active.

---

## S7-04 — New Submission Email Triggers (Admin Notifications)
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S7-04.

`sendEmail` from `@/lib/email/sender` (S6-03). RESEND_API_KEY already in .env.example.

**ACCEPTANCE CRITERIA:**
- [ ] On new service_request: send admin notification to ADMIN_NOTIFICATION_EMAIL — service type, request ID, payment method, timestamp. No user PII
- [ ] On new bank transfer proof uploaded: additional admin email with link to `/admin/payments/[id]`
- [ ] `apps/portal/lib/email/templates/adminNewRequest.tsx` and `adminNewTransfer.tsx`
- [ ] `.env.example`: ADMIN_NOTIFICATION_EMAIL

**SECURITY:** Admin email contains only request ID, service type, payment method, timestamp — no DPI, name, or user email.

**SPRINT.MD UPDATE:** S7-04 done → S7-05 active.

---

## S7-05 — Audit Log Viewer (Admin)
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S7-05.

**ACCEPTANCE CRITERIA:**
- [ ] `/admin/audit` — paginated table (20/page): timestamp, masked actor (last 8 chars of UUID), action, resource_type, resource_id
- [ ] Filters: action type (dropdown), date range (date picker)
- [ ] "Verify Chain" button — re-computes hash chain for current page → green checkmark or red warning
- [ ] Click row → side panel showing full metadata JSONB

**SECURITY:**
- Read-only — no edit or delete UI
- Actor = last 8 chars of UUID only — not full UUID or email

**SPRINT.MD UPDATE:** S7-05 done. Sprint 7 complete → S8-01 active, Sprint 8 begins.

---

## S8-01 — OWASP ZAP + Semgrep Full Scan Remediation
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S8-01. Sprint 8 is active.

**ACCEPTANCE CRITERIA:**
- [ ] Run `semgrep --config=p/typescript --config=p/owasp-top-ten --config=.github/semgrep.yml` — fix all HIGH and CRITICAL findings
- [ ] `.github/workflows/zap-scan.yml` — OWASP ZAP baseline scan against Vercel preview URL on every PR to prod
- [ ] Security headers in `next.config.ts`: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=(), Strict-Transport-Security with preload
- [ ] CSP: `default-src 'self'`; nonce-based `script-src`; no unsafe-eval or unsafe-inline for scripts
- [ ] `pnpm audit --audit-level=high` — zero findings

**SECURITY:** CSP uses nonces — no unsafe-eval. Deferred findings logged in sprint.md Tech Debt with justification.

**SPRINT.MD UPDATE:** S8-01 done → S8-02 active. Log deferred findings in Tech Debt.

---

## S8-02 — Load Test + Rate-Limit Tuning
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S8-02.

Check `apps/portal/package.json` before installing — add `@upstash/ratelimit@latest @upstash/redis@latest` if not present.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/portal/lib/rateLimit.ts` — sliding window rate limiter via @upstash/ratelimit
- [ ] Limits: /api/auth/* 10/min per IP; /api/profile/complete 5/hr per IP; /api/requests POST 20/hr per user; /api/payments/* 30/hr per user; /api/documents/*/download 60/hr per user; /api/admin/* 100/min per IP; /api/webhooks/* 200/min per IP
- [ ] 429 with `Retry-After` header
- [ ] `infra/loadtest/smoke.js` — k6: 10 VUs, 60s, /api/services + /api/requests; p95 < 500ms, zero 5xx
- [ ] `.env.example`: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

**SECURITY:** Sliding window — not fixed window. 429 body reveals nothing beyond Retry-After.

**SPRINT.MD UPDATE:** S8-02 done → S8-03 active.

---

## S8-03 — Observability: Sentry + OTel + Structured Logging
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S8-03.

Check package.json before installing — add `@sentry/nextjs@latest` in apps/portal; `@sentry/node@latest pino@latest` in apps/worker if not present.

**ACCEPTANCE CRITERIA:**
- [ ] Sentry SDK in apps/portal and apps/worker
- [ ] `beforeSend` hook strips from event breadcrumbs and extra: password, secondaryPassword, dpi, dpi_encrypted, authorization, cookie, token, secret, key
- [ ] Source maps uploaded to Sentry in CI (`.github/workflows/ci.yml` step) — not committed; deleted locally after upload
- [ ] OTel traces on: all API route handlers, all Supabase queries, all BullMQ job executions
- [ ] Pino structured JSON logging in worker: every job start/end/error with jobId, portalType, duration — no credentials
- [ ] `.env.example`: SENTRY_DSN, SENTRY_AUTH_TOKEN, OTEL_EXPORTER_ENDPOINT

**SECURITY:** PII scrubbing list exhaustive — reviewed in PR description. Source maps not committed.

**SPRINT.MD UPDATE:** S8-03 done → S8-04 active.

---

## S8-04 — Runbooks
> `/model haiku`

Read `sprint.md`. Confirm Active Story = S8-04. Documentation only — no code changes.

**ACCEPTANCE CRITERIA:**
- [ ] `infra/runbooks/incident-response.md` — data breach, payment gateway outage, worker crash loop, gov-portal credentials compromised
- [ ] `infra/runbooks/key-rotation.md` — NEXTAUTH_SECRET, HMAC_SECRET, Supabase Vault master key, gateway webhook secrets; how to re-encrypt existing DEKs
- [ ] `infra/runbooks/retention-verification.md` — verify 20-day cron ran, audit deleted documents, handle missed cron
- [ ] `infra/runbooks/backup-restore.md` — Supabase backup schedule, point-in-time restore, integrity verification

**SPRINT.MD UPDATE:** S8-04 done → S8-05 active.

---

## S8-05 — External Pen-Test Remediation (Placeholder)
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S8-05.

**Execute after external pen-test on staging.** Paste the pen-test findings report and instruct:
1. Triage each finding: Critical / High / Medium / Low
2. Fix all Critical and High in this PR
3. Log Medium/Low in sprint.md Tech Debt with remediation timeline
4. Re-run ZAP + semgrep after fixes to verify resolution

Branch: `feature/S8-05-pentest-remediation`

**SPRINT.MD UPDATE:** S8-05 done → S8-06 active.

---

## S8-06 — Promote dev → prod, Tag v1.0.0
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S8-06 and all S8-01 through S8-05 are in Completed.

**STEPS:**
1. Verify dev is ahead of prod and all CI checks are green
2. Open PR: dev → prod, title "release: v1.0.0 — Antecedentes Penales + Policiales"
3. PR body: full changelog (S1-01 through S8-05), `supabase db diff` output, rollback plan, pen-test resolution confirmation
4. After merge: `git tag -s v1.0.0 && git push origin v1.0.0`

**SECURITY:** Do not merge with any open Critical or High findings. Migration reviewed before merge.

**SPRINT.MD UPDATE:** S8-06 done. Sprint 8 complete. v1.0.0 shipped.

---

## S9-01 — RENAP Adapter Scaffold (Certificado de Nacimiento)
> `/model sonnet`

Read `sprint.md`. Confirm v1.0.0 is shipped. Active Story = S9-01. Sprint 9 (v2) begins.

ADL-009: scaffold only — real selectors/URLs are local.
Adapter registry at `apps/worker/src/adapters/index.ts` from S5-03.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/worker/src/adapters/renap/selectors.ts` — all values `'TODO'`
- [ ] `apps/worker/src/adapters/renap/steps.ts` — NavigationStep stubs: LOGIN_NAVIGATE, LOGIN_ASSERT_FORM, LOGIN_SUBMIT, ASSERT_DASHBOARD, NAVIGATE_CERTIFICATE_REQUEST, FILL_REQUEST_FORM, SUBMIT_REQUEST, ASSERT_CONFIRMATION, POLL_STATUS, DOWNLOAD_CERTIFICATE
- [ ] `apps/worker/src/adapters/renap/index.ts` — full try/catch/finally scaffold, `portalType = 'renap'`
- [ ] Registered in `apps/worker/src/adapters/index.ts`
- [ ] Feature flag: registry throws if `ENABLE_RENAP_ADAPTER !== 'true'` and renap job received
- [ ] SERVICE_CATALOG renap entry: available=true when flag is set (runtime check)
- [ ] Unit test: adapter registered; returns AdapterResult shape
- [ ] `.env.example`: ENABLE_RENAP_ADAPTER

**SECURITY:** Same as S5-03. Feature flag prevents premature enabling in prod.

**SPRINT.MD UPDATE:** S9-01 done → S9-02 active.

---

## S9-02 — MINEX Apostillado Adapter Scaffold
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S9-02.

ADL-009 applies. Same structure as S9-01 for MINEX.
Registry at `apps/worker/src/adapters/index.ts`.

**ACCEPTANCE CRITERIA:**
- [ ] `apps/worker/src/adapters/minex/selectors.ts` — all values `'TODO'`
- [ ] `apps/worker/src/adapters/minex/steps.ts` — NavigationStep stubs: LOGIN, ASSERT_DASHBOARD, NAVIGATE_APOSTILLE_REQUEST, SELECT_DOCUMENT_TYPE, UPLOAD_DOCUMENT, SUBMIT, ASSERT_CONFIRMATION, POLL_STATUS, DOWNLOAD_APOSTILLE
- [ ] `apps/worker/src/adapters/minex/index.ts` — same scaffold structure, `portalType = 'minex'`
- [ ] Feature flag: ENABLE_MINEX_ADAPTER — same pattern as S9-01
- [ ] Registered in `apps/worker/src/adapters/index.ts`
- [ ] Unit test: adapter registered
- [ ] `.env.example`: ENABLE_MINEX_ADAPTER

**SPRINT.MD UPDATE:** S9-02 done → S9-03 active.

---

## S9-03 — Multi-Step Request Chaining (RENAP → MINEX)
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S9-03.

**ACCEPTANCE CRITERIA:**
- [ ] New service_enum value: `apostillado_nacimiento`
- [ ] `packages/shared/src/contracts/requestChain.ts` — ChainedRequest: `{ steps: service_enum[], currentStep: number, parentRequestId: UUID }`; add to shared index
- [ ] Migration `015_request_chains.sql`: request_chains (id, parent_request_id, steps JSONB, current_step INT)
- [ ] Worker: on RENAP step completion, enqueues MINEX job with downloaded certificate as input; chain state in DB only — never in queue payload
- [ ] Client dashboard: chained request as single line item with sub-steps progress indicator
- [ ] Any step failure → entire chain moves to needs_manual_review

**SECURITY:**
- Each step uses credentials for its own portal only — never shared between steps
- Chain state in DB only

**SPRINT.MD UPDATE:** S9-03 done → S9-04 active.

---

## S9-04 — Feature Flag Rollout + v2 Hardening
> `/model sonnet`

Read `sprint.md`. Confirm Active Story = S9-04.

**ACCEPTANCE CRITERIA:**
- [ ] `.env.example`: ENABLE_RENAP_ADAPTER and ENABLE_MINEX_ADAPTER with clear enable instructions
- [ ] SERVICE_CATALOG: renap and minex available=true when respective flags are set
- [ ] Re-run `semgrep --config=p/typescript --config=p/owasp-top-ten` on v2 additions — fix all HIGH/CRITICAL
- [ ] `pnpm audit --audit-level=high` — zero findings
- [ ] k6 load test updated to include new RENAP/MINEX endpoints

**SPRINT.MD UPDATE:** S9-04 done → S9-05 active.

---

## S9-05 — Promote dev → prod, Tag v2.0.0
> `/model sonnet`

Read `sprint.md`. Confirm all S9-01 through S9-04 are in Completed.

**STEPS:**
1. Open PR: dev → prod, title "release: v2.0.0 — RENAP + MINEX Apostillado"
2. PR body: changelog (S9-01 through S9-04), migration dry-run, rollback plan, feature flag confirmation (both flags OFF in prod until explicit go/no-go)
3. After merge: `git tag -s v2.0.0 && git push origin v2.0.0`

**SPRINT.MD UPDATE:** v2.0.0 shipped. Full roadmap complete. Mark Sprint 9 done.
