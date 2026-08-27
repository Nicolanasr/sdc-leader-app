-- Migration: Initialize Database Schema and Security Policies
-- Date: 2026-08-25
-- Author: Scouts des Cèdres Manager

-- =========================================================================
-- 1. STRUCTURAL TABLES
-- =========================================================================

-- Table: commissariats
CREATE TABLE public.commissariats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: groups
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commissariat_id UUID NOT NULL REFERENCES public.commissariats(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_commissariat_group UNIQUE (commissariat_id, name)
);

-- Table: section_types (Dynamic Sections)
CREATE TABLE public.section_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    min_age INTEGER,
    max_age INTEGER
);

-- Table: troops (Fera2)
CREATE TABLE public.troops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    section_type_id UUID NOT NULL REFERENCES public.section_types(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_group_troop UNIQUE (group_id, name)
);

-- Table: patrols (Sizaines)
CREATE TABLE public.patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_troop_patrol UNIQUE (troop_id, name)
);

-- =========================================================================
-- 2. PROFILES & ROLE-BASED ACCESS CONTROL (RBAC)
-- =========================================================================

-- Table: profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID, -- Will be set/linked when a scout is promoted to leader
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    whatsapp_number TEXT,
    rank TEXT, 
    mahemm TEXT, 
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: roles
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL
);

-- Table: user_roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID REFERENCES public.troops(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_role_scope UNIQUE (profile_id, role_id, group_id, troop_id)
);

-- =========================================================================
-- 3. MEMBERS & OPERATIONS
-- =========================================================================

-- Table: members (Scout Youth Roster)
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE,
    blood_type TEXT,
    medical_info TEXT,
    emergency_contact_name TEXT NOT NULL,
    emergency_contact_relation TEXT NOT NULL,
    emergency_contact_phone TEXT NOT NULL,
    photo_url TEXT,
    promise_date DATE,
    current_rank TEXT, -- Youth rank ('3arif_awwal', '3arif', 'mse3ed_3arif')
    patrol_role TEXT, -- Youth staff role ('amin_serr', 'sandou2', 'tejhizet')
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE RESTRICT,
    patrol_id UUID REFERENCES public.patrols(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Link profiles to members
ALTER TABLE public.profiles ADD CONSTRAINT fk_profile_member FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Table: events
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL, -- 'weekly_meeting', 'camp', 'hike', 'special_event'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    scope TEXT NOT NULL, -- 'group', 'troop'
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID REFERENCES public.troops(id) ON DELETE CASCADE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT check_event_dates CHECK (end_time >= start_time)
);

-- Table: attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    troop_id UUID NOT NULL REFERENCES public.troops(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: attendance_records
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'present', 'absent', 'excused'
    excuse_reason TEXT
);

