-- Migration: Add expiry_batches to group_pantry_items and notes to quartermaster_inventory
-- Date: 2026-08-28

-- 1. Add expiry_batches JSONB column to track multiple expiration lots per pantry item
ALTER TABLE public.group_pantry_items 
ADD COLUMN IF NOT EXISTS expiry_batches JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure notes column exists on quartermaster_inventory
ALTER TABLE public.quartermaster_inventory 
ADD COLUMN IF NOT EXISTS notes TEXT;
