-- Migration: Troop Monthly Dues, Handovers & Disbursements Schema
-- Date: 2026-08-27

-- 1. Create public.troop_fee_settings table
CREATE TABLE IF NOT EXISTS public.troop_fee_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    scout_year TEXT NOT NULL DEFAULT '2025-2026',
    monthly_target NUMERIC NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(troop_id, scout_year)
);

-- 2. Create public.troop_monthly_dues table
CREATE TABLE IF NOT EXISTS public.troop_monthly_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    scout_year TEXT NOT NULL DEFAULT '2025-2026',
    month_key TEXT NOT NULL, -- e.g. '2025-10', '2025-11', '2026-01'
    target_amount NUMERIC NOT NULL DEFAULT 5,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid', -- 'paid', 'partial', 'unpaid', 'exempt'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, month_key)
);

-- 3. Create public.troop_dues_payments table (Weekly incremental payments)
CREATE TABLE IF NOT EXISTS public.troop_dues_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    troop_monthly_due_id UUID NOT NULL REFERENCES public.troop_monthly_dues(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create public.troop_handovers table (End of Month Taslim El Sandou2)
CREATE TABLE IF NOT EXISTS public.troop_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    handed_over_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    handover_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create public.troop_disbursements table (Troop Cash Advances / Fund Requests)
CREATE TABLE IF NOT EXISTS public.troop_disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    purpose TEXT NOT NULL,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.troop_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troop_monthly_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troop_dues_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troop_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troop_disbursements ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Authenticated users can select troop fee settings" ON public.troop_fee_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage troop fee settings" ON public.troop_fee_settings FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select troop monthly dues" ON public.troop_monthly_dues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage troop monthly dues" ON public.troop_monthly_dues FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select troop dues payments" ON public.troop_dues_payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage troop dues payments" ON public.troop_dues_payments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select troop handovers" ON public.troop_handovers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage troop handovers" ON public.troop_handovers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select troop disbursements" ON public.troop_disbursements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage troop disbursements" ON public.troop_disbursements FOR ALL USING (auth.uid() IS NOT NULL);
