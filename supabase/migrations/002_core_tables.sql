-- Migration 002: Core application tables
-- All PII columns use BYTEA (AES-256-GCM ciphertext) — plaintext never stored.
-- Decryption happens exclusively inside the worker process scope.

-- ============================================================
-- ENUMERATIONS
-- ============================================================

CREATE TYPE public.user_role_enum AS ENUM (
  'client',
  'admin'
);

CREATE TYPE public.kyc_status_enum AS ENUM (
  'pending',
  'verified',
  'rejected'
);

-- gov_portal_enum: identifies which government portal a credential or request targets
CREATE TYPE public.gov_portal_enum AS ENUM (
  'antecedentes_penales',
  'antecedentes_policiales',
  'renap',
  'minex'
);

-- service_enum: mirrors gov_portal_enum — one service per portal (extensible later)
CREATE TYPE public.service_enum AS ENUM (
  'antecedentes_penales',
  'antecedentes_policiales',
  'renap',
  'minex'
);

CREATE TYPE public.request_status_enum AS ENUM (
  'pending_payment',
  'queued',
  'in_progress',
  'completed',
  'failed',
  'expired',
  'needs_manual_review'
);

CREATE TYPE public.payment_method_enum AS ENUM (
  'card',
  'bank_transfer'
);

CREATE TYPE public.payment_status_enum AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- users
-- Mirrors auth.users; synchronized via trigger on auth.users INSERT.
-- role controls coarse-grained RBAC; fine-grained access enforced by RLS.
-- ============================================================

CREATE TABLE public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL UNIQUE,
  role        public.user_role_enum NOT NULL DEFAULT 'client',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync new auth.users rows into public.users automatically
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- user_profiles
-- PII stored as AES-256-GCM ciphertext (BYTEA). Plaintext never persisted.
-- dpi_hmac enables O(1) duplicate-DPI lookup without decrypting.
-- ============================================================

CREATE TABLE public.user_profiles (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Encrypted PII (BYTEA = AES-256-GCM ciphertext; never store plaintext)
  full_name_encrypted     BYTEA,                   -- ciphertext of full legal name
  dpi_encrypted           BYTEA,                   -- ciphertext of Guatemala DPI (CUI)
  phone_encrypted         BYTEA,                   -- ciphertext of phone number

  dpi_hmac                TEXT,                    -- HMAC-SHA256 hex for deduplication lookups
  dek_id                  TEXT,                    -- KMS-wrapped DEK identifier for this user's PII

  secondary_password_hash TEXT,                    -- Argon2id hash for step-up auth
  kyc_status              public.kyc_status_enum  NOT NULL DEFAULT 'pending',
  consent_captured_at     TIMESTAMPTZ,             -- timestamp of TOS/privacy acceptance
  consent_ip_address      INET,                    -- client IP at consent time

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_profiles_user_id_idx ON public.user_profiles (user_id);
CREATE INDEX user_profiles_dpi_hmac_idx ON public.user_profiles (dpi_hmac) WHERE dpi_hmac IS NOT NULL;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- external_credentials
-- Per-user, per-portal encrypted gov portal credentials.
-- BYTEA columns contain AES-256-GCM ciphertext ONLY — never plaintext.
-- Decryption is performed exclusively inside the Playwright worker job scope
-- and zeroed in the finally block (see ADL-003).
-- ============================================================

CREATE TABLE public.external_credentials (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  portal              public.gov_portal_enum NOT NULL,

  -- BYTEA: AES-256-GCM ciphertext — plaintext credentials NEVER stored
  username_encrypted  BYTEA           NOT NULL,    -- ciphertext of portal username
  password_encrypted  BYTEA           NOT NULL,    -- ciphertext of portal password

  dek_id              TEXT            NOT NULL,    -- KMS-wrapped DEK identifier
  last_verified_at    TIMESTAMPTZ,                 -- last successful credential verification by worker

  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),

  UNIQUE (user_id, portal)
);

CREATE INDEX external_credentials_user_id_idx ON public.external_credentials (user_id);

CREATE TRIGGER external_credentials_updated_at
  BEFORE UPDATE ON public.external_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- service_requests
