-- =========================================================================
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

-- [1/91] Alex Mouannes (أليكس موعنّس)
UPDATE public.members
SET
    first_name = 'Alex',
    last_name = 'Mouannes',
    father_name = NULL,
    mother_name = NULL,
    first_name_en = 'Alex',
    last_name_en = 'Mouannes',
    father_name_en = NULL,
    mother_name_en = NULL,
    first_name_ar = 'أليكس',
    last_name_ar = 'موعنّس',
    father_name_ar = NULL,
    mother_name_ar = NULL
WHERE id = '8354d40e-160d-4b73-907b-53e8239036a6';

-- [2/91] Antoine-Charbel Issa (أنطوان شربل عيسى)
UPDATE public.members
SET
    first_name = 'Antoine-Charbel',
    last_name = 'Issa',
    father_name = 'Pierre Issa',
    mother_name = 'Jacqueline El Khoury',
    first_name_en = 'Antoine-Charbel',
    last_name_en = 'Issa',
    father_name_en = 'Pierre Issa',
    mother_name_en = 'Jacqueline El Khoury',
    first_name_ar = 'أنطوان شربل',
    last_name_ar = 'عيسى',
    father_name_ar = 'بيار عيسى',
    mother_name_ar = 'جاكلين الخوري'
WHERE id = '754ad2bc-0215-4818-af31-36fd0ae28536';

-- [3/91] Anthony-Joe Sfeir (أنطوني-جو صفير)
UPDATE public.members
SET
    first_name = 'Anthony-Joe',
    last_name = 'Sfeir',
    father_name = 'Marc-Antoine Sfeir',
    mother_name = 'Alexandra Kallab',
    first_name_en = 'Anthony-Joe',
    last_name_en = 'Sfeir',
    father_name_en = 'Marc-Antoine Sfeir',
    mother_name_en = 'Alexandra Kallab',
    first_name_ar = 'أنطوني-جو',
    last_name_ar = 'صفير',
    father_name_ar = 'مارك-أنطوان صفير',
    mother_name_ar = 'ألكسندرا قلاب'
WHERE id = 'a49120c3-8419-4a18-ba66-54e2021a1d7e';

-- [4/91] Charbel Zeidan (شربل زيدان)
UPDATE public.members
SET
    first_name = 'Charbel',
    last_name = 'Zeidan',
    father_name = 'Wahib Zeidan',
    mother_name = 'Pauline Abi Raad',
    first_name_en = 'Charbel',
    last_name_en = 'Zeidan',
    father_name_en = 'Wahib Zeidan',
    mother_name_en = 'Pauline Abi Raad',
    first_name_ar = 'شربل',
    last_name_ar = 'زيدان',
    father_name_ar = 'وهيب زيدان',
    mother_name_ar = 'بولين أبي رعد'
WHERE id = '73c74c53-6787-4a1a-9131-9a9049af5353';

-- [5/91] Charbel Sfeir (شربل صفير)
UPDATE public.members
SET
    first_name = 'Charbel',
    last_name = 'Sfeir',
    father_name = 'Dib Sfeir',
    mother_name = 'Majida Ghawi',
    first_name_en = 'Charbel',
    last_name_en = 'Sfeir',
    father_name_en = 'Dib Sfeir',
    mother_name_en = 'Majida Ghawi',
    first_name_ar = 'شربل',
    last_name_ar = 'صفير',
    father_name_ar = 'ديب صفير',
    mother_name_ar = 'ماجدة غاوي'
WHERE id = '563ded06-8e6e-4788-84f4-b64f12783a53';

-- [6/91] Christiano Geara (كريستيانو جعارة)
UPDATE public.members
SET
    first_name = 'Christiano',
    last_name = 'Geara',
    father_name = 'Imad Geara',
    mother_name = 'Marianne',
    first_name_en = 'Christiano',
    last_name_en = 'Geara',
    father_name_en = 'Imad Geara',
    mother_name_en = 'Marianne',
    first_name_ar = 'كريستيانو',
    last_name_ar = 'جعارة',
    father_name_ar = 'عماد جعارة',
    mother_name_ar = 'ماريان'
WHERE id = '9a307810-3464-42b8-8a0c-8eac5533aeb9';

-- [7/91] Elaya Zgheib (إيلايا زغيب)
UPDATE public.members
SET
    first_name = 'Elaya',
    last_name = 'Zgheib',
    father_name = 'Nadim Zgheib',
    mother_name = 'Nancy Gerges',
    first_name_en = 'Elaya',
    last_name_en = 'Zgheib',
    father_name_en = 'Nadim Zgheib',
    mother_name_en = 'Nancy Gerges',
    first_name_ar = 'إيلايا',
    last_name_ar = 'زغيب',
    father_name_ar = 'نديم زغيب',
    mother_name_ar = 'نانسي جرجس'
WHERE id = '6573fe5c-77d2-4f4e-a450-de49eb58246f';

-- [8/91] Elias Daher (إلياس ضاهر)
UPDATE public.members
SET
    first_name = 'Elias',
    last_name = 'Daher',
    father_name = 'Chady Daher',
    mother_name = 'Oula Beainy',
    first_name_en = 'Elias',
    last_name_en = 'Daher',
    father_name_en = 'Chady Daher',
    mother_name_en = 'Oula Beainy',
    first_name_ar = 'إلياس',
    last_name_ar = 'ضاهر',
    father_name_ar = 'شادي ضاهر',
    mother_name_ar = 'علا بعيني'
WHERE id = '7ca31d0d-424c-43b6-9280-bbe8a6f94f0b';

-- [9/91] Elias Zgheib (إلياس زغيب)
UPDATE public.members
SET
    first_name = 'Elias',
    last_name = 'Zgheib',
    father_name = 'Nadim Zgheib',
    mother_name = 'Nancy Gerges',
    first_name_en = 'Elias',
    last_name_en = 'Zgheib',
    father_name_en = 'Nadim Zgheib',
    mother_name_en = 'Nancy Gerges',
    first_name_ar = 'إلياس',
    last_name_ar = 'زغيب',
    father_name_ar = 'نديم زغيب',
    mother_name_ar = 'نانسي جرجس'
WHERE id = '29def7fb-330b-4361-9e9a-3cb779a082fc';

-- [10/91] Ghinwa Ounaissy (غنوة عويسي)
UPDATE public.members
SET
    first_name = 'Ghinwa',
    last_name = 'Ounaissy',
    father_name = 'Ramzy Ounaissy',
    mother_name = 'Lina Abi Chebel',
    first_name_en = 'Ghinwa',
    last_name_en = 'Ounaissy',
    father_name_en = 'Ramzy Ounaissy',
    mother_name_en = 'Lina Abi Chebel',
    first_name_ar = 'غنوة',
    last_name_ar = 'عويسي',
    father_name_ar = 'رمزي عويسي',
    mother_name_ar = 'لينا أبي شبل'
WHERE id = 'd522a2d4-0234-42a3-a593-3141cfcb6791';

-- [11/91] Gina-Maria Sfeir (جينا-ماريا صفير)
UPDATE public.members
SET
    first_name = 'Gina-Maria',
    last_name = 'Sfeir',
    father_name = 'Marc-Antoine Sfeir',
    mother_name = 'Alexandra Kallab',
    first_name_en = 'Gina-Maria',
    last_name_en = 'Sfeir',
    father_name_en = 'Marc-Antoine Sfeir',
    mother_name_en = 'Alexandra Kallab',
    first_name_ar = 'جينا-ماريا',
    last_name_ar = 'صفير',
    father_name_ar = 'مارك-أنطوان صفير',
    mother_name_ar = 'ألكسندرا قلاب'
