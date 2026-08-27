-- Migration: Fix Metadata RLS policies and sync existing claims
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Drop old metadata policies
DROP POLICY IF EXISTS "Configurators can manage ranks" ON public.ranks;
DROP POLICY IF EXISTS "Configurators can manage responsibilities" ON public.responsibilities;

-- 2. Re-create updated policies checking both role_scope and role claims for fallback compatibility
CREATE POLICY "Configurators can manage ranks" ON public.ranks 
    FOR ALL USING (
        coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope', ''), '') = 'configurator'
        OR coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''), '') = 'configurator'
    );

CREATE POLICY "Configurators can manage responsibilities" ON public.responsibilities 
    FOR ALL USING (
        coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role_scope', ''), '') = 'configurator'
        OR coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''), '') = 'configurator'
    );

-- 3. Synchronize existing auth app_metadata claims for all users in auth.users
-- This propagates role_scope, role, group_id, and troop_id retroactively
UPDATE auth.users u
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', r.name,
    'role_scope', r.permission_scope,
    'group_id', ur.group_id,
    'troop_id', ur.troop_id
)
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
WHERE ur.profile_id = u.id;