-- Lifecycle managed by worker; clients may INSERT (pending_payment only)
-- and SELECT own rows. Status transitions are service_role-only.
-- ============================================================

CREATE TABLE public.service_requests (
  id              UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID                        NOT NULL REFERENCES public.users(id),
  service         public.service_enum         NOT NULL,
  status          public.request_status_enum  NOT NULL DEFAULT 'pending_payment',
  metadata        JSONB                       NOT NULL DEFAULT '{}',  -- non-PII params only
  worker_job_id   TEXT,                                               -- BullMQ job id
  error_message   TEXT,                                               -- last worker error (needs_manual_review)
  expires_at      TIMESTAMPTZ,                                        -- set to now()+20d on completion
  created_at      TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ                 NOT NULL DEFAULT now()
);

CREATE INDEX service_requests_user_id_idx ON public.service_requests (user_id);
CREATE INDEX service_requests_status_idx ON public.service_requests (status);
CREATE INDEX service_requests_worker_job_id_idx ON public.service_requests (worker_job_id) WHERE worker_job_id IS NOT NULL;

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- documents
-- Completed documents stored in Supabase Storage; hard-deleted after 20 days.
-- Access restricted via service_requests join (no direct SELECT by request_id alone).
-- ============================================================

CREATE TABLE public.documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID        NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  storage_path    TEXT        NOT NULL,            -- Supabase Storage object path
  storage_bucket  TEXT        NOT NULL DEFAULT 'documents',
  mime_type       TEXT        NOT NULL DEFAULT 'application/pdf',
  size_bytes      BIGINT,
  expires_at      TIMESTAMPTZ NOT NULL,            -- hard delete after 20 days (retention cron)
  dispatched_at   TIMESTAMPTZ,                     -- set when email was dispatched to client
  download_count  INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX documents_request_id_idx ON public.documents (request_id);
CREATE INDEX documents_expires_at_idx ON public.documents (expires_at);

-- ============================================================
-- payments
-- Amount is always server-computed; amount_cents from client is NEVER trusted.
-- provider_event_id UNIQUE enforces webhook idempotency.
-- ============================================================

CREATE TABLE public.payments (
  id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID                        NOT NULL REFERENCES public.service_requests(id),
  user_id             UUID                        NOT NULL REFERENCES public.users(id),
  amount_cents        INTEGER                     NOT NULL CHECK (amount_cents > 0),  -- server-authoritative
  currency            TEXT                        NOT NULL DEFAULT 'GTQ',
  method              public.payment_method_enum  NOT NULL,
  status              public.payment_status_enum  NOT NULL DEFAULT 'pending',
  provider            TEXT                        NOT NULL,  -- recurrente | neonet | visanet | stripe | bank_transfer
  provider_tx_id      TEXT,                                  -- external transaction reference
  provider_event_id   TEXT                        UNIQUE,    -- webhook event id (idempotency key)
  bank_proof_path     TEXT,                                  -- Storage path for manual bank transfer proof
  metadata            JSONB                       NOT NULL DEFAULT '{}',  -- normalized provider event payload
  created_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT now()
);

CREATE INDEX payments_request_id_idx ON public.payments (request_id);
CREATE INDEX payments_user_id_idx ON public.payments (user_id);
CREATE INDEX payments_status_idx ON public.payments (status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- audit_log
-- Append-only hash-chained audit trail. No UPDATE or DELETE ever.
-- INSERT granted to service_role only (see migration 004).
-- ============================================================

CREATE TABLE public.audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,  -- null for system events
  actor_role  TEXT,
  action      TEXT        NOT NULL,   -- e.g. 'request.status_changed', 'payment.completed'
  entity      TEXT        NOT NULL,   -- table being affected
  entity_id   UUID,
  changes     JSONB,                  -- {before: {...}, after: {...}} diff payload
  hash        TEXT        NOT NULL,   -- HMAC-SHA256 of (id || action || entity || entity_id || changes || prev_hash)
  prev_hash   TEXT,                   -- hash of the preceding audit_log row (hash chain)
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intentionally no updated_at — audit_log rows are immutable after INSERT
CREATE INDEX audit_log_actor_id_idx ON public.audit_log (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX audit_log_entity_idx ON public.audit_log (entity, entity_id);
CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at);
