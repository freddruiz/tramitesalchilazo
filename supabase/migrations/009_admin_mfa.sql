-- Migration 009: Admin WebAuthn credentials, TOTP secrets, challenge store
-- Covers S2-05: Admin passkeys + TOTP fallback + IP-allowlist infrastructure

-- ============================================================
-- admin_webauthn_credentials: per-admin passkey credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_webauthn_credentials (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id   TEXT         NOT NULL,
  public_key      TEXT         NOT NULL,  -- isoBase64URL-encoded CBOR public key
  counter         BIGINT       NOT NULL DEFAULT 0,
  device_type     TEXT         CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up       BOOLEAN      NOT NULL DEFAULT FALSE,
  transports      TEXT[],
  friendly_name   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ,
  UNIQUE(credential_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_webauthn_user_id
  ON public.admin_webauthn_credentials(user_id);

ALTER TABLE public.admin_webauthn_credentials ENABLE ROW LEVEL SECURITY;
-- All access is via service_role only — no client-facing policies.
REVOKE ALL ON public.admin_webauthn_credentials FROM authenticated;

-- ============================================================
-- admin_totp_secrets: encrypted TOTP secret per admin (one per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_totp_secrets (
  id               UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID   NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  secret_envelope  JSONB  NOT NULL,  -- {ciphertext, iv, tag} from AES-256-GCM
  backup_codes     JSONB  NOT NULL DEFAULT '[]',  -- [{hash: string, used: boolean}]
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_totp_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_totp_secrets FROM authenticated;

-- ============================================================
-- admin_webauthn_challenges: short-lived challenge store (5-min TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_webauthn_challenges (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge   TEXT         NOT NULL,
  type        TEXT         NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at  TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_webauthn_challenges_user
  ON public.admin_webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_webauthn_challenges_expires
  ON public.admin_webauthn_challenges(expires_at);

ALTER TABLE public.admin_webauthn_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_webauthn_challenges FROM authenticated;
