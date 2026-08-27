-- Migration to ensure all columns on public.treasury_transactions exist seamlessly
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT;
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'group';
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.treasury_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Sync type and transaction_type
UPDATE public.treasury_transactions SET transaction_type = type WHERE transaction_type IS NULL AND type IS NOT NULL;
UPDATE public.treasury_transactions SET type = transaction_type WHERE type IS NULL AND transaction_type IS NOT NULL;
UPDATE public.treasury_transactions SET recorded_by = submitted_by WHERE recorded_by IS NULL AND submitted_by IS NOT NULL;
UPDATE public.treasury_transactions SET submitted_by = recorded_by WHERE submitted_by IS NULL AND recorded_by IS NOT NULL;
