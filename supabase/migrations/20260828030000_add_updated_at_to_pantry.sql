-- Add updated_at column to group_pantry_items if not already present
ALTER TABLE public.group_pantry_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
