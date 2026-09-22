const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkAuditLogs() {
  console.log('--- Checking audit_logs table ---');
  const { data, error } = await supabase.from('audit_logs').select('*').limit(5);
  if (error) {
    console.log('Query error (may need migration applied in Supabase SQL editor):', error.message);
  } else {
    console.log('✅ audit_logs table is available and accessible! Count:', data.length);
    console.log('Sample rows:', data);
  }
}

checkAuditLogs().catch(console.error);
