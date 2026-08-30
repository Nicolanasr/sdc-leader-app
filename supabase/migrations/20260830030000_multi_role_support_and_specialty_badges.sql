-- Migration: Multi-Role Session Support & Specialty Badges Track
-- Date: 2026-08-30

-- 1. Add class_type to progression_classes for Specialty Badges support ('rank' vs 'specialty')
ALTER TABLE public.progression_classes 
ADD COLUMN IF NOT EXISTS class_type TEXT NOT NULL DEFAULT 'rank';

-- 2. Upgrade update_user_app_metadata trigger function to handle multi-role leaders
CREATE OR REPLACE FUNCTION public.update_user_app_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_primary_role TEXT;
  v_primary_scope TEXT;
  v_group_id UUID;
  v_troop_id UUID;
  v_all_roles TEXT[];
  v_all_scopes TEXT[];
  v_claims JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_profile_id := OLD.profile_id;
  ELSE
    v_profile_id := NEW.profile_id;
  END IF;

  -- Collect all active role names, scopes, group_id, and troop_id
  SELECT 
    array_agg(r.name),
    array_agg(r.permission_scope),
    max(ur.group_id),
    max(ur.troop_id)
  INTO 
    v_all_roles,
    v_all_scopes,
    v_group_id,
    v_troop_id
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.profile_id = v_profile_id;

  -- Determine primary role (prioritize chef_groupe > assistant > ka2ed_fer2a > amin_sandou2 > etc)
  IF v_all_scopes IS NOT NULL AND array_length(v_all_scopes, 1) > 0 THEN
    IF 'chef_groupe' = ANY(v_all_scopes) THEN
      v_primary_scope := 'chef_groupe';
    ELSIF 'assistant_chef_groupe' = ANY(v_all_scopes) THEN
      v_primary_scope := 'assistant_chef_groupe';
    ELSIF 'ka2ed_fer2a' = ANY(v_all_scopes) THEN
      v_primary_scope := 'ka2ed_fer2a';
    ELSIF 'mouse3ed_ka2ed_fer2a' = ANY(v_all_scopes) THEN
      v_primary_scope := 'mouse3ed_ka2ed_fer2a';
    ELSIF 'amin_serr_group' = ANY(v_all_scopes) THEN
      v_primary_scope := 'amin_serr_group';
    ELSIF 'amin_sandou2_group' = ANY(v_all_scopes) THEN
      v_primary_scope := 'amin_sandou2_group';
    ELSE
      v_primary_scope := v_all_scopes[1];
    END IF;

    v_primary_role := v_primary_scope;

    -- If a troop leader role exists, make sure troop_id is captured
    IF v_troop_id IS NULL THEN
      SELECT ur.troop_id INTO v_troop_id
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.profile_id = v_profile_id AND ur.troop_id IS NOT NULL
      LIMIT 1;
    END IF;

    v_claims := jsonb_build_object(
      'role', v_primary_role,
      'role_scope', v_primary_scope,
      'roles', to_jsonb(v_all_roles),
      'role_scopes', to_jsonb(v_all_scopes),
      'group_id', v_group_id,
      'troop_id', v_troop_id
    );
  ELSE
    v_claims := jsonb_build_object(
      'role', NULL,
      'role_scope', NULL,
      'roles', '[]'::jsonb,
      'role_scopes', '[]'::jsonb,
      'group_id', NULL,
      'troop_id', NULL
    );
  END IF;

  -- Update auth.users raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || v_claims
  WHERE id = v_profile_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
