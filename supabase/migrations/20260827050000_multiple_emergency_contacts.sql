-- Migration: Add emergency_contacts JSONB column to members
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;

-- Backfill existing single emergency contact records if emergency_contacts is empty
UPDATE public.members
SET emergency_contacts = jsonb_build_array(
  jsonb_build_object(
    'name', COALESCE(emergency_contact_name, ''),
    'relation', COALESCE(emergency_contact_relation, ''),
    'phone', COALESCE(emergency_contact_phone, '')
  )
)
WHERE (emergency_contacts IS NULL OR jsonb_array_length(emergency_contacts) = 0)
  AND (emergency_contact_name IS NOT NULL AND emergency_contact_name != '');