WHERE id = '6e4392f9-ca4d-41a0-ae23-9bd5fc4b9755';

-- [12/91] Jeanina Zgheib (جانين زغيب)
UPDATE public.members
SET
    first_name = 'Jeanina',
    last_name = 'Zgheib',
    father_name = 'Naoum Zgheib',
    mother_name = 'Lama Saliba',
    first_name_en = 'Jeanina',
    last_name_en = 'Zgheib',
    father_name_en = 'Naoum Zgheib',
    mother_name_en = 'Lama Saliba',
    first_name_ar = 'جانين',
    last_name_ar = 'زغيب',
    father_name_ar = 'نعوم زغيب',
    mother_name_ar = 'لمى صليبا'
WHERE id = '8a427d36-009e-4b68-8edf-1e33f5871028';

-- [13/91] Julio Ibrahim (جوليو إبراهيم)
UPDATE public.members
SET
    first_name = 'Julio',
    last_name = 'Ibrahim',
    father_name = NULL,
    mother_name = 'Joyce Yacoub',
    first_name_en = 'Julio',
    last_name_en = 'Ibrahim',
    father_name_en = NULL,
    mother_name_en = 'Joyce Yacoub',
    first_name_ar = 'جوليو',
    last_name_ar = 'إبراهيم',
    father_name_ar = NULL,
    mother_name_ar = 'جويس يعقوب'
WHERE id = '091e788e-38ca-4948-bdf8-44abadd4feca';

-- [14/91] Joseph El Kallab (جوزف القلاب)
UPDATE public.members
SET
    first_name = 'Joseph',
    last_name = 'El Kallab',
    father_name = 'Pierre El Kallab',
    mother_name = 'Roula Nassar',
    first_name_en = 'Joseph',
    last_name_en = 'El Kallab',
    father_name_en = 'Pierre El Kallab',
    mother_name_en = 'Roula Nassar',
    first_name_ar = 'جوزف',
    last_name_ar = 'القلاب',
    father_name_ar = 'بيار القلاب',
    mother_name_ar = 'رولا نصار'
WHERE id = '9b3ad938-67a9-400e-a202-eb7295f285fb';

-- [15/91] Jovia Zgheib (جوفيا زغيب)
UPDATE public.members
SET
    first_name = 'Jovia',
    last_name = 'Zgheib',
    father_name = 'Joe Zgheib',
    mother_name = 'Patricia Sarkis Zgheib',
    first_name_en = 'Jovia',
    last_name_en = 'Zgheib',
    father_name_en = 'Joe Zgheib',
    mother_name_en = 'Patricia Sarkis Zgheib',
    first_name_ar = 'جوفيا',
    last_name_ar = 'زغيب',
    father_name_ar = 'جو زغيب',
    mother_name_ar = 'باتريسيا سركيس زغيب'
WHERE id = 'b79bdfbf-97f5-4715-9dd3-3c916e8c73e1';

-- [16/91] Lorenzo Geara (لورنزو جعارة)
UPDATE public.members
SET
    first_name = 'Lorenzo',
    last_name = 'Geara',
    father_name = 'Imad Geara',
    mother_name = 'Mariam Moussa',
    first_name_en = 'Lorenzo',
    last_name_en = 'Geara',
    father_name_en = 'Imad Geara',
    mother_name_en = 'Mariam Moussa',
    first_name_ar = 'لورنزو',
    last_name_ar = 'جعارة',
    father_name_ar = 'عماد جعارة',
    mother_name_ar = 'مريم موسى'
WHERE id = 'c1675e70-7628-49b3-9223-690dd5af7254';

-- [17/91] Mael Abboud (مايل عبود)
UPDATE public.members
SET
    first_name = 'Mael',
    last_name = 'Abboud',
    father_name = 'Michael Abboud',
    mother_name = 'Giselle Zgheib',
    first_name_en = 'Mael',
    last_name_en = 'Abboud',
    father_name_en = 'Michael Abboud',
    mother_name_en = 'Giselle Zgheib',
    first_name_ar = 'مايل',
    last_name_ar = 'عبود',
    father_name_ar = 'مايكل عبود',
    mother_name_ar = 'جيزيل زغيب'
WHERE id = 'cd0ef865-2f80-44cd-9ac8-17cda1e207a3';

-- [18/91] Marcelino Geara (مارسيلينو جعارة)
UPDATE public.members
SET
    first_name = 'Marcelino',
    last_name = 'Geara',
    father_name = 'Salim Geara',
    mother_name = 'Lara Atallah Geara',
    first_name_en = 'Marcelino',
    last_name_en = 'Geara',
    father_name_en = 'Salim Geara',
    mother_name_en = 'Lara Atallah Geara',
    first_name_ar = 'مارسيلينو',
    last_name_ar = 'جعارة',
    father_name_ar = 'سليم جعارة',
    mother_name_ar = 'لارا عطالله جعارة'
WHERE id = '9a1ce486-044c-4e3f-bf00-640e85ea323b';

-- [19/91] Maria Geara (ماريا جعارة)
UPDATE public.members
SET
    first_name = 'Maria',
    last_name = 'Geara',
    father_name = 'Salim Geara',
    mother_name = 'Lara Atallah',
    first_name_en = 'Maria',
    last_name_en = 'Geara',
    father_name_en = 'Salim Geara',
    mother_name_en = 'Lara Atallah',
    first_name_ar = 'ماريا',
    last_name_ar = 'جعارة',
    father_name_ar = 'سليم جعارة',
    mother_name_ar = 'لارا عطالله'
WHERE id = '4cbae529-cdfe-49f4-b7c7-86bc33a58c1f';

-- [20/91] Marissa Salameh (ماريسا سلامة)
UPDATE public.members
SET
    first_name = 'Marissa',
    last_name = 'Salameh',
    father_name = 'Moussa Salameh',
    mother_name = 'Lara Mansour Salameh',
    first_name_en = 'Marissa',
    last_name_en = 'Salameh',
    father_name_en = 'Moussa Salameh',
    mother_name_en = 'Lara Mansour Salameh',
    first_name_ar = 'ماريسا',
    last_name_ar = 'سلامة',
    father_name_ar = 'موسى سلامة',
    mother_name_ar = 'لارا منصور سلامة'
WHERE id = 'ae7b534f-506e-457f-a299-29acf991bb16';

-- [21/91] Matheo Geitany (ماتيو غيطاني)
UPDATE public.members
SET
    first_name = 'Matheo',
    last_name = 'Geitany',
    father_name = 'Miguel Geitany',
    mother_name = 'Lara Ayoub',
    first_name_en = 'Matheo',
    last_name_en = 'Geitany',
    father_name_en = 'Miguel Geitany',
    mother_name_en = 'Lara Ayoub',
    first_name_ar = 'ماتيو',
    last_name_ar = 'غيطاني',
    father_name_ar = 'ميغيل غيطاني',
    mother_name_ar = 'لارا أيوب'
WHERE id = '21669126-8669-4057-8a37-43d4d65ee45a';

-- [22/91] Mia-Belle Mattar (ميا-بيل مطر)
UPDATE public.members
SET
    first_name = 'Mia-Belle',
    last_name = 'Mattar',
    father_name = 'Bassem Mattar',
    mother_name = 'Marie-Noel Zghondy',
    first_name_en = 'Mia-Belle',
    last_name_en = 'Mattar',
    father_name_en = 'Bassem Mattar',
    mother_name_en = 'Marie-Noel Zghondy',
    first_name_ar = 'ميا-بيل',
    last_name_ar = 'مطر',
    father_name_ar = 'باسم مطر',
    mother_name_ar = 'ماري-نويل زغوندي'
