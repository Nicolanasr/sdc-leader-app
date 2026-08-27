-- Migration: Group Treasury & Annual Membership Dues (Cotisations) Schema
-- Date: 2026-08-27

-- 1. Create public.membership_fees table
CREATE TABLE IF NOT EXISTS public.membership_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    scout_year TEXT NOT NULL DEFAULT '2025-2026',
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    base_fee NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    discount_reason TEXT,
    final_due NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid', 'exempt'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, scout_year, member_id)
);

-- 2. Create public.membership_payments table for installment logs
CREATE TABLE IF NOT EXISTS public.membership_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_fee_id UUID NOT NULL REFERENCES public.membership_fees(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'whish_omt', 'bank_transfer', 'other'
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create public.treasury_transactions table (Sandou2 El Majlis)
CREATE TABLE IF NOT EXISTS public.treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID REFERENCES public.troops(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL, -- 'income', 'expense'
    category TEXT NOT NULL, -- 'membership_dues', 'donation', 'fundraising', 'equipment', 'uniforms_badges', 'hq_utilities', 'event_transfer', 'misc'
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.membership_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Authenticated users can select membership fees" ON public.membership_fees FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage membership fees" ON public.membership_fees FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select membership payments" ON public.membership_payments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage membership payments" ON public.membership_payments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can select treasury transactions" ON public.treasury_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage treasury transactions" ON public.treasury_transactions FOR ALL USING (auth.uid() IS NOT NULL);
