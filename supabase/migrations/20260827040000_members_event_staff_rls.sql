-- Migration: Grant full group member select access to all leaders in the group for event rosters
DROP POLICY IF EXISTS "Chef de Groupe and general group leaders read access (excl medical)" ON public.members;
DROP POLICY IF EXISTS "Group leaders read access to group members" ON public.members;

CREATE POLICY "Group leaders read access to group members" ON public.members
    FOR SELECT USING (
        group_id = get_auth_group_id()
    );

-- Ensure all troops in group are readable by any leader in the group
DROP POLICY IF EXISTS "Group leaders select troops" ON public.troops;
CREATE POLICY "Group leaders select troops" ON public.troops
    FOR SELECT USING (
        group_id = get_auth_group_id()
    );
