-- Migration: Add needs_password_change column to profiles and RLS claims triggers
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Add needs_password_change column to public.profiles with default TRUE
ALTER TABLE public.profiles ADD COLUMN needs_password_change BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Trigger function to update auth.users raw_app_meta_data based on public.profiles updates
CREATE OR REPLACE FUNCTION public.handle_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('needs_password_change', NEW.needs_password_change)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger to public.profiles
CREATE TRIGGER on_profile_change
AFTER INSERT OR UPDATE OF needs_password_change ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_change();
