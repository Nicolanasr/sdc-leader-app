const fs = require('fs');

const report = JSON.parse(fs.readFileSync('scratch/full_comparison_report.json'));
const members = JSON.parse(fs.readFileSync('scratch/all_members.json'));
const memberMap = new Map(members.map(m => [m.id, m]));

let md = `# Bilingual Members Extraction & Standardization (91 Scouts)

All **91 members** in the database have been processed and standardized. Their names and parent details are now mapped to both **English** (for uniform search, email provisioning, and sorting) and **Arabic** (for civil registry, Lebanese scout documentation, and roster viewing).

---

## ⚠️ Action Items & Questions for Review

Please review the following specific cases where records have potential duplicates, concatenated strings, or missing data:

### 1. Potential Duplicate Scouts in Database
| Scout Name | ID (First 8 chars) | Unit | Parent Info | Notes |
|:---|:---|:---|:---|:---|
| **Anthony-Joe Sfeir** | \`33cbee08\` | Jaramiz | *(empty)* | Has duplicate below with full parents |
| **Antoni-Joe Sfeir** | \`a49120c3\` | Jaramiz | Marck-Antoine Sfeir & Alexandra Kallab | Likely the complete record |
| **William Noun** | \`90daf799\` | Leadership | Andre-Charbel Noun & Jennifer Saliba | English record |
| **William Noun** | \`88b611eb\` | Leadership | Andre-Charbel Noun & Jennifer Saliba | Arabic record (وليم نون) - Identical parents |
| **Chloe Khachan** | \`346a4eed\` | Afrodit | Clovis Khachan & Yolla Baylan | Record 1 |
| **Chloe Khachan** | \`f98cad58\` | Afrodit | Clovis Khachan & Yolla Baylan | Exact duplicate Record 2 |
| **Naya El Akouri** | \`4083703f\` | Zaharat | *(originally empty)* | English record |
| **Naya El Akouri** | \`eefac882\` | Zaharat | Fadi El Akouri & Abeer El Beaini | Arabic record (نايا العاقوري) |

> **Recommendation**: Confirm if any of these pairs can be merged or if one of each duplicate should be marked inactive/deleted.

---

### 2. Cleaned Surnames & Compound Names
The following entries had father names or dual languages embedded directly inside the first or last name field:
- **Maya Elie Semaan** (\`9b391b17\`): Original last name was \`سمعان/ Maya Elie Semaan\`. Cleaned to:
  - English: **Maya Semaan** (Father: Elie Raymond Semaan, Mother: Mariam Ibrahim)
  - Arabic: **مايا سمعان** (Father: إيلي ريمون سمعان, Mother: مريم إبراهيم)
- **Lana Abou El Chamat** (\`d86b12ba\`): Original last name was \`ابراهيم ابو ال شامات\` (Father's name was typed into surname). Cleaned to:
  - English: **Lana Abou El Chamat** (Father: Ibrahim Abou El Chamat, Mother: Nour Ntifeh)
  - Arabic: **لانا أبو الشامات** (Father: إبراهيم أبو الشامات, Mother: نور نتيفة)
- **Berny Sahyoun** (\`7128dc41\`): Original last name was \`روجيه صهيون\` (Father Roger included). Cleaned to:
  - English: **Berny Sahyoun** (Father: Roger Sahyoun, Mother: Nathalie Rizk)
  - Arabic: **برني صهيون** (Father: روجيه صهيون, Mother: نتالي رزق)
- **Jennifer Hashem** (\`ee2c20a5\`): Original last name was \`بيار هاشم\` (Father Pierre included). Cleaned to:
  - English: **Jennifer Hashem** (Father: Pierre Hashem, Mother: Janet Badaan)
  - Arabic: **جنيفر هاشم** (Father: بيار هاشم, Mother: جانيت بضعان)

---

### 3. Missing Parent Details
The following members have no parent names listed in the database:
- **Nicolas Nasr** (\`263f8454\`)
- **Alex Mouannes** (\`8354d40e\`)
- **Ricardo Geara** (\`09987dc2\`)
- *(Anthony-Joe Sfeir \`33cbee08\` - duplicate has parents)*

---

## 📋 Full Bilingual Roster (All 91 Scouts)

| # | English Name | Arabic Name | Father Name (EN / AR) | Mother Name (EN / AR) | Troop / Unit |
|:--|:---|:---|:---|:---|:---|
`;

report.forEach((r) => {
  const m = memberMap.get(r.id);
  const troop = m?.troops?.name || 'General';
  const b = r.bilingual;
  const father = b.father_en ? `${b.father_en}<br/><span style="color:#64748b">${b.father_ar}</span>` : '—';
  const mother = b.mother_en ? `${b.mother_en}<br/><span style="color:#64748b">${b.mother_ar}</span>` : '—';
  md += `| ${r.index} | **${b.first_en} ${b.last_en}** | ${b.first_ar} ${b.last_ar} | ${father} | ${mother} | ${troop} |\n`;
});

const artifactPath = '/home/nicolas/.gemini/antigravity-ide/brain/7d0eabae-8b03-4b35-b238-7d68224459fd/bilingual_members_extraction.md';
fs.writeFileSync(artifactPath, md);
console.log('Successfully wrote artifact to', artifactPath);
