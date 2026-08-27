-- Migration: Add attendance_status to public.event_staff for leadership participation tracking
ALTER TABLE public.event_staff
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'present';
