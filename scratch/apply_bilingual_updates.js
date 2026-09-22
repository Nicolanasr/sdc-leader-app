const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const dict = JSON.parse(fs.readFileSync('scratch/bilingual_members_dictionary.json'));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log(`Starting fast update for ${dict.length} members...`);

  // Check if bilingual columns exist
  let hasBilingualColumns = false;
  const testRes = await supabase.from('members').update({ first_name_ar: 'test' }).eq('id', '00000000-0000-0000-0000-000000000000').select();
  if (!testRes.error || testRes.error.code !== 'PGRST204') {
    hasBilingualColumns = true;
    console.log('Detected bilingual columns (first_name_ar, etc.) in members table!');
  } else {
    console.log('Note: Bilingual columns not yet in DB schema cache. Updating standard columns (first_name, last_name, father_name, mother_name).');
  }

  // Batch update with Promise.all in chunks of 10
  const chunkSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < dict.length; i += chunkSize) {
    const chunk = dict.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (m) => {
        const payload = {
          first_name: m.first_name_en,
          last_name: m.last_name_en,
          father_name: m.father_name_en || null,
          mother_name: m.mother_name_en || null,
        };

        if (hasBilingualColumns) {
          payload.first_name_en = m.first_name_en;
          payload.last_name_en = m.last_name_en;
          payload.father_name_en = m.father_name_en || null;
          payload.mother_name_en = m.mother_name_en || null;
          payload.first_name_ar = m.first_name_ar;
          payload.last_name_ar = m.last_name_ar;
          payload.father_name_ar = m.father_name_ar || null;
          payload.mother_name_ar = m.mother_name_ar || null;
        }

        const { error } = await supabase.from('members').update(payload).eq('id', m.id);
        if (error) {
          console.error(`Error updating member ${m.id} (${m.first_name_en} ${m.last_name_en}):`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      })
    );
  }

  console.log(`\n✅ Finished: ${successCount} updated successfully, ${errorCount} errors.`);
}

run();
