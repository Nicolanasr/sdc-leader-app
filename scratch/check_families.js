const fs = require('fs');
const members = JSON.parse(fs.readFileSync('scratch/all_members.json'));
const dict = JSON.parse(fs.readFileSync('scratch/bilingual_members_dictionary.json'));
const dictMap = new Map(dict.map(d => [d.id, d]));

const combined = members.map(m => ({
  ...m,
  ...dictMap.get(m.id)
}));

const byLastName = {};
combined.forEach(m => {
  const ln = (m.last_name_en || '').toLowerCase().trim();
  if (!byLastName[ln]) byLastName[ln] = [];
  byLastName[ln].push(m);
});

console.log('--- Families / Surnames with multiple members ---');
Object.entries(byLastName).forEach(([ln, list]) => {
  if (list.length > 1) {
    console.log(`\nFamily: ${ln.toUpperCase()} (${list.length} members):`);
    list.forEach(m => {
      console.log(`  - [${m.id.slice(0,8)}] EN: ${m.first_name_en} ${m.last_name_en} | AR: ${m.first_name_ar} ${m.last_name_ar} | Raw: ${m.first_name} ${m.last_name} | Father: ${m.father_name_en || '(empty)'} | Mother: ${m.mother_name_en || '(empty)'}`);
    });
  }
});
