-- Migration: Scout Member Access Control & Scoped Policies
-- Date: 2026-09-22
-- Author: Scouts des Cèdres Manager

-- 1. Ensure 'scout_member' role exists in roles table
INSERT INTO public.roles (name, permission_scope)
VALUES ('scout_member', 'scout_member')
ON CONFLICT (name) DO UPDATE SET permission_scope = 'scout_member';

-- 2. Allow Scout Members to view strictly their own record in public.members
DROP POLICY IF EXISTS "Scout members can view own profile" ON public.members;
CREATE POLICY "Scout members can view own profile"
ON public.members
FOR SELECT
TO authenticated
USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
    OR id IN (
        SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

-- 3. Allow Scout Members to view strictly their own attendance records
DROP POLICY IF EXISTS "Scout members can view own attendance" ON public.attendance_records;
CREATE POLICY "Scout members can view own attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
    member_id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
    OR member_id IN (
        SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

-- 4. Allow Scout Members to view only events where they are enrolled as participant or staff
DROP POLICY IF EXISTS "Scout members can view assigned events" ON public.events;
CREATE POLICY "Scout members can view assigned events"
ON public.events
FOR SELECT
TO authenticated
USING (
    -- Group leaders and staff can see group events
    (auth.jwt() -> 'app_metadata' ->> 'role') != 'scout_member'
    -- Scout members can only see events where they are registered or on staff
    OR id IN (
        SELECT ep.event_id FROM public.event_participants ep
        WHERE ep.member_id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
           OR ep.member_id IN (SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid())
    )
    OR id IN (
        SELECT es.event_id FROM public.event_staff es
        WHERE es.profile_id = auth.uid()
    )
);

-- 5. Allow Scout Members to view their own event participation entries
DROP POLICY IF EXISTS "Scout members can view own event participation" ON public.event_participants;
CREATE POLICY "Scout members can view own event participation"
ON public.event_participants
FOR SELECT
TO authenticated
USING (
    member_id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
    OR member_id IN (
        SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);