WHERE id = '13366bc8-3c07-47b5-9eb3-d6ba9e3e6e2d';

-- [23/91] Michael Bassil (مايكل باسيل)
UPDATE public.members
SET
    first_name = 'Michael',
    last_name = 'Bassil',
    father_name = 'Paul Bassil',
    mother_name = 'Najat Zouein',
    first_name_en = 'Michael',
    last_name_en = 'Bassil',
    father_name_en = 'Paul Bassil',
    mother_name_en = 'Najat Zouein',
    first_name_ar = 'مايكل',
    last_name_ar = 'باسيل',
    father_name_ar = 'بول باسيل',
    mother_name_ar = 'نجاة زوين'
WHERE id = 'dd5029d8-f62e-4b80-b9b2-e1e2cbc99f58';

-- [24/91] Nady Mattar (نادي مطر)
UPDATE public.members
SET
    first_name = 'Nady',
    last_name = 'Mattar',
    father_name = 'Bassem Mattar',
    mother_name = 'Marie-Noel Zghondy',
    first_name_en = 'Nady',
    last_name_en = 'Mattar',
    father_name_en = 'Bassem Mattar',
    mother_name_en = 'Marie-Noel Zghondy',
    first_name_ar = 'نادي',
    last_name_ar = 'مطر',
    father_name_ar = 'باسم مطر',
    mother_name_ar = 'ماري-نويل زغوندي'
WHERE id = 'cf76a7b1-fa6d-468c-9743-d32ce9a9118c';

-- [25/91] Nicolas Nasr (نقولا نصر)
UPDATE public.members
SET
    first_name = 'Nicolas',
    last_name = 'Nasr',
    father_name = NULL,
    mother_name = NULL,
    first_name_en = 'Nicolas',
    last_name_en = 'Nasr',
    father_name_en = NULL,
    mother_name_en = NULL,
    first_name_ar = 'نقولا',
    last_name_ar = 'نصر',
    father_name_ar = NULL,
    mother_name_ar = NULL
WHERE id = '263f8454-7e94-4e83-bc15-f3d78d5dfa3d';

-- [26/91] Pierre El Kallab (بيار القلاب)
UPDATE public.members
SET
    first_name = 'Pierre',
    last_name = 'El Kallab',
    father_name = 'Pierre El Kallab',
    mother_name = 'Roula Nassar',
    first_name_en = 'Pierre',
    last_name_en = 'El Kallab',
    father_name_en = 'Pierre El Kallab',
    mother_name_en = 'Roula Nassar',
    first_name_ar = 'بيار',
    last_name_ar = 'القلاب',
    father_name_ar = 'بيار القلاب',
    mother_name_ar = 'رولا نصار'
WHERE id = '11bd433c-aae7-4709-b64d-793c8a305647';

-- [27/91] Ramez Abboud (رامز عبود)
UPDATE public.members
SET
    first_name = 'Ramez',
    last_name = 'Abboud',
    father_name = 'Michael Abboud',
    mother_name = 'Giselle Zgheib',
    first_name_en = 'Ramez',
    last_name_en = 'Abboud',
    father_name_en = 'Michael Abboud',
    mother_name_en = 'Giselle Zgheib',
    first_name_ar = 'رامز',
    last_name_ar = 'عبود',
    father_name_ar = 'مايكل عبود',
    mother_name_ar = 'جيزيل زغيب'
WHERE id = '10defcd1-c21b-46a5-9714-5de3a18815cd';

-- [28/91] Reya Rizk (ريا رزق)
UPDATE public.members
SET
    first_name = 'Reya',
    last_name = 'Rizk',
    father_name = 'Tarek Rizk',
    mother_name = 'Marie Freyfer',
    first_name_en = 'Reya',
    last_name_en = 'Rizk',
    father_name_en = 'Tarek Rizk',
    mother_name_en = 'Marie Freyfer',
    first_name_ar = 'ريا',
    last_name_ar = 'رزق',
    father_name_ar = 'طارق رزق',
    mother_name_ar = 'ماري فريفر'
WHERE id = '53a24815-ba2c-40a1-9786-3bbfceab1dbc';

-- [29/91] Ricardo Geara (ريكاردو جعارة)
UPDATE public.members
SET
    first_name = 'Ricardo',
    last_name = 'Geara',
    father_name = NULL,
    mother_name = NULL,
    first_name_en = 'Ricardo',
    last_name_en = 'Geara',
    father_name_en = NULL,
    mother_name_en = NULL,
    first_name_ar = 'ريكاردو',
    last_name_ar = 'جعارة',
    father_name_ar = NULL,
    mother_name_ar = NULL
WHERE id = '09987dc2-65c8-43f1-8510-0525ca4ade0e';

-- [30/91] Ryan Abboud (راين عبود)
UPDATE public.members
SET
    first_name = 'Ryan',
    last_name = 'Abboud',
    father_name = 'Michael Abboud',
    mother_name = 'Giselle Zgheib',
    first_name_en = 'Ryan',
    last_name_en = 'Abboud',
    father_name_en = 'Michael Abboud',
    mother_name_en = 'Giselle Zgheib',
    first_name_ar = 'راين',
    last_name_ar = 'عبود',
    father_name_ar = 'مايكل عبود',
    mother_name_ar = 'جيزيل زغيب'
WHERE id = '6d4dc12e-e4f1-4ddc-abc2-f3f0aa617584';

-- [31/91] Serena Assaf (سيرينا عساف)
UPDATE public.members
SET
    first_name = 'Serena',
    last_name = 'Assaf',
    father_name = 'Elie Assaf',
    mother_name = 'Stephanie Fahed',
    first_name_en = 'Serena',
    last_name_en = 'Assaf',
    father_name_en = 'Elie Assaf',
    mother_name_en = 'Stephanie Fahed',
    first_name_ar = 'سيرينا',
    last_name_ar = 'عساف',
    father_name_ar = 'إيلي عساف',
    mother_name_ar = 'ستيفاني فهد'
WHERE id = '22caaed6-1c37-45d6-8497-d9af66b9a23e';

-- [32/91] William Noun (وليم نون)
UPDATE public.members
SET
    first_name = 'William',
    last_name = 'Noun',
    father_name = 'Andre-Charbel Noun',
    mother_name = 'Jennifer Saliba',
    first_name_en = 'William',
    last_name_en = 'Noun',
    father_name_en = 'Andre-Charbel Noun',
    mother_name_en = 'Jennifer Saliba',
    first_name_ar = 'وليم',
    last_name_ar = 'نون',
    father_name_ar = 'أندريه-شربل نون',
    mother_name_ar = 'جنيفر صليبا'
WHERE id = '90daf799-3c3e-4d17-9e43-6783fd5b1adc';

-- [33/91] Wendy Elias (ويندي إلياس)
UPDATE public.members
SET
    first_name = 'Wendy',
    last_name = 'Elias',
    father_name = 'Edward Elias',
    mother_name = 'Nisrine Habchy',
    first_name_en = 'Wendy',
    last_name_en = 'Elias',
    father_name_en = 'Edward Elias',
    mother_name_en = 'Nisrine Habchy',
    first_name_ar = 'ويندي',
    last_name_ar = 'إلياس',
    father_name_ar = 'إدوار إلياس',
    mother_name_ar = 'نسرين حبشي'
WHERE id = '28cc4e06-0d8a-425e-bf91-71f152b9b0ef';

