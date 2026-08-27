const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dnssuikpgodnvixswyze.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuc3N1aWtwZ29kbnZpeHN3eXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzczOTQ2MSwiZXhwIjoyMTAzMzE1NDYxfQ.skJ9Byg05pbFgPsW5mEkRbZUc4p_JonQrsjVXXGI5IU'
);

const GROUP_ID = '55482895-82c5-4c4c-be53-9d3afd05eec9';

const TROOP_MAP = {
  'جراميز': 'a5aa02ea-c501-4500-bc64-47e1117c2dcc',
  'زهرات': 'c5e574d0-5290-4e9a-8ebc-4dd0dc9effcc',
  'كشافة': 'cb1fdf67-42b5-460a-b714-756f4f02017e',
  'مرشدات': '0dca3ccd-cefb-44e6-a209-446b9623cb53',
  'منجدات': '6145721a-601f-491c-8ed2-f1285b554694',
  'جوالة': '080aeb24-ca47-4b64-bab9-1eb3f677fe74',
  'قادة': '080aeb24-ca47-4b64-bab9-1eb3f677fe74'
};

function parseDate(dStr) {
  if (!dStr) return null;
  dStr = dStr.trim().replace(/^[\u200B-\u200D\uFEFF]/, '').replace(/[^0-9\/]/g, '');
  const parts = dStr.split('/');
  if (parts.length !== 3) return null;
  let [d, m, y] = parts;
  if (!y || y.length !== 4) return null;
  if (parseInt(y) < 1920 || parseInt(y) > 2030) return null;
  d = d.padStart(2, '0');
  m = m.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cleanStr(str) {
  if (!str) return '';
  return str.trim().replace(/^[\u200B-\u200D\uFEFF]/, '');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = [];
    let insideQuote = false;
    let currentCell = '';
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        cells.push(currentCell);
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell);
    if (cells.length >= 21) rows.push(cells);
  }
  return rows;
}

async function run() {
  const csvContent = fs.readFileSync('/Users/macbook/.gemini/antigravity/brain/995b7855-103f-4aa9-8717-a12201ba5cde/scratch/members_import.csv', 'utf8');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} records to import.`);

  let inserted = 0;
  for (const row of rows) {
    const fullName = cleanStr(row[1]);
    if (!fullName) continue;

    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    const bloodType = cleanStr(row[2]) || null;
    const birthDate = parseDate(row[3]);
    const memberPhone = cleanStr(row[4]) || null;
    const school = cleanStr(row[5]) || null;
    const hobbies = cleanStr(row[6]) || null;
    const fatherName = cleanStr(row[7]) || null;
    const fatherBloodType = cleanStr(row[8]) || null;
    const fatherBirthDate = parseDate(row[9]);
    const fatherPhone = cleanStr(row[10]) || null;
    const fatherJob = cleanStr(row[11]) || null;
    const motherName = cleanStr(row[12]) || null;
    const motherBloodType = cleanStr(row[13]) || null;
    const motherBirthDate = parseDate(row[14]);
    const motherPhone = cleanStr(row[15]) || null;
    const motherJob = cleanStr(row[16]) || null;
    const address = cleanStr(row[17]) || null;
    const registryPlace = cleanStr(row[18]) || null;
    const registryNumber = cleanStr(row[19]) || null;
    const joinDate = parseDate(row[20]);
    const sectionStr = cleanStr(row[21]);

    const troopId = TROOP_MAP[sectionStr] || TROOP_MAP['جراميز'];

    const emergencyName = fatherName || motherName || fullName;
    const emergencyRel = fatherName ? 'Father' : (motherName ? 'Mother' : 'Parent');
    const emergencyPhone = fatherPhone || motherPhone || memberPhone || '00000000';

    const payload = {
      first_name: firstName,
      last_name: lastName,
      birth_date: birthDate,
      blood_type: bloodType,
      member_phone: memberPhone,
      school: school,
      hobbies: hobbies,
      father_name: fatherName,
      father_blood_type: fatherBloodType,
      father_birth_date: fatherBirthDate,
      father_phone: fatherPhone,
      father_job: fatherJob,
      mother_name: motherName,
      mother_blood_type: motherBloodType,
      mother_birth_date: motherBirthDate,
      mother_phone: motherPhone,
      mother_job: motherJob,
      address: address,
      registry_place: registryPlace,
      registry_number: registryNumber,
      join_date: joinDate,
      emergency_contact_name: emergencyName,
      emergency_contact_relation: emergencyRel,
      emergency_contact_phone: emergencyPhone,
      group_id: GROUP_ID,
      troop_id: troopId,
      is_active: true,
      is_deleted: false
    };

    const { data, error } = await supabase.from('members').insert(payload).select('id');
    if (error) {
      console.error(`Error inserting ${fullName}:`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`Successfully imported ${inserted} members into database.`);
}

run();
