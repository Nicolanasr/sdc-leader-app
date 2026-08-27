import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from env variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seed() {
  console.log('Starting remote database seeding...')

  // 1. Seed System Roles
  const roles = [
    { name: 'configurator', permission_scope: 'configurator' },
    { name: 'chef_groupe', permission_scope: 'chef_groupe' },
    { name: 'assistant_chef_groupe', permission_scope: 'assistant_chef_groupe' },
    { name: 'amin_serr_group', permission_scope: 'amin_serr_group' },
    { name: 'amin_sandou2_group', permission_scope: 'amin_sandou2_group' },
    { name: 'amin_tejhizet_group', permission_scope: 'amin_tejhizet_group' },
    { name: 'mas2oul_toswir', permission_scope: 'mas2oul_toswir' },
    { name: 'mas2oul_mounet', permission_scope: 'mas2oul_mounet' },
    { name: 'ka2ed_idare', permission_scope: 'ka2ed_idare' },
    { name: 'ka2ed_fer2a', permission_scope: 'ka2ed_fer2a' },
    { name: 'mouse3ed_ka2ed_fer2a', permission_scope: 'mouse3ed_ka2ed_fer2a' },
  ]

  console.log('Seeding system permission roles...')
  for (const role of roles) {
    const { error } = await supabase
      .from('roles')
      .upsert(role, { onConflict: 'name' })
    if (error) console.error(`Error seeding role "${role.name}":`, error.message)
  }

  // 2. Seed Dynamic Sections
  const sections = [
    { name: 'Jaramiz', min_age: 7, max_age: 11 },
    { name: 'Zaharat', min_age: 7, max_age: 11 },
    { name: 'Kechefe', min_age: 12, max_age: 16 },
    { name: 'Mourchidet', min_age: 12, max_age: 16 },
    { name: 'Jouwele', min_age: 17, max_age: 21 },
    { name: 'Mounjidet', min_age: 17, max_age: 21 },
  ]

  console.log('Seeding dynamic section classifications...')
  for (const sec of sections) {
    const { error } = await supabase
      .from('section_types')
      .upsert(sec, { onConflict: 'name' })
    if (error) console.error(`Error seeding section "${sec.name}":`, error.message)
  }

  // 3. Seed Configurable Ranks
  const ranks = [
    { name: 'Woodbadge' },
    { name: 'Ka2ed' },
    { name: 'Mouse3ed' },
    { name: '3arif Awwal' },
    { name: '3arif' },
    { name: 'Mse3ed 3arif' },
  ]

  console.log('Seeding leader ranks...')
  for (const rank of ranks) {
    const { error } = await supabase
      .from('ranks')
      .upsert(rank, { onConflict: 'name' })
    if (error) console.error(`Error seeding rank "${rank.name}":`, error.message)
  }

  // 4. Seed Responsibilities (Mahemm)
  const responsibilities = [
    { name: 'Group Leader' },
    { name: 'Assistant Group Leader' },
    { name: 'Group Secretary' },
    { name: 'Group Treasurer' },
    { name: 'Group Quartermaster' },
    { name: 'Photographer' },
    { name: 'Supplies Manager' },
    { name: 'Council Member' },
    { name: 'Troop Leader' },
    { name: 'Assistant Troop Leader' },
  ]

  console.log('Seeding responsibilities...')
  for (const resp of responsibilities) {
    const { error } = await supabase
      .from('responsibilities')
      .upsert(resp, { onConflict: 'name' })
    if (error) console.error(`Error seeding responsibility "${resp.name}":`, error.message)
  }

  console.log('Database seeding successfully completed!')
}

seed()
