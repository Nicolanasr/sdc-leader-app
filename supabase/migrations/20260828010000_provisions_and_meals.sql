-- =========================================================================
-- CAMP PROVISIONS & MEAL PLANNING (MAS2OUL MOUNET) SCHEMA
-- =========================================================================

-- 1. Central Group Pantry Inventory
CREATE TABLE IF NOT EXISTS public.group_pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'grains_pasta', -- grains_pasta, canned_goods, spices_condiments, beverages_tea, breakfast_spreads, oils_fats, consumables_hygiene, other
    quantity_total NUMERIC NOT NULL DEFAULT 1,
    quantity_available NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'kg', -- kg, g, liters, cans, packs, bottles, boxes, pieces, loaves
    location_stored TEXT DEFAULT 'Pantry Shelf A',
    expiry_date DATE,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Event Meal Plans (Per Day & Meal Slot)
CREATE TABLE IF NOT EXISTS public.event_meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL DEFAULT 1,
    meal_type TEXT NOT NULL DEFAULT 'breakfast', -- 'breakfast', 'lunch', 'dinner', 'snack', 'custom'
    meal_title TEXT NOT NULL DEFAULT 'Breakfast',
    recipe_name TEXT,
    headcount_override INTEGER,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Meal Plan Recipe Ingredients
CREATE TABLE IF NOT EXISTS public.event_meal_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES public.event_meal_plans(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    portion_per_person NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'g', -- g, kg, pieces, cans, loaves, packs, ml, liters
    category TEXT NOT NULL DEFAULT 'supermarket', -- bakery, butchery, produce, supermarket, pantry, supplies
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Event Pantry Transfer Requests (from Group Central Pantry)
CREATE TABLE IF NOT EXISTS public.event_pantry_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    pantry_item_id UUID NOT NULL REFERENCES public.group_pantry_items(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'kg',
    status TEXT NOT NULL DEFAULT 'requested', -- 'requested', 'approved', 'received'
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Event Local Grocery Shopping Checklist
CREATE TABLE IF NOT EXISTS public.event_shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'supermarket', -- bakery, butchery, produce, supermarket, supplies
    quantity_needed NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'kg',
    is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
    purchased_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    estimated_cost NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.group_pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_meal_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pantry_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users
CREATE POLICY "Authenticated users can view group pantry items"
    ON public.group_pantry_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert group pantry items"
    ON public.group_pantry_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update group pantry items"
    ON public.group_pantry_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage event meal plans"
    ON public.event_meal_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage event meal ingredients"
    ON public.event_meal_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage event pantry requests"
    ON public.event_pantry_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage event shopping list items"
    ON public.event_shopping_list_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
