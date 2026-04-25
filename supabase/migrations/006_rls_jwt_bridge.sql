-- Migration: RLS JWT bridge helper
-- Provides the set_app_current_user function called by createServerClient()
-- to populate app.current_user_id for RLS policies.
--
-- The Auth.js JWT bridge (lib/supabase/server.ts) also sets auth.uid() via
-- the JWT sub claim so existing policies using auth.uid() continue to work.

-- Function for setting the current user context within a session.
-- SECURITY DEFINER runs as the function owner (postgres) to allow set_config.
CREATE OR REPLACE FUNCTION set_app_current_user(p_user_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$;

REVOKE ALL ON FUNCTION set_app_current_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_app_current_user(uuid) TO authenticated;
