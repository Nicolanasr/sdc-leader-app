import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function debug() {
  console.log('--- DATABASE DIAGNOSTIC START ---')

  // 1. Fetch Roles
  const { data: roles, error: errRoles } = await supabase
    .from('roles')
    .select('*')
  console.log('\n=== ROLES IN DATABASE ===')
  if (errRoles) console.error('Error fetching roles:', errRoles.message)
  else console.log(roles)

  // 2. Fetch Profiles
  const { data: profiles, error: errProfiles } = await supabase
    .from('profiles')
    .select('*')
  console.log('\n=== PROFILES IN DATABASE ===')
  if (errProfiles) console.error('Error fetching profiles:', errProfiles.message)
  else console.log(profiles)

  // 3. Fetch User Roles Mappings
  const { data: userRoles, error: errUserRoles } = await supabase
    .from('user_roles')
    .select('*')
  console.log('\n=== USER ROLES MAPPINGS ===')
  if (errUserRoles) console.error('Error fetching user_roles:', errUserRoles.message)
  else console.log(userRoles)

  // 4. Fetch Auth Users Metadata
  // Since auth schema is private, we can select from auth.users using raw SQL
  const { data: authUsers, error: errAuthUsers } = await supabase
    .rpc('get_auth_users_metadata_debug') // Let's check if we can query auth.users directly or create an RPC
  
  if (errAuthUsers) {
    // If RPC doesn't exist, we can fetch via the admin API
    console.log('\n=== AUTH USERS (via admin API) ===')
    const { data: listData, error: errList } = await supabase.auth.admin.listUsers()
    if (errList) console.error('Error listing auth users:', errList.message)
    else {
      listData.users.forEach((u) => {
        console.log(`User: ${u.email} (ID: ${u.id})`)
        console.log('App Metadata:', u.app_metadata)
        console.log('User Metadata:', u.user_metadata)
        console.log('---')
      })
    }
  }

  console.log('--- DATABASE DIAGNOSTIC END ---')
}

debug()
