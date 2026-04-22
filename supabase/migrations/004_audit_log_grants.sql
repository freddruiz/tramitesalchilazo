-- Migration 004: Audit log access control
-- Enforces append-only semantics on audit_log.
-- Only service_role may INSERT. No client or anon access whatsoever.
-- service_role bypasses RLS in Supabase, so no explicit policy is needed —
-- this migration revokes residual privileges from the default roles to be explicit.

-- ============================================================
-- Revoke all direct access from non-service roles
-- ============================================================

REVOKE ALL PRIVILEGES ON public.audit_log FROM anon;
REVOKE ALL PRIVILEGES ON public.audit_log FROM authenticated;

-- ============================================================
-- Confirm: service_role retains full access via RLS bypass
-- The application worker MUST use SUPABASE_SERVICE_ROLE_KEY when
-- writing audit entries. The NEXT_PUBLIC_SUPABASE_ANON_KEY (client-side)
-- must never be used for audit writes.
-- ============================================================

-- Sequence access (for gen_random_uuid() is extension-based, no sequence needed)
-- If any serial columns are added in future, grant sequence usage to service_role only.

-- ============================================================
-- Integrity comment: append-only contract
-- No UPDATE or DELETE is ever permitted on audit_log by any role.
-- This is enforced by:
--   1. RLS enabled with no UPDATE/DELETE policies (migration 003)
--   2. Explicit privilege revocation above
--   3. Application-layer convention: audit_log rows are written once and never modified
-- ============================================================

COMMENT ON TABLE public.audit_log IS
  'Append-only hash-chained audit trail. '
  'INSERT: service_role only (application worker via SUPABASE_SERVICE_ROLE_KEY). '
  'UPDATE/DELETE: prohibited for all roles. '
  'Hash chain integrity verified by audit service on read.';
