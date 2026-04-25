-- S4-01: Payments table with method + status enums and idempotency guarantee

CREATE TYPE payment_method AS ENUM (
  'recurrente',
  'neonet',
  'visanet',
  'stripe',
  'bank_transfer'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'refunded'
);

CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES service_requests(id) ON DELETE RESTRICT,
  method                payment_method NOT NULL,
  status                payment_status NOT NULL DEFAULT 'pending',
  amount_cents          INTEGER NOT NULL CHECK (amount_cents > 0),
  idempotency_key       TEXT NOT NULL,
  transfer_proof_s3_key TEXT,
  verified_by           UUID REFERENCES auth.users(id),
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevents duplicate payment attempts for the same logical operation
CREATE UNIQUE INDEX payments_idempotency_key_unique ON payments (idempotency_key);

-- RLS: users can only see payments linked to their own requests
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_owner_select ON payments
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM service_requests WHERE user_id = auth.uid()
    )
  );

-- Inserts and status updates happen only via supabaseAdmin (service role bypasses RLS)

CREATE INDEX idx_payments_request_id ON payments (request_id);
CREATE INDEX idx_payments_status ON payments (status);
