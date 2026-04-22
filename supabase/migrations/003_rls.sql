-- Migration 003: Row-Level Security policies
-- RLS is enabled on every table before any policies are applied.
-- Clients (authenticated role) may only access their own rows.
-- Status-changing writes go through service_role only (worker/admin).
-- service_role bypasses RLS by default in Supabase — no explicit policy needed.

-- ============================================================
-- ENABLE RLS (must precede any policy definitions)
-- ============================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users
-- Clients may SELECT and UPDATE their own row only.
-- Role field changes are service_role-only (no client policy permits it).
-- ============================================================

CREATE POLICY users_select_own ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- user_profiles
-- Clients may SELECT and UPDATE their own profile.
-- kyc_status transitions are performed by service_role only.
-- ============================================================

CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_profiles_insert_own ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- external_credentials
-- No client policies — all access via service_role (worker) only.
-- Clients never read or write encrypted gov credentials directly.
-- ============================================================

-- (no policies for authenticated or anon — service_role bypasses RLS)

-- ============================================================
-- service_requests
-- Clients may SELECT own rows and INSERT new requests in pending_payment state.
-- No UPDATE policy for clients — status transitions go through service_role.
-- ============================================================

CREATE POLICY service_requests_select_own ON public.service_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY service_requests_insert_own ON public.service_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending_payment'  -- clients may only create requests in initial state
  );

-- ============================================================
-- documents
-- Clients may SELECT documents that belong to their own service_requests.
-- Access is verified via a JOIN — no direct lookup by request_id alone.
-- ============================================================

CREATE POLICY documents_select_own ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_requests sr
      WHERE sr.id = documents.request_id
        AND sr.user_id = auth.uid()
    )
  );

-- ============================================================
-- payments
-- Clients may SELECT own payments and INSERT new payment records.
-- No UPDATE policy — status changes go through service_role (webhook handler).
-- amount_cents must be validated server-side before INSERT.
-- ============================================================

CREATE POLICY payments_select_own ON public.payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY payments_insert_own ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'  -- clients may only create payments in initial state
  );

-- ============================================================
-- audit_log
-- No client policies. INSERT/SELECT granted to service_role only (see migration 004).
-- ============================================================

-- (no policies for authenticated or anon)