-- [34/91] Angelina Khamis (أنجلينا خميس)
UPDATE public.members
SET
    first_name = 'Angelina',
    last_name = 'Khamis',
    father_name = 'Charbel Khamis',
    mother_name = 'Cynthia El Sayegh',
    first_name_en = 'Angelina',
    last_name_en = 'Khamis',
    father_name_en = 'Charbel Khamis',
    mother_name_en = 'Cynthia El Sayegh',
    first_name_ar = 'أنجلينا',
    last_name_ar = 'خميس',
    father_name_ar = 'شربل خميس',
    mother_name_ar = 'سينتيا الصايغ'
WHERE id = 'c0fe73cf-fcbb-42cc-a3e9-69ed5eed8a69';

-- [35/91] Edouard Basbous (إدوار بصبوص)
UPDATE public.members
SET
    first_name = 'Edouard',
    last_name = 'Basbous',
    father_name = 'Jawad Basbous',
    mother_name = 'Hanan Abi Charr',
    first_name_en = 'Edouard',
    last_name_en = 'Basbous',
    father_name_en = 'Jawad Basbous',
    mother_name_en = 'Hanan Abi Charr',
    first_name_ar = 'إدوار',
    last_name_ar = 'بصبوص',
    father_name_ar = 'جواد بصبوص',
    mother_name_ar = 'حنان أبي شر'
WHERE id = 'a300dd06-9bd5-4329-98dd-1279e19b0bc1';

-- [36/91] Angela Dwaydi (أنجيلا دويدي)
UPDATE public.members
SET
    first_name = 'Angela',
    last_name = 'Dwaydi',
    father_name = 'Milad Dwaydi',
    mother_name = 'Pauline Matta',
    first_name_en = 'Angela',
    last_name_en = 'Dwaydi',
    father_name_en = 'Milad Dwaydi',
    mother_name_en = 'Pauline Matta',
    first_name_ar = 'أنجيلا',
    last_name_ar = 'دويدي',
    father_name_ar = 'ميلاد دويدي',
    mother_name_ar = 'بولين متى'
WHERE id = '3bbbc266-93fa-48bc-9ba5-88d8ed14211f';

-- [37/91] Petra Howat (بترا حواط)
UPDATE public.members
SET
    first_name = 'Petra',
    last_name = 'Howat',
    father_name = 'Georges Howat',
    mother_name = 'Aida Zaarour',
    first_name_en = 'Petra',
    last_name_en = 'Howat',
    father_name_en = 'Georges Howat',
    mother_name_en = 'Aida Zaarour',
    first_name_ar = 'بترا',
    last_name_ar = 'حواط',
    father_name_ar = 'جورج حواط',
    mother_name_ar = 'عايدة زعرور'
WHERE id = '49591ce3-7ed5-4d80-9e2b-b68a4b561d40';

-- [38/91] Petro Boutros (بترو بطرس)
UPDATE public.members
SET
    first_name = 'Petro',
    last_name = 'Boutros',
    father_name = 'Georges Boutros',
    mother_name = 'Claudette Nader',
    first_name_en = 'Petro',
    last_name_en = 'Boutros',
    father_name_en = 'Georges Boutros',
    mother_name_en = 'Claudette Nader',
    first_name_ar = 'بترو',
    last_name_ar = 'بطرس',
    father_name_ar = 'جورج بطرس',
    mother_name_ar = 'كلوديت نادر'
WHERE id = '99267114-0710-47e6-afb6-ea5259bc307e';

-- [39/91] Berny Sahyoun (برني صهيون)
UPDATE public.members
SET
    first_name = 'Berny',
    last_name = 'Sahyoun',
    father_name = 'Roger Sahyoun',
    mother_name = 'Nathalie Rizk',
    first_name_en = 'Berny',
    last_name_en = 'Sahyoun',
    father_name_en = 'Roger Sahyoun',
    mother_name_en = 'Nathalie Rizk',
    first_name_ar = 'برني',
    last_name_ar = 'صهيون',
    father_name_ar = 'روجيه صهيون',
    mother_name_ar = 'نتالي رزق'
WHERE id = '7128dc41-4c0a-41ad-a0ff-575fef01e6e4';

-- [40/91] Peter Haddad (بيتر حداد)
UPDATE public.members
SET
    first_name = 'Peter',
    last_name = 'Haddad',
    father_name = 'Tony Haddad',
    mother_name = 'Raymonde El Mejber',
    first_name_en = 'Peter',
    last_name_en = 'Haddad',
    father_name_en = 'Tony Haddad',
    mother_name_en = 'Raymonde El Mejber',
    first_name_ar = 'بيتر',
    last_name_ar = 'حداد',
    father_name_ar = 'طوني حداد',
    mother_name_ar = 'ريموندا المجبر'
WHERE id = '1993f2e3-ceef-493c-9266-db13d379ac4e';

-- [41/91] Petina Abi Hanna (بيتينا أبي حنا)
UPDATE public.members
SET
    first_name = 'Petina',
    last_name = 'Abi Hanna',
    father_name = 'Samir Abi Hanna',
    mother_name = 'Margherita Boutros',
    first_name_en = 'Petina',
    last_name_en = 'Abi Hanna',
    father_name_en = 'Samir Abi Hanna',
    mother_name_en = 'Margherita Boutros',
    first_name_ar = 'بيتينا',
    last_name_ar = 'أبي حنا',
    father_name_ar = 'سمير أبي حنا',
    mother_name_ar = 'مارغريتا بطرس'
WHERE id = '56badc8a-a355-46fe-95ca-d813550899cd';

-- [42/91] Jason Saba El Nemr (جايسون سابا النمر)
UPDATE public.members
SET
    first_name = 'Jason',
    last_name = 'Saba El Nemr',
    father_name = 'Saba El Nemr',
    mother_name = 'Jessica Sakr',
    first_name_en = 'Jason',
    last_name_en = 'Saba El Nemr',
    father_name_en = 'Saba El Nemr',
    mother_name_en = 'Jessica Sakr',
    first_name_ar = 'جايسون',
    last_name_ar = 'سابا النمر',
    father_name_ar = 'سابا النمر',
    mother_name_ar = 'جيسيكا صقر'
WHERE id = '7b397c9c-082b-46de-b83f-3929774c4cb2';

-- [43/91] Jinane El Youzbashi (جنان اليوزباشي)
UPDATE public.members
SET
    first_name = 'Jinane',
    last_name = 'El Youzbashi',
    father_name = 'Walid El Youzbashi',
    mother_name = 'Majida El Masri',
    first_name_en = 'Jinane',
    last_name_en = 'El Youzbashi',
    father_name_en = 'Walid El Youzbashi',
    mother_name_en = 'Majida El Masri',
    first_name_ar = 'جنان',
    last_name_ar = 'اليوزباشي',
    father_name_ar = 'وليد اليوزباشي',
    mother_name_ar = 'ماجدة المصري'
WHERE id = '6226b877-87a8-41a8-98d7-cd11e01106c1';

-- [44/91] Jana El Akouri (جنى العاقوري)
UPDATE public.members
SET
    first_name = 'Jana',
    last_name = 'El Akouri',
    father_name = 'Fadi El Akouri',
    mother_name = 'Abeer El Beaini',
    first_name_en = 'Jana',
    last_name_en = 'El Akouri',
    father_name_en = 'Fadi El Akouri',
    mother_name_en = 'Abeer El Beaini',
    first_name_ar = 'جنى',
    last_name_ar = 'العاقوري',
    father_name_ar = 'فادي العاقوري',
    mother_name_ar = 'عبير البعيني'
