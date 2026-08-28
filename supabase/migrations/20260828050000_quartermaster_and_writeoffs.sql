-- =========================================================================
-- QUARTERMASTER & EQUIPMENT INVENTORY WITH WRITEOFF / VOIDING WORKFLOW
-- =========================================================================

-- 1. Ensure Table: quartermaster_inventory
CREATE TABLE IF NOT EXISTS public.quartermaster_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID REFERENCES public.troops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity_total INTEGER NOT NULL DEFAULT 1,
    quantity_available INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL DEFAULT 'good', -- 'good', 'fair', 'needs_repair', 'damaged'
    location_stored TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Ensure all columns exist on quartermaster_inventory
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quartermaster_inventory' AND column_name = 'qty_good') THEN
        ALTER TABLE public.quartermaster_inventory ADD COLUMN qty_good INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quartermaster_inventory' AND column_name = 'qty_fair') THEN
        ALTER TABLE public.quartermaster_inventory ADD COLUMN qty_fair INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quartermaster_inventory' AND column_name = 'qty_needs_repair') THEN
        ALTER TABLE public.quartermaster_inventory ADD COLUMN qty_needs_repair INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quartermaster_inventory' AND column_name = 'qty_damaged') THEN
        ALTER TABLE public.quartermaster_inventory ADD COLUMN qty_damaged INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quartermaster_inventory' AND column_name = 'description') THEN
        ALTER TABLE public.quartermaster_inventory ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quartermaster_inventory' AND column_name = 'created_at') THEN
        ALTER TABLE public.quartermaster_inventory ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
    
    -- Initialize condition counts from existing records if 0
    UPDATE public.quartermaster_inventory 
    SET qty_good = CASE WHEN condition = 'good' THEN quantity_total ELSE 0 END,
        qty_fair = CASE WHEN condition = 'fair' THEN quantity_total ELSE 0 END,
        qty_needs_repair = CASE WHEN condition = 'needs_repair' THEN quantity_total ELSE 0 END,
        qty_damaged = CASE WHEN condition = 'damaged' THEN quantity_total ELSE 0 END
    WHERE (qty_good + qty_fair + qty_needs_repair + qty_damaged) = 0 AND quantity_total > 0;
END $$;

-- 2. Ensure Table: inventory_checkouts
CREATE TABLE IF NOT EXISTS public.inventory_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.quartermaster_inventory(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    checked_out_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    troop_id UUID REFERENCES public.troops(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    checkout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_date DATE,
    actual_return_date DATE,
    returned_condition TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'requested', -- 'requested', 'handed_out', 'returned', 'rejected'
    handed_out_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Ensure extra columns on inventory_checkouts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_checkouts' AND column_name = 'troop_id') THEN
        ALTER TABLE public.inventory_checkouts ADD COLUMN troop_id UUID REFERENCES public.troops(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_checkouts' AND column_name = 'group_id') THEN
        ALTER TABLE public.inventory_checkouts ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_checkouts' AND column_name = 'actual_return_date') THEN
        ALTER TABLE public.inventory_checkouts ADD COLUMN actual_return_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_checkouts' AND column_name = 'handed_out_by') THEN
        ALTER TABLE public.inventory_checkouts ADD COLUMN handed_out_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_checkouts' AND column_name = 'received_by') THEN
        ALTER TABLE public.inventory_checkouts ADD COLUMN received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_checkouts' AND column_name = 'created_at') THEN
        ALTER TABLE public.inventory_checkouts ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- 3. Create Table: inventory_writeoffs (Decommissioned / Voided Damaged Equipment)
CREATE TABLE IF NOT EXISTS public.inventory_writeoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.quartermaster_inventory(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL, -- 'Broken beyond repair', 'Lost / Stolen', 'Expired / Unsafe', 'Replaced / Obsolete', 'Other'
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actioned_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- =========================================================================
-- INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_quartermaster_inventory_group ON public.quartermaster_inventory(group_id);
CREATE INDEX IF NOT EXISTS idx_quartermaster_inventory_troop ON public.quartermaster_inventory(troop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checkouts_item ON public.inventory_checkouts(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checkouts_group ON public.inventory_checkouts(group_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checkouts_event ON public.inventory_checkouts(event_id);
CREATE INDEX IF NOT EXISTS idx_inventory_writeoffs_item ON public.inventory_writeoffs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_writeoffs_group ON public.inventory_writeoffs(group_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.quartermaster_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_writeoffs ENABLE ROW LEVEL SECURITY;

-- Drop all old and new policies on quartermaster_inventory
DROP POLICY IF EXISTS "Quartermaster inventory management" ON public.quartermaster_inventory;
DROP POLICY IF EXISTS "Group leaders view inventory" ON public.quartermaster_inventory;
DROP POLICY IF EXISTS "Troop leaders request gear checkouts" ON public.quartermaster_inventory;
DROP POLICY IF EXISTS "quartermaster_inventory_select" ON public.quartermaster_inventory;
DROP POLICY IF EXISTS "quartermaster_inventory_insert" ON public.quartermaster_inventory;
DROP POLICY IF EXISTS "quartermaster_inventory_update" ON public.quartermaster_inventory;
DROP POLICY IF EXISTS "quartermaster_inventory_delete" ON public.quartermaster_inventory;

-- 1. Quartermaster Inventory Policies
CREATE POLICY "quartermaster_inventory_select" ON public.quartermaster_inventory
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.user_roles WHERE profile_id = auth.uid()
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'configurator')
    );

CREATE POLICY "quartermaster_inventory_insert" ON public.quartermaster_inventory
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.user_roles 
            WHERE profile_id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'configurator')
            )
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'configurator')
    );

CREATE POLICY "quartermaster_inventory_update" ON public.quartermaster_inventory
    FOR UPDATE USING (
        group_id IN (
            SELECT group_id FROM public.user_roles 
            WHERE profile_id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'configurator')
            )
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'configurator')
    );

