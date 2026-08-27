-- Migration: Patrol Management & Member History Write Permissions
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Grant INSERT permissions on member_history to Group Administrators
CREATE POLICY "Group administrators can insert member history" ON public.member_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_history.member_id
            AND is_in_auth_group(m.group_id)
            AND (
                has_auth_role_scope('chef_groupe')
                OR has_auth_role_scope('assistant_chef_groupe')
                OR has_auth_role_scope('amin_serr_group')
                OR has_auth_role_scope('configurator')
            )
        )
    );

-- 2. Grant INSERT permissions on member_history to Troop Leaders
CREATE POLICY "Troop leaders can insert troop member history" ON public.member_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_history.member_id
            AND is_in_auth_troop(m.troop_id)
            AND (
                has_auth_role_scope('ka2ed_fer2a')
                OR has_auth_role_scope('mouse3ed_ka2ed_fer2a')
            )
        )
    );

-- 3. Drop older, restricted policy on patrols table
DROP POLICY IF EXISTS "Group leader and secretary can manage patrols" ON public.patrols;

-- 4. Create unified policy allowing Group Administrators full CRUD access to patrols
CREATE POLICY "Group administrators full access to patrols" ON public.patrols
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.troops t
            WHERE t.id = patrols.troop_id
            AND is_in_auth_group(t.group_id)
        )
        AND (
            has_auth_role_scope('chef_groupe')
            OR has_auth_role_scope('assistant_chef_groupe')
            OR has_auth_role_scope('amin_serr_group')
            OR has_auth_role_scope('configurator')
        )
    );

-- 5. Create policy allowing Troop Leaders full CRUD access to patrols of their troop unit
CREATE POLICY "Troop leaders full access to troop patrols" ON public.patrols
    FOR ALL USING (
        is_in_auth_troop(troop_id)
        AND (
            has_auth_role_scope('ka2ed_fer2a')
            OR has_auth_role_scope('mouse3ed_ka2ed_fer2a')
        )
    );
