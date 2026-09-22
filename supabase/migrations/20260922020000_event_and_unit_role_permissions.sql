-- Migration: Event Leadership and Unit Staff Role Permissions
-- Date: 2026-09-22
-- Author: Scouts des Cèdres Manager

-- ============================================================
-- 1. Unit Officers Member Access
-- Scout members with patrol_role in ('amin_serr', 'sandou2', 'tejhizet')
-- can view members belonging to their own troop
-- ============================================================

DROP POLICY IF EXISTS "Scout member unit officers can view troop members" ON public.members;
CREATE POLICY "Scout member unit officers can view troop members"
ON public.members
FOR SELECT
TO authenticated
USING (
    troop_id IN (
        SELECT m.troop_id FROM public.members m
        JOIN public.profiles p ON p.member_id = m.id
        WHERE p.id = auth.uid()
          AND m.patrol_role IN ('amin_serr', 'sandou2', 'tejhizet')
          AND m.is_deleted = false
    )
);

-- ============================================================
-- 2. Unit Secretary Attendance Access
-- Scout members with patrol_role = 'amin_serr' can manage
-- attendance sessions and individual records for their assigned troop
-- ============================================================

DROP POLICY IF EXISTS "Unit secretaries can manage troop attendance" ON public.attendance;
CREATE POLICY "Unit secretaries can manage troop attendance"
ON public.attendance
FOR ALL
TO authenticated
USING (
    troop_id IN (
        SELECT m.troop_id FROM public.members m
        JOIN public.profiles p ON p.member_id = m.id
        WHERE p.id = auth.uid()
          AND m.patrol_role = 'amin_serr'
          AND m.is_deleted = false
    )
)
WITH CHECK (
    troop_id IN (
        SELECT m.troop_id FROM public.members m
        JOIN public.profiles p ON p.member_id = m.id
        WHERE p.id = auth.uid()
          AND m.patrol_role = 'amin_serr'
          AND m.is_deleted = false
    )
);

DROP POLICY IF EXISTS "Unit secretaries can manage troop attendance records" ON public.attendance_records;
CREATE POLICY "Unit secretaries can manage troop attendance records"
ON public.attendance_records
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.attendance a
        WHERE a.id = attendance_records.attendance_id
          AND a.troop_id IN (
              SELECT m.troop_id FROM public.members m
              JOIN public.profiles p ON p.member_id = m.id
              WHERE p.id = auth.uid()
                AND m.patrol_role = 'amin_serr'
                AND m.is_deleted = false
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.attendance a
        WHERE a.id = attendance_records.attendance_id
          AND a.troop_id IN (
              SELECT m.troop_id FROM public.members m
              JOIN public.profiles p ON p.member_id = m.id
              WHERE p.id = auth.uid()
                AND m.patrol_role = 'amin_serr'
                AND m.is_deleted = false
          )
    )
);

-- ============================================================
-- 3. Event Secretary & Event Leadership Participants Access
-- Event staff members can view and update participants in their event
-- ============================================================

DROP POLICY IF EXISTS "Event staff can view event participants" ON public.event_participants;
CREATE POLICY "Event staff can view event participants"
ON public.event_participants
FOR SELECT
TO authenticated
USING (
    event_id IN (
        SELECT es.event_id FROM public.event_staff es
        WHERE es.profile_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Event secretary and leaders can update participants" ON public.event_participants;
CREATE POLICY "Event secretary and leaders can update participants"
ON public.event_participants
FOR UPDATE
TO authenticated
USING (
    event_id IN (
        SELECT es.event_id FROM public.event_staff es
        WHERE es.profile_id = auth.uid()
          AND es.event_role IN ('amin_serr_mouskhayyam', 'amin_serr', 'ka2ed_mouskhayyam', 'mousa3ed_ka2ed_mouskhayyam', 'amin_sandou2_mouskhayyam', 'amin_sandou2')
    )
)
WITH CHECK (
    event_id IN (
        SELECT es.event_id FROM public.event_staff es
        WHERE es.profile_id = auth.uid()
          AND es.event_role IN ('amin_serr_mouskhayyam', 'amin_serr', 'ka2ed_mouskhayyam', 'mousa3ed_ka2ed_mouskhayyam', 'amin_sandou2_mouskhayyam', 'amin_sandou2')
    )
);
