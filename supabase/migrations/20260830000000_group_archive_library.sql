-- Migration: Create group_archive_items for Scout Library & Media Archive
-- Date: 2026-08-30
-- Description: Centralized store for scout books, training materials, songbook (MP3s/lyrics), ceremonials, brand assets, maps, and safety guides.

CREATE TABLE IF NOT EXISTS public.group_archive_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'books_manuals',
        'training_materials',
        'songs_chansonnier',
        'ceremonials_prayers',
        'brand_assets',
        'maps_blueprints',
        'safety_protocols',
        'admin_archives'
    )),
    branch_scope TEXT NOT NULL DEFAULT 'all',
    media_type TEXT NOT NULL DEFAULT 'pdf' CHECK (media_type IN (
        'pdf',
        'audio',
        'youtube',
        'image',
        'doc',
        'link'
    )),
    file_url TEXT,
    drive_file_id TEXT,
    youtube_url TEXT,
    lyrics_text TEXT,
    chords_text TEXT,
    author_composer TEXT,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    file_size_bytes BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant filtering and searching
CREATE INDEX IF NOT EXISTS idx_group_archive_group_cat ON public.group_archive_items(group_id, category, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_archive_branch ON public.group_archive_items(group_id, branch_scope, is_deleted);
CREATE INDEX IF NOT EXISTS idx_group_archive_media ON public.group_archive_items(media_type, is_deleted);

-- Enable RLS
ALTER TABLE public.group_archive_items ENABLE ROW LEVEL SECURITY;

-- 1. All authenticated leaders in the group can view non-deleted archive items
CREATE POLICY "Group leaders can view archive items"
ON public.group_archive_items FOR SELECT
TO authenticated
USING (
    is_deleted = FALSE AND (
        group_id = (auth.jwt() -> 'app_metadata' ->> 'group_id')::UUID
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator'
    )
);

-- 2. Group Leaders (Chef de Groupe, Assistant, Secrétaire, Configurator) can insert items
CREATE POLICY "Group managers can insert archive items"
ON public.group_archive_items FOR INSERT
TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'configurator'
    )
    AND (
        group_id = (auth.jwt() -> 'app_metadata' ->> 'group_id')::UUID
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator'
    )
);

-- 3. Group managers can update archive items
CREATE POLICY "Group managers can update archive items"
ON public.group_archive_items FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'configurator'
    )
    AND (
        group_id = (auth.jwt() -> 'app_metadata' ->> 'group_id')::UUID
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator'
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'configurator'
    )
    AND (
        group_id = (auth.jwt() -> 'app_metadata' ->> 'group_id')::UUID
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator'
    )
);

-- 4. Group managers can delete archive items
CREATE POLICY "Group managers can delete archive items"
ON public.group_archive_items FOR DELETE
TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'chef_groupe',
        'assistant_chef_groupe',
        'amin_serr_group',
        'configurator'
    )
    AND (
        group_id = (auth.jwt() -> 'app_metadata' ->> 'group_id')::UUID
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'configurator'
    )
);
