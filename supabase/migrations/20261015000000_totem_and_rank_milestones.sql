-- Migration: Add Totem Animal and Detailed Rank/Totem Milestone Logging
-- Date: 2026-10-15
-- Description: Add totem fields to members and date/time/location/notes to member_history

-- 1. Add totem columns to public.members
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS totem_animal TEXT,
ADD COLUMN IF NOT EXISTS totem_adjective TEXT,
ADD COLUMN IF NOT EXISTS totem_date DATE,
ADD COLUMN IF NOT EXISTS totem_location TEXT;

-- 2. Add event_date, event_time, location, and notes to public.member_history
ALTER TABLE public.member_history
ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS event_time TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Backfill event_date from created_at where event_date is NULL
UPDATE public.member_history
SET event_date = created_at
WHERE event_date IS NULL;

-- 4. Update the trigger function log_member_changes to also log totem updates
CREATE OR REPLACE FUNCTION public.log_member_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_troop_name TEXT;
  v_new_troop_name TEXT;
  v_old_patrol_name TEXT;
  v_new_patrol_name TEXT;
BEGIN
  -- Check for Rank Change
  IF coalesce(OLD.current_rank, '') <> coalesce(NEW.current_rank, '') THEN
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value, event_date, location, notes)
    VALUES (
      NEW.id, 
      'rank_change', 
      coalesce(OLD.current_rank, 'None'), 
      coalesce(NEW.current_rank, 'None'),
      NOW(),
      NULL,
      'Automatic rank update'
    );
  END IF;

  -- Check for Totem Change
  IF coalesce(OLD.totem_animal, '') <> coalesce(NEW.totem_animal, '') OR coalesce(OLD.totem_adjective, '') <> coalesce(NEW.totem_adjective, '') THEN
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value, event_date, location, notes)
    VALUES (
      NEW.id,
      'totem_awarded',
      trim(concat(coalesce(OLD.totem_animal, ''), ' ', coalesce(OLD.totem_adjective, ''))),
      trim(concat(coalesce(NEW.totem_animal, ''), ' ', coalesce(NEW.totem_adjective, ''))),
      coalesce(NEW.totem_date::timestamptz, NOW()),
      NEW.totem_location,
      'Totem ceremony / Totémisation'
    );
  END IF;

  -- Check for Troop Change (Section / Unit Promotion)
  IF OLD.troop_id <> NEW.troop_id THEN
    SELECT name INTO v_old_troop_name FROM public.troops WHERE id = OLD.troop_id;
    SELECT name INTO v_new_troop_name FROM public.troops WHERE id = NEW.troop_id;
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value, event_date)
    VALUES (NEW.id, 'troop_change', coalesce(v_old_troop_name, 'Unknown'), coalesce(v_new_troop_name, 'Unknown'), NOW());
  END IF;

  -- Check for Patrol Change
  IF coalesce(OLD.patrol_id, '00000000-0000-0000-0000-000000000000'::uuid) <> coalesce(NEW.patrol_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    SELECT name INTO v_old_patrol_name FROM public.patrols WHERE id = OLD.patrol_id;
    SELECT name INTO v_new_patrol_name FROM public.patrols WHERE id = NEW.patrol_id;
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value, event_date)
    VALUES (NEW.id, 'patrol_change', coalesce(v_old_patrol_name, 'None'), coalesce(v_new_patrol_name, 'None'), NOW());
  END IF;

  -- Check for Promise Date Change
  IF coalesce(OLD.promise_date::text, '') <> coalesce(NEW.promise_date::text, '') THEN
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value, event_date)
    VALUES (NEW.id, 'promise_date_change', coalesce(OLD.promise_date::text, 'None'), coalesce(NEW.promise_date::text, 'None'), coalesce(NEW.promise_date::timestamptz, NOW()));
  END IF;

  -- Check for Status Change (Activation / Deactivation)
  IF OLD.is_active <> NEW.is_active THEN
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value, event_date)
    VALUES (
      NEW.id, 
      'status_change', 
      CASE WHEN OLD.is_active THEN 'Active' ELSE 'Inactive' END, 
      CASE WHEN NEW.is_active THEN 'Active' ELSE 'Inactive' END,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
