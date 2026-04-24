-- Migration 007: DPI profile completion + consent capture
-- Adds encrypted DPI storage, HMAC for deterministic lookup, secondary
-- password hash, and consent tracking fields.
--
-- Security: dpi_encrypted stores AES-256-GCM ciphertext (never plaintext).
-- dpi_hmac enables unique-check lookups without decrypting.
-- dek_wrapped stores the per-user DEK encrypted under the KMS master key.

-- ============================================================
-- Extend user_profiles with DPI + credential columns
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dpi_encrypted JSONB,
  ADD COLUMN IF NOT EXISTS dek_wrapped TEXT,
  ADD COLUMN IF NOT EXISTS dpi_hmac TEXT,
  ADD COLUMN IF NOT EXISTS secondary_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Remove placeholder defaults after column creation
ALTER TABLE public.user_profiles
  ALTER COLUMN full_name DROP DEFAULT;

-- Unique constraint on dpi_hmac enables duplicate-DPI detection at the DB
-- layer without ever exposing or comparing plaintext DPI values.
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_dpi_hmac_key;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_dpi_hmac_key UNIQUE (dpi_hmac);

-- ============================================================
-- Extend users with consent tracking
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS consent_version TEXT,
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;

-- ============================================================
-- RLS: users can only read/write their own profile
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;

CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));

-- ============================================================
-- updated_at trigger for user_profiles
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMENT ON COLUMN public.user_profiles.dpi_encrypted IS
  'AES-256-GCM envelope (JSON: ciphertext, iv, tag — all base64url). Plaintext DPI never stored.';
COMMENT ON COLUMN public.user_profiles.dek_wrapped IS
  'Per-user DEK wrapped (AES-256-GCM) under the KMS master key. JSON string.';
COMMENT ON COLUMN public.user_profiles.dpi_hmac IS
  'HMAC-SHA256(dpi, HMAC_SECRET) as hex. Used for duplicate detection only.';
COMMENT ON COLUMN public.users.consent_version IS
  'String version tag (e.g. "v1.0"). Version bump forces re-consent at next login.';
