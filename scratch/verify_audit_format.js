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

async function verifyAuditFormat() {
  console.log('--- Fetching latest audit log entry ---');
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, table_name, record_id, action, changed_fields, performed_by_email, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Latest audit logs:', JSON.stringify(data, null, 2));
  }
}

verifyAuditFormat().catch(console.error);
