-- Migration: Dynamic Metadata & Permission Scoping
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Create public.ranks table
CREATE TABLE public.ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create public.responsibilities table
CREATE TABLE public.responsibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Modify public.roles to add permission_scope column
-- We seed it with standard permission values. Allowed scopes check constraint ensures security.
ALTER TABLE public.roles ADD COLUMN permission_scope TEXT NOT NULL DEFAULT 'chef_groupe'
    CONSTRAINT check_permission_scope CHECK (permission_scope IN (
        'configurator',
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'amin_sandou2_group',
        'amin_tejhizet_group',
        'mas2oul_toswir',
        'mas2oul_mounet',
        'ka2ed_idare',
        'ka2ed_fer2a',
        'mouse3ed_ka2ed_fer2a'
    ));

-- 4. Enable RLS on new metadata tables
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibilities ENABLE ROW LEVEL SECURITY;

-- 5. Open Read Access RLS Policies for ranks & responsibilities
CREATE POLICY "Anyone can select ranks" ON public.ranks FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Configurators can manage ranks" ON public.ranks FOR ALL USING (
    coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope', ''), 'guest') = 'configurator'
);

CREATE POLICY "Anyone can select responsibilities" ON public.responsibilities FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Configurators can manage responsibilities" ON public.responsibilities FOR ALL USING (
    coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope', ''), 'guest') = 'configurator'
);

-- 6. Rewrite handle_user_role_change trigger function to propagate role_scope
CREATE OR REPLACE FUNCTION public.handle_user_role_change()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_role_name TEXT;
  v_role_scope TEXT;
  v_group_id UUID;
  v_troop_id UUID;
  v_claims JSONB;
BEGIN
  -- Determine which profile ID is affected
  IF TG_OP = 'DELETE' THEN
    v_profile_id := OLD.profile_id;
  ELSE
    v_profile_id := NEW.profile_id;
  END IF;

  -- Fetch the latest active role, scope and boundaries
  SELECT r.name, r.permission_scope, ur.group_id, ur.troop_id
  INTO v_role_name, v_role_scope, v_group_id, v_troop_id
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.profile_id = v_profile_id
  ORDER BY ur.id DESC
  LIMIT 1;

  -- Build claims JSONB block
  IF v_role_name IS NOT NULL THEN
    v_claims := jsonb_build_object(
      'role', v_role_name,
      'role_scope', v_role_scope,
      'group_id', v_group_id,
      'troop_id', v_troop_id
    );
  ELSE
    v_claims := jsonb_build_object(
      'role', NULL,
      'role_scope', NULL,
      'group_id', NULL,
      'troop_id', NULL
    );
  END IF;

  -- Update auth.users metadata securely
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || v_claims
  WHERE id = v_profile_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update get_auth_role() helper to look up role_scope instead of role name
-- This ensures all existing RLS policies mapped to roles now inspect their permission scopes dynamically.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope', ''), 'guest');
$$ LANGUAGE sql STABLE;

-- 8. Add trigger function and trigger to automatically create "Global" troop when a group is added
CREATE OR REPLACE FUNCTION public.handle_new_group_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.troops (group_id, name, section_type_id)
  VALUES (NEW.id, 'Global', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_group_created
AFTER INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.handle_new_group_created();
