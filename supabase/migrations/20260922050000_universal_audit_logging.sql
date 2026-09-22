-- ==============================================================================
-- UNIVERSAL AUDIT LOGGING SYSTEM FOR SDC LEADER APP
-- Captures all CRUD operations (INSERT, UPDATE, DELETE) across all application tables
-- with who performed the action, timestamp, old values, new values, and changed fields.
-- ==============================================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_fields JSONB,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    performed_by_email TEXT,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for rapid filtering and audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_group_id ON public.audit_logs (group_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_log_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    user_email text := null;
    old_json jsonb := null;
    new_json jsonb := null;
    changed_json jsonb := '{}'::jsonb;
    rec_id text := null;
    grp_id uuid := null;
    key text;
BEGIN
    -- 1. Resolve User ID (Check auth.uid(), JWT claims, session setting)
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := null;
    END;

    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := null;
        END;
    END IF;

    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := null;
        END;
    END IF;

    IF current_user_id IS NULL THEN
        BEGIN
            current_user_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := null;
        END;
    END IF;

    -- 2. Resolve User Email
    BEGIN
        user_email := nullif(current_setting('request.jwt.claim.email', true), '');
    EXCEPTION WHEN OTHERS THEN
        user_email := null;
    END;

    IF user_email IS NULL THEN
        BEGIN
            user_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
        EXCEPTION WHEN OTHERS THEN
            user_email := null;
        END;
    END IF;

    IF (user_email IS NULL OR user_email = '') AND current_user_id IS NOT NULL THEN
        SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
        IF user_email IS NULL THEN
            SELECT email INTO user_email FROM public.profiles WHERE id = current_user_id;
        END IF;
    END IF;

    IF user_email IS NULL OR user_email = '' THEN
        BEGIN
            user_email := nullif(current_setting('app.current_user_email', true), '');
        EXCEPTION WHEN OTHERS THEN
            user_email := null;
        END;
    END IF;

    IF current_user_id IS NULL AND user_email IS NOT NULL THEN
        SELECT id INTO current_user_id FROM auth.users WHERE email = user_email LIMIT 1;
        IF current_user_id IS NULL THEN
            SELECT id INTO current_user_id FROM public.profiles WHERE email = user_email LIMIT 1;
        END IF;
    END IF;

    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        new_json := to_jsonb(NEW);
        rec_id := COALESCE(
            new_json->>'id',
            new_json->>'profile_id',
            new_json->>'member_id',
            new_json->>'user_id',
            'unknown'
        );

        -- Extract group_id if available
        IF new_json ? 'group_id' AND new_json->>'group_id' IS NOT NULL THEN
            grp_id := (new_json->>'group_id')::uuid;
        END IF;

        -- Store only non-null initial fields to keep payload minimal
        FOR key IN SELECT jsonb_object_keys(new_json)
        LOOP
            IF new_json->key IS NOT NULL AND new_json->key <> 'null'::jsonb AND key NOT IN ('created_at', 'updated_at') THEN
                changed_json := jsonb_set(changed_json, ARRAY[key], new_json->key);
            END IF;
        END LOOP;

        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_fields,
            performed_by,
            performed_by_email,
            group_id,
            created_at
        ) VALUES (
            TG_TABLE_NAME::text,
            rec_id,
            'INSERT',
            NULL,
            NULL,
            changed_json,
            current_user_id,
            user_email,
            grp_id,
            now()
        );
        RETURN NEW;

    -- Handle UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);
        rec_id := COALESCE(
            new_json->>'id',
            old_json->>'id',
            new_json->>'profile_id',
            old_json->>'profile_id',
            new_json->>'member_id',
            old_json->>'member_id',
            'unknown'
        );

        -- Extract group_id
        IF new_json ? 'group_id' AND new_json->>'group_id' IS NOT NULL THEN
            grp_id := (new_json->>'group_id')::uuid;
        ELSIF old_json ? 'group_id' AND old_json->>'group_id' IS NOT NULL THEN
            grp_id := (old_json->>'group_id')::uuid;
        END IF;

        -- Compute field-by-field diff: only store fields that actually changed
        FOR key IN SELECT jsonb_object_keys(new_json)
        LOOP
            IF (old_json->key IS DISTINCT FROM new_json->key) AND key NOT IN ('updated_at') THEN
                changed_json := jsonb_set(
                    changed_json,
                    ARRAY[key],
                    jsonb_build_object('old', old_json->key, 'new', new_json->key)
                );
            END IF;
        END LOOP;

        -- Only log if meaningful columns changed, without storing entire row duplicates
        IF changed_json <> '{}'::jsonb THEN
            INSERT INTO public.audit_logs (
                table_name,
                record_id,
                action,
                old_data,
                new_data,
                changed_fields,
                performed_by,
                performed_by_email,
                group_id,
                created_at
            ) VALUES (
                TG_TABLE_NAME::text,
                rec_id,
                'UPDATE',
                NULL,
                NULL,
                changed_json,
                current_user_id,
                user_email,
                grp_id,
                now()
            );
        END IF;
        RETURN NEW;

    -- Handle DELETE
    ELSIF TG_OP = 'DELETE' THEN
        old_json := to_jsonb(OLD);
        rec_id := COALESCE(
            old_json->>'id',
            old_json->>'profile_id',
            old_json->>'member_id',
            old_json->>'user_id',
            'unknown'
        );

        IF old_json ? 'group_id' AND old_json->>'group_id' IS NOT NULL THEN
            grp_id := (old_json->>'group_id')::uuid;
        END IF;

        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            old_data,
            new_data,
            changed_fields,
            performed_by,
            performed_by_email,
            group_id,
            created_at
        ) VALUES (
            TG_TABLE_NAME::text,
            rec_id,
            'DELETE',
            NULL,
            NULL,
            old_json,
            current_user_id,
            user_email,
            grp_id,
            now()
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- 3. Attach Triggers to ALL Application Tables
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'profiles',
        'members',
        'member_history',
        'member_emergency_contacts',
        'user_roles',
        'profile_responsibilities',
        'troops',
        'patrols',
        'events',
        'event_participants',
        'event_staff',
        'event_equipment',
        'event_pantry_requests',
        'event_meals',
        'event_documents',
        'event_announcements',
        'attendance_sessions',
        'attendance_records',
        'group_finances_transactions',
        'group_treasury_settings',
        'troop_monthly_dues',
        'troop_cash_handovers',
        'inventory_items',
        'inventory_maintenance_logs',
        'equipment_writeoffs',
        'group_pantry_items',
        'group_pantry_batches',
        'library_items',
        'library_categories',
        'progression_classes',
        'progression_requirements',
        'member_progression_records',
        'meeting_plans',
        'meeting_plan_sections'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list
    LOOP
        -- Check if table exists before adding trigger
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger_fn();', tbl, tbl);
        END IF;
    END LOOP;
END;
$$;

-- 4. RLS Policies for audit_logs
DROP POLICY IF EXISTS "Configurators and Group Chiefs can view audit logs" ON public.audit_logs;
CREATE POLICY "Configurators and Group Chiefs can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'configurator')
        OR (
            (auth.jwt() -> 'app_metadata' ->> 'role' IN ('chef_groupe', 'assistant_chef_groupe'))
            AND (group_id IS NULL OR group_id = ((auth.jwt() -> 'app_metadata' ->> 'group_id')::uuid))
        )
    );
