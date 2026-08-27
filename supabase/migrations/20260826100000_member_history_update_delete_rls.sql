-- Migration: Member History Update & Delete RLS Policies
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Allow Group Administrators to UPDATE member_history entries
CREATE POLICY "Group administrators can update member history" ON public.member_history
    FOR UPDATE USING (
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

-- 2. Allow Group Administrators to DELETE member_history entries
CREATE POLICY "Group administrators can delete member history" ON public.member_history
    FOR DELETE USING (
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

-- 3. Allow Troop Leaders to UPDATE member_history entries for their troop
CREATE POLICY "Troop leaders can update troop member history" ON public.member_history
    FOR UPDATE USING (
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

-- 4. Allow Troop Leaders to DELETE member_history entries for their troop
CREATE POLICY "Troop leaders can delete troop member history" ON public.member_history
    FOR DELETE USING (
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
