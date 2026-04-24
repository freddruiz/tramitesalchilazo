-- Migration 008: Step-up auth tracking + audit_log table
--
-- 1. Creates audit_log (IF NOT EXISTS — may have been applied from S1-03 on a
--    parallel branch; IF NOT EXISTS makes this idempotent).
-- 2. Adds failed_step_up_attempts + step_up_locked_until to user_profiles so
--    that lockout state survives session refreshes (stored in DB, not JWT).

-- ============================================================
-- audit_log: append-only, INSERT-only via RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGSERIAL    PRIMARY KEY,
  actor_id    UUID,
  action      TEXT         NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_hash     TEXT,
  user_agent  TEXT,
  metadata    JSONB,
  prev_hash   TEXT,
  curr_hash   TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and service_role to INSERT only.
-- UPDATE / DELETE / TRUNCATE are revoked to preserve append-only semantics.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log' AND policyname = 'audit_authenticated_insert'
  ) THEN
    CREATE POLICY audit_authenticated_insert ON public.audit_log
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log' AND policyname = 'audit_service_role_insert'
  ) THEN
    CREATE POLICY audit_service_role_insert ON public.audit_log
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

REVOKE UPDATE    ON public.audit_log FROM authenticated;
REVOKE DELETE    ON public.audit_log FROM authenticated;
REVOKE TRUNCATE  ON public.audit_log FROM authenticated;
REVOKE UPDATE    ON public.audit_log FROM service_role;
REVOKE DELETE    ON public.audit_log FROM service_role;
REVOKE TRUNCATE  ON public.audit_log FROM service_role;

-- ============================================================
-- user_profiles: step-up lockout tracking
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS failed_step_up_attempts INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step_up_locked_until     TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.failed_step_up_attempts IS
  'Consecutive failed step-up attempts since last success. Reset to 0 on success.';
COMMENT ON COLUMN public.user_profiles.step_up_locked_until IS
  'When set and in the future, step-up is locked. Cleared on successful verification.';
