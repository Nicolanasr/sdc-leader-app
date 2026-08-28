-- Add min_threshold column to group_pantry_items if not already present
ALTER TABLE public.group_pantry_items ADD COLUMN IF NOT EXISTS min_threshold NUMERIC NOT NULL DEFAULT 0;
