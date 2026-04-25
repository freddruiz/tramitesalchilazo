-- S3-02: Service requests table with state machine CHECK constraint
-- Allowed status values mirror RequestStatus enum in requestStateMachine.ts

CREATE TYPE request_status AS ENUM (
  'pending_payment',
  'queued',
  'in_progress',
  'completed',
  'failed',
  'needs_manual_review'
);

CREATE TABLE IF NOT EXISTS service_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id    TEXT NOT NULL,
  status        request_status NOT NULL DEFAULT 'pending_payment',
  price_gtq     NUMERIC(10, 2) NOT NULL CHECK (price_gtq > 0),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only valid status transitions are enforced at the application layer (requestStateMachine.ts).
-- The CHECK constraint below enforces the allowed enum values at the DB layer as a second line of defense.
ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_status_valid
  CHECK (status IN (
    'pending_payment',
    'queued',
    'in_progress',
    'completed',
    'failed',
    'needs_manual_review'
  ));

-- RLS: users can only see their own requests
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_requests_owner_select ON service_requests
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY service_requests_owner_insert ON service_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins and server-side code use service role key (bypasses RLS)
-- Status updates happen only via supabaseAdmin (server-side), never from client

CREATE INDEX idx_service_requests_user_id ON service_requests (user_id);
CREATE INDEX idx_service_requests_status ON service_requests (status);
