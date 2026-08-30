-- Migration: Meeting Plans & Templates for Weekly Meeting Session Planner (Canevas)

CREATE TABLE IF NOT EXISTS public.meeting_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    theme TEXT,
    objectives TEXT,
    meeting_date DATE NOT NULL,
    start_time TEXT NOT NULL DEFAULT '14:00',
    end_time TEXT NOT NULL DEFAULT '16:30',
    location TEXT,
    schedule_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    materials_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    section_type TEXT NOT NULL DEFAULT 'all', -- 'meute', 'troupe', 'poste', 'all'
    default_duration_min INTEGER NOT NULL DEFAULT 120,
    schedule_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_meeting_plans_group_troop ON public.meeting_plans(group_id, troop_id);
CREATE INDEX IF NOT EXISTS idx_meeting_plans_date ON public.meeting_plans(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_templates_group ON public.meeting_templates(group_id);

-- RLS Policies
ALTER TABLE public.meeting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to read meeting plans"
    ON public.meeting_plans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all authenticated users to insert/update meeting plans"
    ON public.meeting_plans FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to read meeting templates"
    ON public.meeting_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all authenticated users to manage meeting templates"
    ON public.meeting_templates FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
