-- Migration: Redefine get_auth_role helper for backwards compatibility
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- Redefine get_auth_role helper to look at role_scope and fallback to role
-- This ensures existing sessions/tokens without a refreshed role_scope are fully authorized.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''),
    'guest'
  );
$$ LANGUAGE sql STABLE;
