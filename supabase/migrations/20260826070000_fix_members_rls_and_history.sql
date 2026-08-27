-- Migration: Youth Roster CRUD Permissions & Automated Promotion History Logs
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Create a policy to allow Chef de Groupe and assistants full write/manage access on members
CREATE POLICY "Group leaders full group roster access" ON public.members 
    FOR ALL USING (
        is_in_auth_group(group_id) 
        AND (has_auth_role_scope('chef_groupe') OR has_auth_role_scope('assistant_chef_groupe') OR has_auth_role_scope('configurator'))
    );

-- 2. Create the member_history log table
CREATE TABLE public.member_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'rank_change', 'troop_change', 'patrol_change', 'status_change', 'promise_date_change'
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS on member_history
ALTER TABLE public.member_history ENABLE ROW LEVEL SECURITY;

-- 4. Define SELECT RLS Policies for public.member_history
CREATE POLICY "Group leaders and secretaries can view member history" ON public.member_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_history.member_id
            AND is_in_auth_group(m.group_id)
            AND (has_auth_role_scope('chef_groupe') OR has_auth_role_scope('assistant_chef_groupe') OR has_auth_role_scope('amin_serr_group') OR has_auth_role_scope('configurator'))
        )
    );

CREATE POLICY "Troop leaders can view troop member history" ON public.member_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_history.member_id
            AND is_in_auth_troop(m.troop_id)
            AND (has_auth_role_scope('ka2ed_fer2a') OR has_auth_role_scope('mouse3ed_ka2ed_fer2a'))
        )
    );

-- 5. Trigger function to log rank promotions, troop/patrol transfers, promise edits, and status toggles
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
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'rank_change', coalesce(OLD.current_rank, 'None'), coalesce(NEW.current_rank, 'None'));
  END IF;

  -- Check for Troop Change (Section / Unit Promotion)
  IF OLD.troop_id <> NEW.troop_id THEN
    SELECT name INTO v_old_troop_name FROM public.troops WHERE id = OLD.troop_id;
    SELECT name INTO v_new_troop_name FROM public.troops WHERE id = NEW.troop_id;
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'troop_change', coalesce(v_old_troop_name, 'Unknown'), coalesce(v_new_troop_name, 'Unknown'));
  END IF;

  -- Check for Patrol Change
  IF coalesce(OLD.patrol_id, '00000000-0000-0000-0000-000000000000'::uuid) <> coalesce(NEW.patrol_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    SELECT name INTO v_old_patrol_name FROM public.patrols WHERE id = OLD.patrol_id;
    SELECT name INTO v_new_patrol_name FROM public.patrols WHERE id = NEW.patrol_id;
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'patrol_change', coalesce(v_old_patrol_name, 'None'), coalesce(v_new_patrol_name, 'None'));
  END IF;

  -- Check for Promise Date Change
  IF coalesce(OLD.promise_date::text, '') <> coalesce(NEW.promise_date::text, '') THEN
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'promise_date_change', coalesce(OLD.promise_date::text, 'None'), coalesce(NEW.promise_date::text, 'None'));
  END IF;

  -- Check for Status Change (Activation / Deactivation)
  IF OLD.is_active <> NEW.is_active THEN
    INSERT INTO public.member_history (member_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'status_change', 
      CASE WHEN OLD.is_active THEN 'Active' ELSE 'Inactive' END, 
      CASE WHEN NEW.is_active THEN 'Active' ELSE 'Inactive' END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Bind the trigger to the members table
CREATE OR REPLACE TRIGGER trigger_log_member_changes
AFTER UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.log_member_changes();
