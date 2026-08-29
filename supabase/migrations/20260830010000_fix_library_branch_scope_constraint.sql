-- Migration: Drop restrictive branch_scope check constraint to support custom group troop names
-- Date: 2026-08-30

ALTER TABLE public.group_archive_items DROP CONSTRAINT IF EXISTS group_archive_items_branch_scope_check;
ALTER TABLE public.group_archive_items ALTER COLUMN branch_scope SET DEFAULT 'all';
