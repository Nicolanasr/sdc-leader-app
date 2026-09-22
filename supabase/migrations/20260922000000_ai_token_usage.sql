-- Migration: AI Token Usage Tracking for Hermès Assistant
CREATE TABLE IF NOT EXISTS public.ai_token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    candidate_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    model_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_group ON public.ai_token_usage(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user ON public.ai_token_usage(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view AI token usage in their group or for themselves
CREATE POLICY "Users can view AI token usage in their group"
ON public.ai_token_usage
FOR SELECT
TO authenticated
USING (
    group_id = (auth.jwt() -> 'app_metadata' ->> 'group_id')::uuid
    OR user_id = auth.uid()
);

-- Allow authenticated users to insert AI token usage records
CREATE POLICY "Users can insert AI token usage"
ON public.ai_token_usage
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);
