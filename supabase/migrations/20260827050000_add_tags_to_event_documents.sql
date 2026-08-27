ALTER TABLE public.event_documents ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
