-- Migration: Create leader_notifications table and policies
-- Date: 2026-08-28
-- Description: Dynamic multi-channel leader notifications store

CREATE TABLE IF NOT EXISTS public.leader_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    category TEXT NOT NULL DEFAULT 'system',
    channels_dispatched TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_leader_notifications_profile ON public.leader_notifications(profile_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leader_notifications_created ON public.leader_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.leader_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Leaders can view their own notifications"
ON public.leader_notifications FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Leaders can update read status on their own notifications"
ON public.leader_notifications FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Authenticated users and service roles can insert notifications"
ON public.leader_notifications FOR INSERT
TO authenticated
WITH CHECK (TRUE);