-- Table: member_dues
CREATE TABLE public.member_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL, -- 'USD', 'LBP'
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: member_payments
CREATE TABLE public.member_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_due_id UUID NOT NULL REFERENCES public.member_dues(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL, -- 'USD', 'LBP'
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash', 'omt', 'wish_money'
    receipt_number TEXT UNIQUE NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: treasury_transactions
CREATE TABLE public.treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL, -- 'group', 'troop'
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID REFERENCES public.troops(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL, -- 'USD', 'LBP'
    type TEXT NOT NULL, -- 'income', 'expense'
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash', 'omt', 'wish_money'
    status TEXT NOT NULL DEFAULT 'pending', -- 'approved', 'pending', 'rejected'
    submitted_by UUID NOT NULL REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: quartermaster_inventory
CREATE TABLE public.quartermaster_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity_total INTEGER NOT NULL,
    quantity_available INTEGER NOT NULL,
    condition TEXT NOT NULL DEFAULT 'good',
    location_stored TEXT,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    troop_id UUID REFERENCES public.troops(id) ON DELETE CASCADE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: inventory_checkouts
CREATE TABLE public.inventory_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.quartermaster_inventory(id) ON DELETE CASCADE,
    checked_out_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    checkout_date DATE NOT NULL,
    return_date DATE,
    returned_condition TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'requested', -- 'requested', 'handed_out', 'returned'
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: camp_provisions (Mas2oul Mounet Food Checklist)
CREATE TABLE public.camp_provisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity_required NUMERIC(10,2) NOT NULL,
    unit TEXT NOT NULL, -- 'kg', 'loaves', 'pieces'
    estimated_cost NUMERIC(12,2),
    currency TEXT NOT NULL DEFAULT 'USD',
    purchased_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- =========================================================================
-- 4. CLAIMS PROPAGATION FUNCTIONS & TRIGGERS
-- =========================================================================

-- Trigger function to update auth.users raw_app_meta_data based on user_roles
CREATE OR REPLACE FUNCTION public.handle_user_role_change()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_role_name TEXT;
  v_group_id UUID;
  v_troop_id UUID;
  v_claims JSONB;
BEGIN
  -- Determine which profile ID is affected
  IF TG_OP = 'DELETE' THEN
    v_profile_id := OLD.profile_id;
  ELSE
    v_profile_id := NEW.profile_id;
  END IF;

  -- Fetch the latest active role and scope assignments
  SELECT r.name, ur.group_id, ur.troop_id
  INTO v_role_name, v_group_id, v_troop_id
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.profile_id = v_profile_id
  ORDER BY ur.id DESC
  LIMIT 1;

  -- Build claims JSONB block
  IF v_role_name IS NOT NULL THEN
    v_claims := jsonb_build_object(
      'role', v_role_name,
      'group_id', v_group_id,
      'troop_id', v_troop_id
    );
  ELSE
    v_claims := jsonb_build_object(
      'role', NULL,
      'group_id', NULL,
      'troop_id', NULL
    );
  END IF;

  -- Update auth.users metadata securely
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || v_claims
  WHERE id = v_profile_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to user_roles
CREATE TRIGGER on_user_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.handle_user_role_change();

-- =========================================================================
-- 5. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- =========================================================================

-- Helper to extract role claim from JWT
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''), 'guest');
$$ LANGUAGE sql STABLE;

-- Helper to extract group scoped claim from JWT
CREATE OR REPLACE FUNCTION public.get_auth_group_id()
RETURNS UUID AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'group_id', ''))::uuid;
$$ LANGUAGE sql STABLE;

-- Helper to extract troop scoped claim from JWT
CREATE OR REPLACE FUNCTION public.get_auth_troop_id()
RETURNS UUID AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'troop_id', ''))::uuid;
$$ LANGUAGE sql STABLE;

-- =========================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.commissariats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quartermaster_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_provisions ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 7. SECURITY POLICIES (RLS Matrix)
-- =========================================================================

-- SYSTEM ACCESS: Configurator has full bypass/management capabilities
CREATE POLICY "Configurator full access" ON public.commissariats FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.groups FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.section_types FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.troops FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.patrols FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.profiles FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.roles FOR ALL USING (get_auth_role() = 'configurator');
CREATE POLICY "Configurator full access" ON public.user_roles FOR ALL USING (get_auth_role() = 'configurator');

-- Read section types for anyone logged in
CREATE POLICY "Logged in users can read section types" ON public.section_types 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Commissariats & Groups Select policies for group scoped members
CREATE POLICY "Group users can read own commissariat" ON public.commissariats 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.groups g 
            WHERE g.commissariat_id = public.commissariats.id 
              AND g.id = get_auth_group_id()
        )
    );

CREATE POLICY "Group users can read own group" ON public.groups 
    FOR SELECT USING (id = get_auth_group_id());

-- Troops & Patrols policies
CREATE POLICY "Group leaders can view and manage own group troops" ON public.troops 
    FOR ALL USING (
        group_id = get_auth_group_id() 
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'amin_sandou2_group', 'amin_tejhizet_group', 'mas2oul_toswir', 'mas2oul_mounet', 'ka2ed_idare')
    );