WHERE id = '522c87f7-fde7-42a9-991d-e49d2db851d9';

-- [45/91] Jennifer Hashem (جنيفر هاشم)
UPDATE public.members
SET
    first_name = 'Jennifer',
    last_name = 'Hashem',
    father_name = 'Pierre Hashem',
    mother_name = 'Janet Badaan',
    first_name_en = 'Jennifer',
    last_name_en = 'Hashem',
    father_name_en = 'Pierre Hashem',
    mother_name_en = 'Janet Badaan',
    first_name_ar = 'جنيفر',
    last_name_ar = 'هاشم',
    father_name_ar = 'بيار هاشم',
    mother_name_ar = 'جانيت بضعان'
WHERE id = 'ee2c20a5-29e8-4e52-bc5f-6f982dde14d2';

-- [46/91] Giovan Zgheib (جوفن زغيب)
UPDATE public.members
SET
    first_name = 'Giovan',
    last_name = 'Zgheib',
    father_name = 'Joe Zgheib',
    mother_name = 'Patricia Sarkis',
    first_name_en = 'Giovan',
    last_name_en = 'Zgheib',
    father_name_en = 'Joe Zgheib',
    mother_name_en = 'Patricia Sarkis',
    first_name_ar = 'جوفن',
    last_name_ar = 'زغيب',
    father_name_ar = 'جو زغيب',
    mother_name_ar = 'باتريسيا سركيس'
WHERE id = '2e88708c-c81c-4d91-a9fe-301688a4aa22';

-- [47/91] Joy Khamis (جوي خميس)
UPDATE public.members
SET
    first_name = 'Joy',
    last_name = 'Khamis',
    father_name = 'Charbel Khamis',
    mother_name = 'Cynthia El Sayegh',
    first_name_en = 'Joy',
    last_name_en = 'Khamis',
    father_name_en = 'Charbel Khamis',
    mother_name_en = 'Cynthia El Sayegh',
    first_name_ar = 'جوي',
    last_name_ar = 'خميس',
    father_name_ar = 'شربل خميس',
    mother_name_ar = 'سينتيا الصايغ'
WHERE id = '8564098a-8e3c-4f9c-9b9f-b441280cee0d';

-- [48/91] Danny El Rahi (داني الراعي)
UPDATE public.members
SET
    first_name = 'Danny',
    last_name = 'El Rahi',
    father_name = 'Roger El Rahi',
    mother_name = 'Aline Salameh',
    first_name_en = 'Danny',
    last_name_en = 'El Rahi',
    father_name_en = 'Roger El Rahi',
    mother_name_en = 'Aline Salameh',
    first_name_ar = 'داني',
    last_name_ar = 'الراعي',
    father_name_ar = 'روجيه الراعي',
    mother_name_ar = 'ألين سلامة'
WHERE id = '8355ce79-51d9-4e1c-8def-7cf94cbf91e3';

-- [49/91] Rayen Merhi (راين مرعي)
UPDATE public.members
SET
    first_name = 'Rayen',
    last_name = 'Merhi',
    father_name = 'Robert Merhi',
    mother_name = 'Rita Saade',
    first_name_en = 'Rayen',
    last_name_en = 'Merhi',
    father_name_en = 'Robert Merhi',
    mother_name_en = 'Rita Saade',
    first_name_ar = 'راين',
    last_name_ar = 'مرعي',
    father_name_ar = 'روبير مرعي',
    mother_name_ar = 'ريتا سعادة'
WHERE id = '662e9258-aa96-44ec-ad45-ca34d0bdb297';

-- [50/91] Racha Daher (رشا ضاهر)
UPDATE public.members
SET
    first_name = 'Racha',
    last_name = 'Daher',
    father_name = 'Chady Daher',
    mother_name = 'Oula Beainy',
    first_name_en = 'Racha',
    last_name_en = 'Daher',
    father_name_en = 'Chady Daher',
    mother_name_en = 'Oula Beainy',
    first_name_ar = 'رشا',
    last_name_ar = 'ضاهر',
    father_name_ar = 'شادي ضاهر',
    mother_name_ar = 'علا بعيني'
WHERE id = 'c0cf21f3-8b97-47c3-b7ca-c36e447f340c';

-- [51/91] Rudy El Rahi (رودي الراعي)
UPDATE public.members
SET
    first_name = 'Rudy',
    last_name = 'El Rahi',
    father_name = 'Roger El Rahi',
    mother_name = 'Aline Salameh',
    first_name_en = 'Rudy',
    last_name_en = 'El Rahi',
    father_name_en = 'Roger El Rahi',
    mother_name_en = 'Aline Salameh',
    first_name_ar = 'رودي',
    last_name_ar = 'الراعي',
    father_name_ar = 'روجيه الراعي',
    mother_name_ar = 'ألين سلامة'
WHERE id = '2dd3d9f3-bb78-497f-a370-023f1b4d1886';

-- [52/91] Rebecca Kamato (ريبيكا كماتو)
UPDATE public.members
SET
    first_name = 'Rebecca',
    last_name = 'Kamato',
    father_name = 'Imad Kamato',
    mother_name = 'Raeda Mahfouz',
    first_name_en = 'Rebecca',
    last_name_en = 'Kamato',
    father_name_en = 'Imad Kamato',
    mother_name_en = 'Raeda Mahfouz',
    first_name_ar = 'ريبيكا',
    last_name_ar = 'كماتو',
    father_name_ar = 'عماد كماتو',
    mother_name_ar = 'رائدة محفوظ'
WHERE id = 'b7b63c81-3274-4654-9bbb-f556d286967f';

-- [53/91] Rita Nicolas (ريتا نقولا)
UPDATE public.members
SET
    first_name = 'Rita',
    last_name = 'Nicolas',
    father_name = 'Alexi Nicolas',
    mother_name = 'Afaf Beaini',
    first_name_en = 'Rita',
    last_name_en = 'Nicolas',
    father_name_en = 'Alexi Nicolas',
    mother_name_en = 'Afaf Beaini',
    first_name_ar = 'ريتا',
    last_name_ar = 'نقولا',
    father_name_ar = 'ألكسي نقولا',
    mother_name_ar = 'عفاف بعيني'
WHERE id = '70a72645-76ee-4e0f-bfed-baf564eebdd1';

-- [54/91] Rim Yazbek (ريم يزبك)
UPDATE public.members
SET
    first_name = 'Rim',
    last_name = 'Yazbek',
    father_name = 'El Khoury Georges Yazbek',
    mother_name = 'Georgette Doumit Yazbek',
    first_name_en = 'Rim',
    last_name_en = 'Yazbek',
    father_name_en = 'El Khoury Georges Yazbek',
    mother_name_en = 'Georgette Doumit Yazbek',
    first_name_ar = 'ريم',
    last_name_ar = 'يزبك',
    father_name_ar = 'الخوري جورج يزبك',
    mother_name_ar = 'جورجات ضومط يزبك'
WHERE id = 'c3fe285f-3fb4-4c4c-ab14-a1875a0998f0';

-- [55/91] Reine Merhi (رين مرعي)
UPDATE public.members
SET
    first_name = 'Reine',
    last_name = 'Merhi',
    father_name = 'Robert Merhi',
    mother_name = 'Rita Saade',
    first_name_en = 'Reine',
    last_name_en = 'Merhi',
    father_name_en = 'Robert Merhi',
    mother_name_en = 'Rita Saade',
    first_name_ar = 'رين',
    last_name_ar = 'مرعي',
    father_name_ar = 'روبير مرعي',
    mother_name_ar = 'ريتا سعادة'