CREATE POLICY "quartermaster_inventory_delete" ON public.quartermaster_inventory
    FOR DELETE USING (
        group_id IN (
            SELECT group_id FROM public.user_roles 
            WHERE profile_id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('chef_groupe', 'assistant_chef_groupe', 'configurator')
            )
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'configurator')
    );

-- Drop all old and new policies on inventory_checkouts
DROP POLICY IF EXISTS "Quartermaster checkouts handling" ON public.inventory_checkouts;
DROP POLICY IF EXISTS "Troop leaders place inventory checkouts request" ON public.inventory_checkouts;
DROP POLICY IF EXISTS "inventory_checkouts_select" ON public.inventory_checkouts;
DROP POLICY IF EXISTS "inventory_checkouts_insert" ON public.inventory_checkouts;
DROP POLICY IF EXISTS "inventory_checkouts_update" ON public.inventory_checkouts;
DROP POLICY IF EXISTS "inventory_checkouts_delete" ON public.inventory_checkouts;

-- 2. Inventory Checkouts Policies
CREATE POLICY "inventory_checkouts_select" ON public.inventory_checkouts
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.user_roles WHERE profile_id = auth.uid()
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'configurator')
    );

CREATE POLICY "inventory_checkouts_insert" ON public.inventory_checkouts
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.user_roles WHERE profile_id = auth.uid()
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'configurator')
    );

CREATE POLICY "inventory_checkouts_update" ON public.inventory_checkouts
    FOR UPDATE USING (
        group_id IN (
            SELECT group_id FROM public.user_roles WHERE profile_id = auth.uid()
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'configurator')
    );

-- Drop all old and new policies on inventory_writeoffs
DROP POLICY IF EXISTS "inventory_writeoffs_select" ON public.inventory_writeoffs;
DROP POLICY IF EXISTS "inventory_writeoffs_insert" ON public.inventory_writeoffs;
DROP POLICY IF EXISTS "inventory_writeoffs_update" ON public.inventory_writeoffs;
DROP POLICY IF EXISTS "inventory_writeoffs_delete" ON public.inventory_writeoffs;

-- 3. Inventory Write-offs Policies
CREATE POLICY "inventory_writeoffs_select" ON public.inventory_writeoffs
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.user_roles WHERE profile_id = auth.uid()
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'amin_serr_group', 'configurator')
    );

CREATE POLICY "inventory_writeoffs_insert" ON public.inventory_writeoffs
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.user_roles 
            WHERE profile_id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'configurator')
            )
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'configurator')
    );

CREATE POLICY "inventory_writeoffs_update" ON public.inventory_writeoffs
    FOR UPDATE USING (
        group_id IN (
            SELECT group_id FROM public.user_roles 
            WHERE profile_id = auth.uid() 
            AND role_id IN (
                SELECT id FROM public.roles 
                WHERE name IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'configurator')
            )
        )
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'configurator')
    );
