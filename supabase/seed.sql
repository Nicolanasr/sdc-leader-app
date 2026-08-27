-- Database Seeding Data
-- Date: 2026-08-26
-- Author: Scouts des Cèdres Manager

-- 1. Insert Predefined System Roles with permission_scope
INSERT INTO public.roles (id, name, permission_scope) VALUES
    (gen_random_uuid(), 'configurator', 'configurator'),
    (gen_random_uuid(), 'chef_groupe', 'chef_groupe'),
    (gen_random_uuid(), 'assistant_chef_groupe', 'assistant_chef_groupe'),
    (gen_random_uuid(), 'amin_serr_group', 'amin_serr_group'),
    (gen_random_uuid(), 'amin_sandou2_group', 'amin_sandou2_group'),
    (gen_random_uuid(), 'amin_tejhizet_group', 'amin_tejhizet_group'),
    (gen_random_uuid(), 'mas2oul_toswir', 'mas2oul_toswir'),
    (gen_random_uuid(), 'mas2oul_mounet', 'mas2oul_mounet'),
    (gen_random_uuid(), 'ka2ed_idare', 'ka2ed_idare'),
    (gen_random_uuid(), 'ka2ed_fer2a', 'ka2ed_fer2a'),
    (gen_random_uuid(), 'mouse3ed_ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a')
ON CONFLICT (name) DO UPDATE SET permission_scope = EXCLUDED.permission_scope;

-- 2. Insert Standard Dynamic Sections (Fera2 Type Classifications)
INSERT INTO public.section_types (id, name, min_age, max_age) VALUES
    (gen_random_uuid(), 'Jaramiz', 7, 11),
    (gen_random_uuid(), 'Zaharat', 7, 11),
    (gen_random_uuid(), 'Kechefe', 12, 16),
    (gen_random_uuid(), 'Mourchidet', 12, 16),
    (gen_random_uuid(), 'Jouwele', 17, 21),
    (gen_random_uuid(), 'Mounjidet', 17, 21)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Predefined Ranks
INSERT INTO public.ranks (id, name) VALUES
    (gen_random_uuid(), 'Woodbadge'),
    (gen_random_uuid(), 'Ka2ed'),
    (gen_random_uuid(), 'Mouse3ed'),
    (gen_random_uuid(), '3arif Awwal'),
    (gen_random_uuid(), '3arif'),
    (gen_random_uuid(), 'Mse3ed 3arif')
ON CONFLICT (name) DO NOTHING;

-- 4. Insert Predefined Responsibilities (Mahemm)
INSERT INTO public.responsibilities (id, name) VALUES
    (gen_random_uuid(), 'Group Leader'),
    (gen_random_uuid(), 'Assistant Group Leader'),
    (gen_random_uuid(), 'Group Secretary'),
    (gen_random_uuid(), 'Group Treasurer'),
    (gen_random_uuid(), 'Group Quartermaster'),
    (gen_random_uuid(), 'Photographer'),
    (gen_random_uuid(), 'Supplies Manager'),
    (gen_random_uuid(), 'Council Member'),
    (gen_random_uuid(), 'Troop Leader'),
    (gen_random_uuid(), 'Assistant Troop Leader')
ON CONFLICT (name) DO NOTHING;
