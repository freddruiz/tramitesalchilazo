# Security Policy

## Threat Model

This platform handles sensitive Guatemalan PII (DPI numbers, legal documents, gov-portal credentials) and processes payments. See `sprint.md` Phase 1 Security Audit for the full threat register.

## Non-Negotiable Guardrails

1. **Validation:** Zod schemas at every boundary (HTTP, queue payloads, webhooks). No `any`. `.strict()` mode — reject unknown keys.
2. **Auth:** Auth.js + Supabase. 15-minute session rotation. Step-up (secondary password) for: payments, credential save, request creation, profile edits.
3. **CSRF:** Auth.js built-in double-submit + Origin header validation on all mutations.
4. **Encryption:**
   - At rest: AES-256-GCM with per-record DEK, KMS envelope.
   - In transit: TLS 1.3 only, HSTS preload.
   - Passwords: **Argon2id** (`memoryCost=64MB, timeCost=3, parallelism=4`). Never Bcrypt/PBKDF2/SHA-family.
5. **PII:** DPI stored as AES-256-GCM ciphertext + HMAC-SHA256 (for deterministic lookups). Plaintext never logged, never in URLs, never in error messages.
6. **Gov credentials:** Decrypted only in worker job scope; zeroed in `finally`. Worker container runs with `--cap-drop=ALL`, read-only rootfs, egress allowlist.
7. **Documents:** Signed S3 URLs with 5-min TTL + single-use token validation. `s3_key` never serialized to client. Response bodies for 403/404 byte-identical to prevent enumeration oracles.
8. **Rate limiting:** Redis sliding window — per IP, per user, per endpoint class.
9. **Secrets:** No secrets in code or committed env files. Vault/KMS pull at boot. Rotation every 90 days.
10. **Logging:** Structured JSON with PII-redaction allowlist. Sentry `beforeSend` strips `password`, `dpi`, `authorization`, `cookie`.
11. **Audit log:** Append-only with hash chain. Admin actions forwarded to immutable sink.
12. **Admin auth:** WebAuthn (passkeys) primary + TOTP fallback. No SMS 2FA. IP allowlist on `/api/admin/*`.
13. **CI gates (must pass to merge):** lint, typecheck, unit, integration, `semgrep`, `gitleaks`, `npm audit --audit-level=high`.
14. **Dependencies:** Exact-pinned (no `^`/`~`). Lockfile committed. `--frozen-lockfile` in CI. `ignore-scripts=true` with explicit allowlist.

## Reporting a Vulnerability

_(to be defined before launch — placeholder)_

Please email security@[tbd-domain] with details. We will acknowledge within 72 hours.