WHERE id = '19853bf9-e8ef-40ca-8359-24180e259029';

-- [56/91] Salia Zakaria (ساليا زكريا)
UPDATE public.members
SET
    first_name = 'Salia',
    last_name = 'Zakaria',
    father_name = 'Ted Zakaria',
    mother_name = 'Lara Kallab',
    first_name_en = 'Salia',
    last_name_en = 'Zakaria',
    father_name_en = 'Ted Zakaria',
    mother_name_en = 'Lara Kallab',
    first_name_ar = 'ساليا',
    last_name_ar = 'زكريا',
    father_name_ar = 'تيد زكريا',
    mother_name_ar = 'لارا كلاس'
WHERE id = '9b7452fb-56c4-44c1-b559-2f6b5110fadf';

-- [57/91] Selena Abou Sleiman (سيلينا أبو سليمان)
UPDATE public.members
SET
    first_name = 'Selena',
    last_name = 'Abou Sleiman',
    father_name = 'Elie Abou Sleiman',
    mother_name = 'Nancy Katour',
    first_name_en = 'Selena',
    last_name_en = 'Abou Sleiman',
    father_name_en = 'Elie Abou Sleiman',
    mother_name_en = 'Nancy Katour',
    first_name_ar = 'سيلينا',
    last_name_ar = 'أبو سليمان',
    father_name_ar = 'إيلي أبو سليمان',
    mother_name_ar = 'نانسي كاتور'
WHERE id = 'f1dad95d-a129-4264-bf14-d1eb8818e575';

-- [58/91] Charly Nasr (شارلي نصر)
UPDATE public.members
SET
    first_name = 'Charly',
    last_name = 'Nasr',
    father_name = 'Bassam Nasr',
    mother_name = 'Marcelle Sahyoun',
    first_name_en = 'Charly',
    last_name_en = 'Nasr',
    father_name_en = 'Bassam Nasr',
    mother_name_en = 'Marcelle Sahyoun',
    first_name_ar = 'شارلي',
    last_name_ar = 'نصر',
    father_name_ar = 'بسام نصر',
    mother_name_ar = 'مرسيل صهيون'
WHERE id = '0b195467-1cba-44f0-bbcc-6b70de768c26';

-- [59/91] Charbel Semaan (شربل سمعان)
UPDATE public.members
SET
    first_name = 'Charbel',
    last_name = 'Semaan',
    father_name = 'Raymond Semaan',
    mother_name = 'Monique Torbey',
    first_name_en = 'Charbel',
    last_name_en = 'Semaan',
    father_name_en = 'Raymond Semaan',
    mother_name_en = 'Monique Torbey',
    first_name_ar = 'شربل',
    last_name_ar = 'سمعان',
    father_name_ar = 'ريمون سمعان',
    mother_name_ar = 'مونيك طربيه'
WHERE id = 'bb5996b9-e224-4435-8ac1-fa43ca6ff107';

-- [60/91] Charbel Nohra (شربل نهرا)
UPDATE public.members
SET
    first_name = 'Charbel',
    last_name = 'Nohra',
    father_name = 'Antoine Nohra',
    mother_name = 'Julie El Rahi',
    first_name_en = 'Charbel',
    last_name_en = 'Nohra',
    father_name_en = 'Antoine Nohra',
    mother_name_en = 'Julie El Rahi',
    first_name_ar = 'شربل',
    last_name_ar = 'نهرا',
    father_name_ar = 'أنطوان نهرا',
    mother_name_ar = 'جولي الراعي'
WHERE id = 'b9136a25-4f02-4fe2-ba52-a62d32f2d03e';

-- [61/91] Charbel Basbous (شربل بصبوص)
UPDATE public.members
SET
    first_name = 'Charbel',
    last_name = 'Basbous',
    father_name = 'Jawad Basbous',
    mother_name = 'Hanan Abi Charr',
    first_name_en = 'Charbel',
    last_name_en = 'Basbous',
    father_name_en = 'Jawad Basbous',
    mother_name_en = 'Hanan Abi Charr',
    first_name_ar = 'شربل',
    last_name_ar = 'بصبوص',
    father_name_ar = 'جواد بصبوص',
    mother_name_ar = 'حنان أبي شر'
WHERE id = '2964d2d9-a365-49c1-9a67-b9cc8de76b4d';

-- [62/91] Gaya Zakaria (غايا زكريا)
UPDATE public.members
SET
    first_name = 'Gaya',
    last_name = 'Zakaria',
    father_name = 'Ted Zakaria',
    mother_name = 'Lara Kallab',
    first_name_en = 'Gaya',
    last_name_en = 'Zakaria',
    father_name_en = 'Ted Zakaria',
    mother_name_en = 'Lara Kallab',
    first_name_ar = 'غايا',
    last_name_ar = 'زكريا',
    father_name_ar = 'تيد زكريا',
    mother_name_ar = 'لارا كلاس'
WHERE id = '7c691013-cb74-4a4c-a1f2-d800941537c6';

-- [63/91] Catalina Makhlouf (كاتالينا مخلوف)
UPDATE public.members
SET
    first_name = 'Catalina',
    last_name = 'Makhlouf',
    father_name = 'Charbel Makhlouf',
    mother_name = 'Sarah',
    first_name_en = 'Catalina',
    last_name_en = 'Makhlouf',
    father_name_en = 'Charbel Makhlouf',
    mother_name_en = 'Sarah',
    first_name_ar = 'كاتالينا',
    last_name_ar = 'مخلوف',
    father_name_ar = 'شربل مخلوف',
    mother_name_ar = 'سارة'
WHERE id = '9cb5572d-0cd9-42c7-8aa4-887f3d0bcc04';

-- [64/91] Catherine Sakr (كاترين صقر)
UPDATE public.members
SET
    first_name = 'Catherine',
    last_name = 'Sakr',
    father_name = 'Youssef Sakr',
    mother_name = 'Nemat Howat',
    first_name_en = 'Catherine',
    last_name_en = 'Sakr',
    father_name_en = 'Youssef Sakr',
    mother_name_en = 'Nemat Howat',
    first_name_ar = 'كاترين',
    last_name_ar = 'صقر',
    father_name_ar = 'يوسف صقر',
    mother_name_ar = 'نعمت حواط'
WHERE id = '55c7ead1-4cb8-44d5-82e5-cf37c98acbcd';

-- [65/91] Christina Nassar (كرستينا نصّار)
UPDATE public.members
SET
    first_name = 'Christina',
    last_name = 'Nassar',
    father_name = 'Bechara Nassar',
    mother_name = 'Mirna Mahfouz',
    first_name_en = 'Christina',
    last_name_en = 'Nassar',
    father_name_en = 'Bechara Nassar',
    mother_name_en = 'Mirna Mahfouz',
    first_name_ar = 'كرستينا',
    last_name_ar = 'نصّار',
    father_name_ar = 'بشارة نصّار',
    mother_name_ar = 'ميرنا محفوظ'
WHERE id = '2bad4e72-86d4-41fd-bf78-96886d8b6f8d';

-- [66/91] Chris Zeidan (كريس زيدان)
UPDATE public.members
SET
    first_name = 'Chris',
    last_name = 'Zeidan',
    father_name = 'Wahib Zeidan',
    mother_name = 'Pauline Abi Raad',
    first_name_en = 'Chris',
    last_name_en = 'Zeidan',
    father_name_en = 'Wahib Zeidan',
    mother_name_en = 'Pauline Abi Raad',
    first_name_ar = 'كريس',
    last_name_ar = 'زيدان',
    father_name_ar = 'وهيب زيدان',
    mother_name_ar = 'بولين أبي رعد'
