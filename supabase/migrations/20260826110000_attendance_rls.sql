-- Migration: Attendance Module RLS Policies
-- Date: 2026-08-26
-- Enables row-level security and policies on events, attendance, and attendance_records

-- ============================================================
-- 1. ENABLE RLS
-- ============================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. EVENTS — read/write policies
-- ============================================================

-- All leaders in the group can read events
CREATE POLICY "Group leaders can read events" ON public.events
  FOR SELECT USING (
    is_in_auth_group(group_id)
  );

-- Group admins can manage all group events
CREATE POLICY "Group admins can manage events" ON public.events
  FOR ALL USING (
    is_in_auth_group(group_id)
    AND (
      has_auth_role_scope('chef_groupe')
      OR has_auth_role_scope('assistant_chef_groupe')
      OR has_auth_role_scope('amin_serr_group')
      OR has_auth_role_scope('configurator')
    )
  );

-- Troop leaders can manage events scoped to their troop
CREATE POLICY "Troop leaders can manage troop events" ON public.events
  FOR ALL USING (
    is_in_auth_troop(troop_id)
    AND (
      has_auth_role_scope('ka2ed_fer2a')
      OR has_auth_role_scope('mouse3ed_ka2ed_fer2a')
    )
  );

-- ============================================================
-- 3. ATTENDANCE — session-level policies
-- ============================================================

-- Group admins can manage all attendance sessions in their group
CREATE POLICY "Group admins can manage attendance" ON public.attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = attendance.event_id
        AND is_in_auth_group(e.group_id)
        AND (
          has_auth_role_scope('chef_groupe')
          OR has_auth_role_scope('assistant_chef_groupe')
          OR has_auth_role_scope('amin_serr_group')
          OR has_auth_role_scope('configurator')
        )
    )
  );

-- Troop leaders can manage attendance sessions for their troop
CREATE POLICY "Troop leaders can manage troop attendance" ON public.attendance
  FOR ALL USING (
    is_in_auth_troop(troop_id)
    AND (
      has_auth_role_scope('ka2ed_fer2a')
      OR has_auth_role_scope('mouse3ed_ka2ed_fer2a')
    )
  );

-- ============================================================
-- 4. ATTENDANCE_RECORDS — individual record policies
-- ============================================================

-- Group admins can manage all attendance records in their group
CREATE POLICY "Group admins can manage attendance records" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.attendance a
      JOIN public.events e ON e.id = a.event_id
      WHERE a.id = attendance_records.attendance_id
        AND is_in_auth_group(e.group_id)
        AND (
          has_auth_role_scope('chef_groupe')
          OR has_auth_role_scope('assistant_chef_groupe')
          OR has_auth_role_scope('amin_serr_group')
          OR has_auth_role_scope('configurator')
        )
    )
  );

-- Troop leaders can manage attendance records for their troop's sessions
CREATE POLICY "Troop leaders can manage troop attendance records" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.attendance a
      WHERE a.id = attendance_records.attendance_id
        AND is_in_auth_troop(a.troop_id)
        AND (
          has_auth_role_scope('ka2ed_fer2a')
          OR has_auth_role_scope('mouse3ed_ka2ed_fer2a')
        )
    )
  );
