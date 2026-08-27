-- Migration: Force Sync All User Claims from roles table
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- Update auth.users metadata for all users with their active role definitions.
-- This ensures any outdated role scopes (like configurator stuck on chef_groupe) are corrected.
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
)
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.profile_id = u.id
);