WHERE id = 'd9c5fd72-71f0-49c6-85dd-c7fd483a7a0c';

-- [67/91] Clarita Assaf (كلاريتا عساف)
UPDATE public.members
SET
    first_name = 'Clarita',
    last_name = 'Assaf',
    father_name = 'Tony Assaf',
    mother_name = 'Hanan Assaf',
    first_name_en = 'Clarita',
    last_name_en = 'Assaf',
    father_name_en = 'Tony Assaf',
    mother_name_en = 'Hanan Assaf',
    first_name_ar = 'كلاريتا',
    last_name_ar = 'عساف',
    father_name_ar = 'طوني عساف',
    mother_name_ar = 'حنان عساف'
WHERE id = 'e74b01d5-64c8-4694-a03d-b7ff58f656ba';

-- [68/91] Chloe Khachan (كلوويه خشان)
UPDATE public.members
SET
    first_name = 'Chloe',
    last_name = 'Khachan',
    father_name = 'Clovis Khachan',
    mother_name = 'Yolla Baylan',
    first_name_en = 'Chloe',
    last_name_en = 'Khachan',
    father_name_en = 'Clovis Khachan',
    mother_name_en = 'Yolla Baylan',
    first_name_ar = 'كلوويه',
    last_name_ar = 'خشان',
    father_name_ar = 'كلوفيس خشان',
    mother_name_ar = 'يولا بيلان'
WHERE id = '346a4eed-6b24-4319-86a1-d592cea7e08f';

-- [69/91] Lana Abou El Chamat (لانا أبو الشامات)
UPDATE public.members
SET
    first_name = 'Lana',
    last_name = 'Abou El Chamat',
    father_name = 'Ibrahim Abou El Chamat',
    mother_name = 'Nour Ntifeh',
    first_name_en = 'Lana',
    last_name_en = 'Abou El Chamat',
    father_name_en = 'Ibrahim Abou El Chamat',
    mother_name_en = 'Nour Ntifeh',
    first_name_ar = 'لانا',
    last_name_ar = 'أبو الشامات',
    father_name_ar = 'إبراهيم أبو الشامات',
    mother_name_ar = 'نور نتيفة'
WHERE id = 'd86b12ba-c86f-47cb-ad22-2a7503452a06';

-- [70/91] Luna Bou Saad (لونا بو سعد)
UPDATE public.members
SET
    first_name = 'Luna',
    last_name = 'Bou Saad',
    father_name = 'Charbel Bou Saad',
    mother_name = 'Mireille Abi Khalil',
    first_name_en = 'Luna',
    last_name_en = 'Bou Saad',
    father_name_en = 'Charbel Bou Saad',
    mother_name_en = 'Mireille Abi Khalil',
    first_name_ar = 'لونا',
    last_name_ar = 'بو سعد',
    father_name_ar = 'شربل بو سعد',
    mother_name_ar = 'ميراي أبي خليل'
WHERE id = '4cdbd3b2-bc52-4983-858c-084841cc54f7';

-- [71/91] Mattia Salameh Mokarzel (ماتيا سلامة مكرزل)
UPDATE public.members
SET
    first_name = 'Mattia',
    last_name = 'Salameh Mokarzel',
    father_name = 'Charbel Salameh Mokarzel',
    mother_name = 'Diala Matta',
    first_name_en = 'Mattia',
    last_name_en = 'Salameh Mokarzel',
    father_name_en = 'Charbel Salameh Mokarzel',
    mother_name_en = 'Diala Matta',
    first_name_ar = 'ماتيا',
    last_name_ar = 'سلامة مكرزل',
    father_name_ar = 'شربل سلامة مكرزل',
    mother_name_ar = 'ديالا متى'
WHERE id = 'b9a8fd80-53bc-4ee3-99e3-20bbd303e848';

-- [72/91] Martine Antoury (مارتين عنتوري)
UPDATE public.members
SET
    first_name = 'Martine',
    last_name = 'Antoury',
    father_name = 'Christian Antoury',
    mother_name = 'Liliane',
    first_name_en = 'Martine',
    last_name_en = 'Antoury',
    father_name_en = 'Christian Antoury',
    mother_name_en = 'Liliane',
    first_name_ar = 'مارتين',
    last_name_ar = 'عنتوري',
    father_name_ar = 'كريستيان عنتوري',
    mother_name_ar = 'ليليان'
WHERE id = 'e7a1434a-c39f-48a7-8507-b4315331f409';

-- [73/91] Maria Francis (ماريا فرنسيس)
UPDATE public.members
SET
    first_name = 'Maria',
    last_name = 'Francis',
    father_name = 'Elie Francis',
    mother_name = 'Roula Francis',
    first_name_en = 'Maria',
    last_name_en = 'Francis',
    father_name_en = 'Elie Francis',
    mother_name_en = 'Roula Francis',
    first_name_ar = 'ماريا',
    last_name_ar = 'فرنسيس',
    father_name_ar = 'إيلي فرنسيس',
    mother_name_ar = 'رولا فرنسيس'
WHERE id = '98bea8d9-1351-408a-abf0-b9874c590eab';

-- [74/91] Mariana Boutros (ماريانا بطرس)
UPDATE public.members
SET
    first_name = 'Mariana',
    last_name = 'Boutros',
    father_name = 'Georges Boutros',
    mother_name = 'Claudette Nader',
    first_name_en = 'Mariana',
    last_name_en = 'Boutros',
    father_name_en = 'Georges Boutros',
    mother_name_en = 'Claudette Nader',
    first_name_ar = 'ماريانا',
    last_name_ar = 'بطرس',
    father_name_ar = 'جورج بطرس',
    mother_name_ar = 'كلوديت نادر'
WHERE id = '4649c214-687c-4dae-b95e-0c60aef38b53';

-- [75/91] Marita Semaan (ماريتا سمعان)
UPDATE public.members
SET
    first_name = 'Marita',
    last_name = 'Semaan',
    father_name = 'Raymond Semaan',
    mother_name = 'Monique Torbey',
    first_name_en = 'Marita',
    last_name_en = 'Semaan',
    father_name_en = 'Raymond Semaan',
    mother_name_en = 'Monique Torbey',
    first_name_ar = 'ماريتا',
    last_name_ar = 'سمعان',
    father_name_ar = 'ريمون سمعان',
    mother_name_ar = 'مونيك طربيه'
WHERE id = '9c822b34-e2cf-45aa-8dc5-2a00071a032b';

-- [76/91] Mariella Sakr (مارييلا صقر)
UPDATE public.members
SET
    first_name = 'Mariella',
    last_name = 'Sakr',
    father_name = 'Charbel Sakr',
    mother_name = 'Mirna Tannous',
    first_name_en = 'Mariella',
    last_name_en = 'Sakr',
    father_name_en = 'Charbel Sakr',
    mother_name_en = 'Mirna Tannous',
    first_name_ar = 'مارييلا',
    last_name_ar = 'صقر',
    father_name_ar = 'شربل صقر',
    mother_name_ar = 'ميرنا طنوس'
WHERE id = 'b13e7064-3c1b-41f5-861a-d46f06325186';

