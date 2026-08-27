-- Migration: Multi-Role and Multi-Responsibility Systems
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Create join table public.profile_responsibilities
CREATE TABLE public.profile_responsibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    responsibility_id UUID REFERENCES public.responsibilities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id, responsibility_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profile_responsibilities ENABLE ROW LEVEL SECURITY;

-- 3. Define new RLS Helpers to inspect JSONB arrays inside JWT app_metadata
CREATE OR REPLACE FUNCTION public.has_auth_role_scope(scope TEXT)
RETURNS BOOLEAN AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'role_scopes' ? scope,
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope' = scope,
    false
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_in_auth_group(g_id UUID)
RETURNS BOOLEAN AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'group_ids' ? g_id::text,
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'group_id' = g_id::text,
    false
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_in_auth_troop(t_id UUID)
RETURNS BOOLEAN AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'troop_ids' ? t_id::text,
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'troop_id' = t_id::text,
    false
  );
$$ LANGUAGE sql STABLE;

-- 4. Define RLS Policies for public.profile_responsibilities
CREATE POLICY "Anyone authenticated can select responsibilities mapping" ON public.profile_responsibilities 
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Group leaders can manage responsibilities mapping" ON public.profile_responsibilities 
    FOR ALL USING (
        has_auth_role_scope('chef_groupe') 
        OR has_auth_role_scope('amin_serr_group')
        OR has_auth_role_scope('configurator')
    );

-- 5. Rewrite handle_user_role_change trigger function to aggregate arrays in custom claims
-- Generates roles, role_scopes, group_ids, and troop_ids arrays, plus singular items for fallback compatibility
CREATE OR REPLACE FUNCTION public.handle_user_role_change()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_role_names JSONB;
  v_role_scopes JSONB;
  v_group_ids JSONB;
  v_troop_ids JSONB;
  v_claims JSONB;
BEGIN
  -- Determine which profile ID is affected
  IF TG_OP = 'DELETE' THEN
    v_profile_id := OLD.profile_id;
  ELSE
    v_profile_id := NEW.profile_id;
  END IF;

  -- Aggregate active role scopes and boundaries
  SELECT 
    coalesce(jsonb_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]'::jsonb),
    coalesce(jsonb_agg(r.permission_scope) FILTER (WHERE r.permission_scope IS NOT NULL), '[]'::jsonb),
    coalesce(jsonb_agg(ur.group_id) FILTER (WHERE ur.group_id IS NOT NULL), '[]'::jsonb),
    coalesce(jsonb_agg(ur.troop_id) FILTER (WHERE ur.troop_id IS NOT NULL), '[]'::jsonb)
  INTO v_role_names, v_role_scopes, v_group_ids, v_troop_ids
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.profile_id = v_profile_id;

  -- Build claims block. Maps arrays, and fallbacks to index 0 for singular policy compatibility
  v_claims := jsonb_build_object(
    'roles', v_role_names,
    'role_scopes', v_role_scopes,
    'group_ids', v_group_ids,
    'troop_ids', v_troop_ids,
    'role', v_role_names ->> 0,
    'role_scope', v_role_scopes ->> 0,
    'group_id', v_group_ids ->> 0,
    'troop_id', v_troop_ids ->> 0
  );

  -- Update auth.users metadata securely
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || v_claims
  WHERE id = v_profile_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-run claims sync for all existing users to populate arrays
UPDATE auth.users u
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || (
  SELECT jsonb_build_object(
    'roles', jsonb_agg(r.name),
    'role_scopes', jsonb_agg(r.permission_scope),
    'group_ids', jsonb_agg(ur.group_id),
    'troop_ids', jsonb_agg(ur.troop_id),
    'role', (jsonb_agg(r.name)) ->> 0,
    'role_scope', (jsonb_agg(r.permission_scope)) ->> 0,
    'group_id', (jsonb_agg(ur.group_id)) ->> 0,
    'troop_id', (jsonb_agg(ur.troop_id)) ->> 0
  )
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.profile_id = u.id
);
