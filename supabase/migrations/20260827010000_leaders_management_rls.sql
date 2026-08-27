-- Migration: Ensure full management access for group admins on user_roles and profiles
DROP POLICY IF EXISTS "Chef de groupe manage roles in group" ON public.user_roles;

CREATE POLICY "Group admins manage roles in group" ON public.user_roles 
    FOR ALL USING (
        (
            has_auth_role_scope('chef_groupe') 
            OR has_auth_role_scope('assistant_chef_groupe')
            OR has_auth_role_scope('amin_serr_group')
            OR has_auth_role_scope('configurator')
        )
        AND group_id = get_auth_group_id()
    );

DROP POLICY IF EXISTS "Chef de groupe manage profiles in group" ON public.profiles;

CREATE POLICY "Group admins manage profiles in group" ON public.profiles
    FOR ALL USING (
        (
            has_auth_role_scope('chef_groupe') 
            OR has_auth_role_scope('assistant_chef_groupe')
            OR has_auth_role_scope('amin_serr_group')
            OR has_auth_role_scope('configurator')
        )
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = public.profiles.id
              AND ur.group_id = get_auth_group_id()
        )
    );
