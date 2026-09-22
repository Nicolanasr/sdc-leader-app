const fs = require('fs');
const report = JSON.parse(fs.readFileSync('scratch/full_comparison_report.json'));

console.log('=== POTENTIAL QUESTIONS / AMBIGUITIES FOR USER ===');

report.forEach(r => {
  const o = r.original;
  const b = r.bilingual;
  const flags = [];

  // Flag compound names or unusual characters
  if ((o.first && o.first.includes('/')) || (o.last && o.last.includes('/'))) {
    flags.push(`Slash in original name: "${o.first}" "${o.last}"`);
  }
  if ((o.first && o.first.split(' ').length > 2) || (o.last && o.last.split(' ').length > 2)) {
    flags.push(`Multi-part original name: "${o.first}" "${o.last}"`);
  }
  if (!o.father && !o.mother) {
    flags.push(`No parent info in DB`);
  }
  // Check if original had Arabic characters and transliteration nuances
  const isAr = /[\u0600-\u06FF]/;
  if (isAr.test(o.first) || isAr.test(o.last)) {
    // Lebanese transliteration checks e.g. ضاهر Daher vs Daher, عساف Assaf, زغيب Zgheib, غصوب Ghossoub, صقر Sakr
  }

  if (flags.length > 0) {
    console.log(`\n#${r.index} ID: ${r.id.slice(0, 8)}`);
    console.log(`   Original: ${o.first} ${o.last} | F: ${o.father || '-'} | M: ${o.mother || '-'}`);
    console.log(`   Extracted EN: ${b.first_en} ${b.last_en} | F: ${b.father_en || '-'} | M: ${b.mother_en || '-'}`);
    console.log(`   Extracted AR: ${b.first_ar} ${b.last_ar} | F: ${b.father_ar || '-'} | M: ${b.mother_ar || '-'}`);
    flags.forEach(f => console.log(`   ⚠️  Flag: ${f}`));
  }
});
