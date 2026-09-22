const fs = require('fs');

const dict = JSON.parse(fs.readFileSync('scratch/bilingual_members_dictionary.json'));

let sql = `-- =========================================================================
-- MIGRATION: 20260922040000_bilingual_member_names.sql
-- Description: Add bilingual (English and Arabic) columns and populate all 91 members
-- =========================================================================

-- 1. Add bilingual columns if they do not exist
ALTER TABLE public.members 
    ADD COLUMN IF NOT EXISTS first_name_ar TEXT,
    ADD COLUMN IF NOT EXISTS last_name_ar TEXT,
    ADD COLUMN IF NOT EXISTS father_name_ar TEXT,
    ADD COLUMN IF NOT EXISTS mother_name_ar TEXT,
    ADD COLUMN IF NOT EXISTS first_name_en TEXT,
    ADD COLUMN IF NOT EXISTS last_name_en TEXT,
    ADD COLUMN IF NOT EXISTS father_name_en TEXT,
    ADD COLUMN IF NOT EXISTS mother_name_en TEXT;

-- 2. Populate all 91 members with standardized English & Arabic names
`;

const escapeSql = (str) => {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
};

dict.forEach((m, idx) => {
  sql += `
-- [${idx + 1}/91] ${m.first_name_en} ${m.last_name_en} (${m.first_name_ar} ${m.last_name_ar})
UPDATE public.members
SET
    first_name = ${escapeSql(m.first_name_en)},
    last_name = ${escapeSql(m.last_name_en)},
    father_name = ${escapeSql(m.father_name_en)},
    mother_name = ${escapeSql(m.mother_name_en)},
    first_name_en = ${escapeSql(m.first_name_en)},
    last_name_en = ${escapeSql(m.last_name_en)},
    father_name_en = ${escapeSql(m.father_name_en)},
    mother_name_en = ${escapeSql(m.mother_name_en)},
    first_name_ar = ${escapeSql(m.first_name_ar)},
    last_name_ar = ${escapeSql(m.last_name_ar)},
    father_name_ar = ${escapeSql(m.father_name_ar)},
    mother_name_ar = ${escapeSql(m.mother_name_ar)}
WHERE id = '${m.id}';
`;
});

fs.writeFileSync('supabase/migrations/20260922040000_bilingual_member_names.sql', sql);
console.log('Successfully generated complete bilingual migration SQL with', dict.length, 'members!');
