-- =========================================================================
-- MIGRATION: 20260922030000_profile_self_edit_and_member_link.sql
-- Description: Allow users to self-edit their own basic profile and member info,
-- and allow leaders to link/update their member record.
-- =========================================================================

-- 1. Ensure users can update their own profile row
DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
CREATE POLICY "Users can update own profiles"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 2. Ensure users can update their own linked member row (basic info)
DROP POLICY IF EXISTS "Users can update own member basic info" ON public.members;
CREATE POLICY "Users can update own member basic info"
ON public.members
FOR UPDATE
USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
    OR id IN (SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid())
)
WITH CHECK (
    id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
    OR id IN (SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3. Ensure any authenticated user can view their own linked member record
DROP POLICY IF EXISTS "Users can view own member record" ON public.members;
CREATE POLICY "Users can view own member record"
ON public.members
FOR SELECT
USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'member_id')::uuid
    OR id IN (SELECT p.member_id FROM public.profiles p WHERE p.id = auth.uid())
);
