-- Migration: Scout Progression & Badge Passport System
-- Date: 2026-08-30
-- Description: Supports dynamic ranks/classes, categories, and requirements bound to section_types with member completion and evidence tracking.

-- 1. Table: progression_classes (Stages/Ranks per Section Type)
CREATE TABLE IF NOT EXISTS public.progression_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type_id UUID NOT NULL REFERENCES public.section_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    badge_icon TEXT DEFAULT '⚜️',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: progression_requirements (Requirements under each Class)
CREATE TABLE IF NOT EXISTS public.progression_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.progression_classes(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g. "Sports", "Scouts", "Religion"
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: member_progression_records (Individual Scout Completions & Evidence)
CREATE TABLE IF NOT EXISTS public.member_progression_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES public.progression_requirements(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    evidence_file_url TEXT,
    evidence_drive_file_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_member_requirement UNIQUE (member_id, requirement_id)
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_prog_classes_section ON public.progression_classes(section_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prog_reqs_class ON public.progression_requirements(class_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_prog_records_member ON public.member_progression_records(member_id);
CREATE INDEX IF NOT EXISTS idx_prog_records_req ON public.member_progression_records(requirement_id);

-- Enable RLS
ALTER TABLE public.progression_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_progression_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all authenticated users to read progression classes"
    ON public.progression_classes FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY "Allow configurator full access to progression classes"
    ON public.progression_classes FOR ALL
    TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator');

CREATE POLICY "Allow all authenticated users to read progression requirements"
    ON public.progression_requirements FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY "Allow configurator full access to progression requirements"
    ON public.progression_requirements FOR ALL
    TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator');

CREATE POLICY "Allow leaders to read and manage member progression records"
    ON public.member_progression_records FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_progression_records.member_id
            AND m.group_id::text = (auth.jwt() -> 'app_metadata' ->> 'group_id')
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator'
    );