CREATE POLICY "Troop leaders can view own troop" ON public.troops 
    FOR SELECT USING (
        id = get_auth_troop_id() 
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Group leaders can view and manage own troop patrols" ON public.patrols 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.troops t 
            WHERE t.id = public.patrols.troop_id 
              AND t.group_id = get_auth_group_id()
        )
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'amin_sandou2_group', 'amin_tejhizet_group', 'mas2oul_toswir', 'mas2oul_mounet', 'ka2ed_idare')
    );

CREATE POLICY "Troop leaders can view and manage own patrols" ON public.patrols 
    FOR ALL USING (
        troop_id = get_auth_troop_id() 
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

-- Profiles policies
CREATE POLICY "Profiles select policy" ON public.profiles 
    FOR SELECT USING (
        id = auth.uid()
        OR (get_auth_group_id() IS NOT NULL AND NOT is_deleted)
    );

CREATE POLICY "Users can update own profiles" ON public.profiles 
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Group leaders can manage profiles in group" ON public.profiles 
    FOR ALL USING (
        get_auth_role() IN ('chef_groupe', 'amin_serr_group')
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.profile_id = public.profiles.id
              AND ur.group_id = get_auth_group_id()
        )
    );

-- User Roles policy
CREATE POLICY "Chef de groupe manage roles in group" ON public.user_roles 
    FOR ALL USING (
        get_auth_role() = 'chef_groupe' 
        AND group_id = get_auth_group_id()
    );

CREATE POLICY "User roles select policy" ON public.user_roles 
    FOR SELECT USING (
        profile_id = auth.uid()
        OR group_id = get_auth_group_id()
    );

-- Members (Youth Scout Roster) policies
CREATE POLICY "Secretary full group roster access" ON public.members 
    FOR ALL USING (
        group_id = get_auth_group_id() 
        AND get_auth_role() = 'amin_serr_group'
    );

CREATE POLICY "Chef de Groupe and general group leaders read access (excl medical)" ON public.members 
    FOR SELECT USING (
        group_id = get_auth_group_id() 
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_sandou2_group', 'amin_tejhizet_group', 'mas2oul_toswir', 'mas2oul_mounet', 'ka2ed_idare')
    );

CREATE POLICY "Troop leaders full access to troop members" ON public.members 
    FOR ALL USING (
        troop_id = get_auth_troop_id() 
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

-- Events policies
CREATE POLICY "Group leaders view all events and manage group events" ON public.events 
    FOR ALL USING (
        group_id = get_auth_group_id()
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'amin_sandou2_group', 'amin_tejhizet_group', 'mas2oul_toswir', 'mas2oul_mounet', 'ka2ed_idare')
    );

CREATE POLICY "Troop leaders manage own troop events" ON public.events 
    FOR ALL USING (
        troop_id = get_auth_troop_id()
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Select events scoped to group or troop" ON public.events 
    FOR SELECT USING (
        group_id = get_auth_group_id()
        OR troop_id = get_auth_troop_id()
    );

-- Attendance policies
CREATE POLICY "Troop leaders write attendance sheets" ON public.attendance 
    FOR ALL USING (
        troop_id = get_auth_troop_id()
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Group leaders view attendance sheets" ON public.attendance 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.troops t 
            WHERE t.id = public.attendance.troop_id 
              AND t.group_id = get_auth_group_id()
        )
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_serr_group')
    );

CREATE POLICY "Troop leaders write attendance records" ON public.attendance_records 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.attendance a
            WHERE a.id = public.attendance_records.attendance_id
              AND a.troop_id = get_auth_troop_id()
        )
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Group leaders view attendance records" ON public.attendance_records 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.attendance a
            JOIN public.troops t ON a.troop_id = t.id
            WHERE a.id = public.attendance_records.attendance_id
              AND t.group_id = get_auth_group_id()
        )
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_serr_group')
    );