-- [77/91] Maya Semaan (مايا سمعان)
UPDATE public.members
SET
    first_name = 'Maya',
    last_name = 'Semaan',
    father_name = 'Elie Raymond Semaan',
    mother_name = 'Mariam Ibrahim',
    first_name_en = 'Maya',
    last_name_en = 'Semaan',
    father_name_en = 'Elie Raymond Semaan',
    mother_name_en = 'Mariam Ibrahim',
    first_name_ar = 'مايا',
    last_name_ar = 'سمعان',
    father_name_ar = 'إيلي ريمون سمعان',
    mother_name_ar = 'مريم إبراهيم'
WHERE id = '9b391b17-8ae0-47e8-9e1d-4472ce97f775';

-- [78/91] Maryam Yazbek (مريم يزبك)
UPDATE public.members
SET
    first_name = 'Maryam',
    last_name = 'Yazbek',
    father_name = 'El Khoury Georges Yazbek',
    mother_name = 'Georgette Doumit Yazbek',
    first_name_en = 'Maryam',
    last_name_en = 'Yazbek',
    father_name_en = 'El Khoury Georges Yazbek',
    mother_name_en = 'Georgette Doumit Yazbek',
    first_name_ar = 'مريم',
    last_name_ar = 'يزبك',
    father_name_ar = 'الخوري جورج يزبك',
    mother_name_ar = 'جورجات ضومط يزبك'
WHERE id = '455ee595-aea6-4e47-986d-d5043a5022d1';

-- [79/91] Mira Zeibak (ميرا زيبق)
UPDATE public.members
SET
    first_name = 'Mira',
    last_name = 'Zeibak',
    father_name = 'Emile Zeibak',
    mother_name = 'Adiba Hamadeh',
    first_name_en = 'Mira',
    last_name_en = 'Zeibak',
    father_name_en = 'Emile Zeibak',
    mother_name_en = 'Adiba Hamadeh',
    first_name_ar = 'ميرا',
    last_name_ar = 'زيبق',
    father_name_ar = 'إميل زيبق',
    mother_name_ar = 'أديبة حمادة'
WHERE id = '66113c03-1e8b-4e7b-ac49-da5655741ed9';

-- [80/91] Myriam Sahyoun (ميريم صهيون)
UPDATE public.members
SET
    first_name = 'Myriam',
    last_name = 'Sahyoun',
    father_name = 'Roger Sahyoun',
    mother_name = 'Nathalie Rizk',
    first_name_en = 'Myriam',
    last_name_en = 'Sahyoun',
    father_name_en = 'Roger Sahyoun',
    mother_name_en = 'Nathalie Rizk',
    first_name_ar = 'ميريم',
    last_name_ar = 'صهيون',
    father_name_ar = 'روجيه صهيون',
    mother_name_ar = 'نتالي رزق'
WHERE id = 'b1a66beb-0bba-4147-bc5e-cb3e4ad030de';

-- [81/91] Michelle Sfeir (ميشال صفير)
UPDATE public.members
SET
    first_name = 'Michelle',
    last_name = 'Sfeir',
    father_name = 'Dib Sfeir',
    mother_name = 'Majida El Ghawi',
    first_name_en = 'Michelle',
    last_name_en = 'Sfeir',
    father_name_en = 'Dib Sfeir',
    mother_name_en = 'Majida El Ghawi',
    first_name_ar = 'ميشال',
    last_name_ar = 'صفير',
    father_name_ar = 'ديب صفير',
    mother_name_ar = 'ماجدة الغاوي'
WHERE id = '9212a70c-a0fe-4d91-ae62-6fa61b93c900';

-- [82/91] Michaela Salameh Mokarzel (ميكاييلا سلامة مكرزل)
UPDATE public.members
SET
    first_name = 'Michaela',
    last_name = 'Salameh Mokarzel',
    father_name = 'Charbel Salameh Mokarzel',
    mother_name = 'Diala Matta',
    first_name_en = 'Michaela',
    last_name_en = 'Salameh Mokarzel',
    father_name_en = 'Charbel Salameh Mokarzel',
    mother_name_en = 'Diala Matta',
    first_name_ar = 'ميكاييلا',
    last_name_ar = 'سلامة مكرزل',
    father_name_ar = 'شربل سلامة مكرزل',
    mother_name_ar = 'ديالا متى'
WHERE id = '98bef548-6369-47c3-9f2b-318140fa833b';

-- [83/91] Melanie El Atik (ميلاني العتيّق)
UPDATE public.members
SET
    first_name = 'Melanie',
    last_name = 'El Atik',
    father_name = 'Ziad El Atik',
    mother_name = 'Patricia Zgheib',
    first_name_en = 'Melanie',
    last_name_en = 'El Atik',
    father_name_en = 'Ziad El Atik',
    mother_name_en = 'Patricia Zgheib',
    first_name_ar = 'ميلاني',
    last_name_ar = 'العتيّق',
    father_name_ar = 'زياد العتيّق',
    mother_name_ar = 'باتريسيا زغيب'
WHERE id = '04832e45-cfce-4643-95d8-d1d7cf734b70';

-- [84/91] Naya El Akouri (نايا العاقوري)
UPDATE public.members
SET
    first_name = 'Naya',
    last_name = 'El Akouri',
    father_name = 'Fadi El Akouri',
    mother_name = 'Abeer El Beaini',
    first_name_en = 'Naya',
    last_name_en = 'El Akouri',
    father_name_en = 'Fadi El Akouri',
    mother_name_en = 'Abeer El Beaini',
    first_name_ar = 'نايا',
    last_name_ar = 'العاقوري',
    father_name_ar = 'فادي العاقوري',
    mother_name_ar = 'عبير البعيني'
WHERE id = 'eefac882-3155-46d6-94ba-26d098ee89b3';

-- [85/91] Nour Sahyoun (نور صهيون)
UPDATE public.members
SET
    first_name = 'Nour',
    last_name = 'Sahyoun',
    father_name = 'Roger Sahyoun',
    mother_name = 'Nathalie Rizk',
    first_name_en = 'Nour',
    last_name_en = 'Sahyoun',
    father_name_en = 'Roger Sahyoun',
    mother_name_en = 'Nathalie Rizk',
    first_name_ar = 'نور',
    last_name_ar = 'صهيون',
    father_name_ar = 'روجيه صهيون',
    mother_name_ar = 'نتالي رزق'
WHERE id = 'c75fab66-f9e6-4b66-b442-6477de167d41';

-- [86/91] Nirvana Nohra (نيرفانا نهرا)
UPDATE public.members
SET
    first_name = 'Nirvana',
    last_name = 'Nohra',
    father_name = 'Antoine Nohra',
    mother_name = 'Julie El Rahi',
    first_name_en = 'Nirvana',
    last_name_en = 'Nohra',
    father_name_en = 'Antoine Nohra',
    mother_name_en = 'Julie El Rahi',
    first_name_ar = 'نيرفانا',
    last_name_ar = 'نهرا',
    father_name_ar = 'أنطوان نهرا',
    mother_name_ar = 'جولي الراعي'
WHERE id = 'fab08ef9-b588-4c28-a3ca-853c402ddbab';

-- [87/91] Wadih Daher (وديع ضاهر)
UPDATE public.members
SET
    first_name = 'Wadih',
    last_name = 'Daher',
    father_name = 'Chady Daher',
    mother_name = 'Oula Beainy',
    first_name_en = 'Wadih',
    last_name_en = 'Daher',
    father_name_en = 'Chady Daher',
    mother_name_en = 'Oula Beainy',
    first_name_ar = 'وديع',
    last_name_ar = 'ضاهر',
    father_name_ar = 'شادي ضاهر',
    mother_name_ar = 'علا بعيني'
WHERE id = 'f448ccab-155c-465a-8c10-4c4323fae8b6';
