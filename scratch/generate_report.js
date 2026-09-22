const fs = require('fs');
const members = JSON.parse(fs.readFileSync('scratch/all_members.json'));
const dict = JSON.parse(fs.readFileSync('scratch/bilingual_members_dictionary.json'));
const dictMap = new Map(dict.map(d => [d.id, d]));

const report = members.map((m, i) => {
  const d = dictMap.get(m.id) || {};
  return {
    index: i + 1,
    id: m.id,
    original: {
      first: m.first_name,
      last: m.last_name,
      father: m.father_name,
      mother: m.mother_name
    },
    bilingual: {
      first_en: d.first_name_en,
      first_ar: d.first_name_ar,
      last_en: d.last_name_en,
      last_ar: d.last_name_ar,
      father_en: d.father_name_en,
      father_ar: d.father_name_ar,
      mother_en: d.mother_name_en,
      mother_ar: d.mother_name_ar
    }
  };
});

fs.writeFileSync('scratch/full_comparison_report.json', JSON.stringify(report, null, 2));
console.log('Report saved with', report.length, 'records');
