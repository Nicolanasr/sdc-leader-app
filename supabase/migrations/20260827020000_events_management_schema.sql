-- Migration: Comprehensive Event & Camp Management Schema
-- Date: 2026-08-27

-- 1. Extend public.events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS participant_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned';

-- 2. Create public.event_staff table for event-specific hierarchy
CREATE TABLE IF NOT EXISTS public.event_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_role TEXT NOT NULL, -- 'ka2ed_mouskhayyam', 'amin_serr_mouskhayyam', 'amin_sandou2_mouskhayyam', 'mas2oul_matbakh', 'mas2oul_tejhizet', 'mas2oul_barnamej', 'mas2oul_seha'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, profile_id, event_role)
);

-- 3. Create public.event_participants table for scout attendance, consent, and payment
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    attendance_status TEXT NOT NULL DEFAULT 'absent', -- 'present', 'absent'
    parent_consent TEXT NOT NULL DEFAULT 'pending', -- 'yes', 'pending', 'no'
    fee_paid NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'paid', 'partial', 'unpaid'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- 4. Create public.event_expenses table for camp treasury logs
CREATE TABLE IF NOT EXISTS public.event_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'food', 'transport', 'equipment', 'location', 'program', 'misc'
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    logged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create public.event_documents table for attachments
CREATE TABLE IF NOT EXISTS public.event_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Authenticated users can select event staff" ON public.event_staff FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Group leaders & event staff can manage event staff" ON public.event_staff FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select event participants" ON public.event_participants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Group leaders & event staff can manage event participants" ON public.event_participants FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select event expenses" ON public.event_expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Group leaders & event staff can manage event expenses" ON public.event_expenses FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select event documents" ON public.event_documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Group leaders & event staff can manage event documents" ON public.event_documents FOR ALL USING (auth.uid() IS NOT NULL);
