-- Migration: Monthly Financial Statements & Group Leader Approval Schema
-- Date: 2026-08-27

CREATE TABLE IF NOT EXISTS public.monthly_financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- e.g. '2026-01', '2026-02'
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
    opening_balance_usd NUMERIC NOT NULL DEFAULT 0,
    opening_balance_lbp NUMERIC NOT NULL DEFAULT 0,
    closing_balance_usd NUMERIC NOT NULL DEFAULT 0,
    closing_balance_lbp NUMERIC NOT NULL DEFAULT 0,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, month_key)
);

-- Enable RLS
ALTER TABLE public.monthly_financial_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can select monthly statements" ON public.monthly_financial_statements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage monthly statements" ON public.monthly_financial_statements FOR ALL USING (auth.uid() IS NOT NULL);