-- Financials: Dues & Payments policies
CREATE POLICY "Troop leaders bill dues and record draft payments" ON public.member_dues 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m 
            WHERE m.id = public.member_dues.member_id 
              AND m.troop_id = get_auth_troop_id()
        )
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Group treasurer full dues management" ON public.member_dues 
    FOR ALL USING (
        get_auth_role() = 'amin_sandou2_group'
        AND EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = public.member_dues.member_id
              AND m.group_id = get_auth_group_id()
        )
    );

CREATE POLICY "Group leaders view dues rosters" ON public.member_dues 
    FOR SELECT USING (
        get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe')
        AND EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = public.member_dues.member_id
              AND m.group_id = get_auth_group_id()
        )
    );

CREATE POLICY "Dues payments policy" ON public.member_payments 
    FOR ALL USING (
        get_auth_role() = 'amin_sandou2_group'
        AND EXISTS (
            SELECT 1 FROM public.member_dues md
            JOIN public.members m ON md.member_id = m.id
            WHERE md.id = public.member_payments.member_due_id
              AND m.group_id = get_auth_group_id()
        )
    );

CREATE POLICY "Troop leaders write payment drafts" ON public.member_payments 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.member_dues md
            JOIN public.members m ON md.member_id = m.id
            WHERE md.id = member_due_id
              AND m.troop_id = get_auth_troop_id()
        )
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Troop leaders view payments drafts" ON public.member_payments 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.member_dues md
            JOIN public.members m ON md.member_id = m.id
            WHERE md.id = public.member_payments.member_due_id
              AND m.troop_id = get_auth_troop_id()
        )
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

-- Financials: Treasury Transactions policies
CREATE POLICY "Group treasurer manage transactions" ON public.treasury_transactions 
    FOR ALL USING (
        group_id = get_auth_group_id()
        AND get_auth_role() = 'amin_sandou2_group'
    );

CREATE POLICY "Group leaders view transactions and approve them" ON public.treasury_transactions 
    FOR ALL USING (
        group_id = get_auth_group_id()
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe')
    );

CREATE POLICY "Troop leaders create expense drafts and view troop transactions" ON public.treasury_transactions 
    FOR ALL USING (
        troop_id = get_auth_troop_id()
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

-- Inventory & Checkouts policies
CREATE POLICY "Quartermaster inventory management" ON public.quartermaster_inventory 
    FOR ALL USING (
        group_id = get_auth_group_id()
        AND get_auth_role() = 'amin_tejhizet_group'
    );

CREATE POLICY "Group leaders view inventory" ON public.quartermaster_inventory 
    FOR SELECT USING (
        group_id = get_auth_group_id()
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe')
    );

CREATE POLICY "Troop leaders request gear checkouts" ON public.quartermaster_inventory 
    FOR SELECT USING (
        group_id = get_auth_group_id()
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

CREATE POLICY "Quartermaster checkouts handling" ON public.inventory_checkouts 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quartermaster_inventory qi
            WHERE qi.id = public.inventory_checkouts.item_id
              AND qi.group_id = get_auth_group_id()
        )
        AND get_auth_role() = 'amin_tejhizet_group'
    );

CREATE POLICY "Troop leaders place inventory checkouts request" ON public.inventory_checkouts 
    FOR ALL USING (
        checked_out_to = auth.uid()
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );

-- Camp Provisions (Food planning) policies
CREATE POLICY "Mas2oul Mounet full access to provisions" ON public.camp_provisions 
    FOR ALL USING (
        get_auth_role() = 'mas2oul_mounet'
        AND EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public.camp_provisions.event_id
              AND e.group_id = get_auth_group_id()
        )
    );

CREATE POLICY "Group leaders view provisions list" ON public.camp_provisions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public.camp_provisions.event_id
              AND e.group_id = get_auth_group_id()
        )
        AND get_auth_role() IN ('chef_groupe', 'assistant_chef_groupe', 'amin_sandou2_group')
    );

CREATE POLICY "Troop leaders view and pack camp provisions" ON public.camp_provisions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public.camp_provisions.event_id
              AND e.troop_id = get_auth_troop_id()
        )
        AND get_auth_role() IN ('ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
    );
