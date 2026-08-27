-- Migration: Consolidate Group Administrator Roster Permissions
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Drop older, separate policies on members table
DROP POLICY IF EXISTS "Secretary full group roster access" ON public.members;
DROP POLICY IF EXISTS "Group leaders full group roster access" ON public.members;
DROP POLICY IF EXISTS "Chef de Groupe and assistants full group roster access" ON public.members;

-- 2. Create a unified full access policy for all Group Administrators
-- (Group Leader, Assistant Group Leader, Secretary, and Configurator)
CREATE POLICY "Group administrators full group roster access" ON public.members
    FOR ALL USING (
        is_in_auth_group(group_id)
        AND (
            has_auth_role_scope('chef_groupe')
            OR has_auth_role_scope('assistant_chef_groupe')
            OR has_auth_role_scope('amin_serr_group')
            OR has_auth_role_scope('configurator')
        )
    );
