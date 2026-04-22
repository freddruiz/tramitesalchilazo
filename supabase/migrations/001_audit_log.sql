-- Append-only audit log with hash chain for tamper detection
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_hash TEXT,
  user_agent TEXT,
  metadata JSONB,
  prev_hash TEXT,
  curr_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Grant INSERT-only to authenticated and service_role
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_insert" ON audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "service_role_insert" ON audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Explicitly revoke UPDATE, DELETE, TRUNCATE
REVOKE UPDATE ON audit_log FROM authenticated;
REVOKE DELETE ON audit_log FROM authenticated;
REVOKE TRUNCATE ON audit_log FROM authenticated;
REVOKE UPDATE ON audit_log FROM service_role;
REVOKE DELETE ON audit_log FROM service_role;
REVOKE TRUNCATE ON audit_log FROM service_role;
