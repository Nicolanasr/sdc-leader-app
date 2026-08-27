-- Migration: Make attendance.troop_id nullable for group-scoped sessions (e.g. leadership meetings)
ALTER TABLE public.attendance ALTER COLUMN troop_id DROP NOT NULL;
