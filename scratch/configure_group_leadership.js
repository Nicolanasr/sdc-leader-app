const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const GROUP_ID = '55482895-82c5-4c4c-be53-9d3afd05eec9'; // Saint Jean Marc
const DEFAULT_PASSWORD = 'ChangeMe2026!';

// Troop IDs mapping
const TROOPS = {
  jaramiz: 'a5aa02ea-c501-4500-bc64-47e1117c2dcc',
  zaharat: 'c5e574d0-5290-4e9a-8ebc-4dd0dc9effcc',
  kechefe: 'cb1fdf67-42b5-460a-b714-756f4f02017e', // Ahiram
  mourchidet: '0dca3ccd-cefb-44e6-a209-446b9623cb53', // Afrodit
  mounjidet: '6145721a-601f-491c-8ed2-f1285b554694', // Alissar
  jouwele: '080aeb24-ca47-4b64-bab9-1eb3f677fe74', // Ra3
  leadership: '3f05dcb0-6f85-4e2e-8cca-cceef3586c01'
};

const LEADERS = [
  {
    name: 'Ghinwa Ounaissy',
    email: 'ghinwa.ounaissy@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'chef_groupe', troop_id: null },
      { name: 'ka2ed_fer2a', troop_id: TROOPS.mounjidet }
    ],
    responsibilities: ['Group Leader', 'Troop Leader'],
    member_id: 'd522a2d4-0234-42a3-a593-3141cfcb6791'
  },
  {
    name: 'Nicolas Nasr',
    email: 'nicolas.nasr@contracted.pmi.com',
    secondaryEmail: 'nicolas.nasr@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'assistant_chef_groupe', troop_id: null },
      { name: 'chef_groupe', troop_id: null },
      { name: 'ka2ed_fer2a', troop_id: TROOPS.jouwele }
    ],
    responsibilities: ['Assistant Group Leader', 'Troop Leader'],
    member_id: '263f8454-7e94-4e83-bc15-f3d78d5dfa3d'
  },
  {
    name: 'Petina Abi Hanna',
    email: 'petina.abihanna@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'amin_serr_group', troop_id: null }
    ],
    responsibilities: ['Group Secretary'],
    member_id: '56badc8a-a355-46fe-95ca-d813550899cd'
  },
  {
    name: 'Francois Abi Charr',
    email: 'francois.abicharr@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'amin_sandou2_group', troop_id: null },
      { name: 'ka2ed_fer2a', troop_id: TROOPS.jaramiz }
    ],
    responsibilities: ['Group Treasurer', 'Troop Leader'],
    member_id: null // auto create if needed
  },
  {
    name: 'Selena Sassine',
    email: 'selena.sassine@sdcsjm.org',
    rank: 'Assistant',
    roles: [
      { name: 'mas2oul_toswir', troop_id: null },
      { name: 'mouse3ed_ka2ed_fer2a', troop_id: TROOPS.mounjidet }
    ],
    responsibilities: ['Photographer', 'Assistant Troop Leader'],
    member_id: null
  },
  {
    name: 'Reine Merhi',
    email: 'reine.merhi@sdcsjm.org',
    rank: 'Assistant',
    roles: [
      { name: 'mas2oul_mounet', troop_id: null },
      { name: 'mouse3ed_ka2ed_fer2a', troop_id: TROOPS.zaharat }
    ],
    responsibilities: ['Supplies Manager', 'Assistant Troop Leader'],
    member_id: '19853bf9-e8ef-40ca-8359-24180e259029'
  },
  {
    name: 'Rayen Merhi',
    email: 'rayen.merhi@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'amin_tejhizet_group', troop_id: null }
    ],
    responsibilities: ['Group Quartermaster'],
    member_id: '662e9258-aa96-44ec-ad45-ca34d0bdb297'
  },
  {
    name: 'Pinella Abi Hanna',
    email: 'pinella.abihanna@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'ka2ed_idare', troop_id: null }
    ],
    responsibilities: ['Council Member'],
    member_id: null
  },
  {
    name: 'Charly Nasr',
    email: 'charly.nasr@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'ka2ed_idare', troop_id: null }
    ],
    responsibilities: ['Council Member'],
    member_id: '0b195467-1cba-44f0-bbcc-6b70de768c26'
  },
  {
    name: 'Anthony Nasr',
    email: 'anthony.nasr@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'ka2ed_idare', troop_id: null }
    ],
    responsibilities: ['Council Member'],
    member_id: null
  },
  {
    name: 'Joe Antoury',
    email: 'joe.antoury@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'ka2ed_idare', troop_id: null }
    ],
    responsibilities: ['Council Member'],
    member_id: null
  },
  {
    name: 'Myriam Sahyoun',
    email: 'myriam.sahyoun@sdcsjm.org',
    rank: 'Assistant',
    roles: [
      { name: 'mouse3ed_ka2ed_fer2a', troop_id: TROOPS.jaramiz }
    ],
    responsibilities: ['Assistant Troop Leader'],
    member_id: 'b1a66beb-0bba-4147-bc5e-cb3e4ad030de'
  },
  {
    name: 'Michelle Abou Sleiman',
    email: 'michelle.abousleiman@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'ka2ed_fer2a', troop_id: TROOPS.zaharat }
    ],
    responsibilities: ['Troop Leader'],
    member_id: null
  },
  {
    name: 'Gaia Zakaria',
    email: 'gaia.zakaria@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'ka2ed_fer2a', troop_id: TROOPS.mourchidet }
    ],
    responsibilities: ['Troop Leader'],
    member_id: '7c691013-cb74-4a4c-a1f2-d800941537c6'
  },
  {
    name: 'Catherine Sakr',
    email: 'catherine.sakr@sdcsjm.org',
    rank: 'Assistant',
    roles: [
      { name: 'mouse3ed_ka2ed_fer2a', troop_id: TROOPS.mourchidet }
    ],
    responsibilities: ['Assistant Troop Leader'],
    member_id: '55c7ead1-4cb8-44d5-82e5-cf37c98acbcd'
  },
  {
    name: 'Wadih Daher',
    email: 'wadih.daher@sdcsjm.org',
    rank: 'Chief',
    roles: [
      { name: 'mouse3ed_ka2ed_fer2a', troop_id: TROOPS.jouwele }
    ],
    responsibilities: ['Assistant Troop Leader'],
    member_id: 'f448ccab-155c-465a-8c10-4c4323fae8b6'
  }
];

async function setup() {
  console.log('--- Fetching Roles & Responsibilities ---');
  const { data: dbRoles } = await supabase.from('roles').select('*');
  const { data: dbResps } = await supabase.from('responsibilities').select('*');
  
  const roleByName = new Map(dbRoles.map(r => [r.name, r]));
  const respByName = new Map(dbResps.map(r => [r.name, r]));

  console.log('--- Fetching existing Auth Users ---');
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const userByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));

  console.log('--- Clearing old user_roles and profile_responsibilities for non-configurators in Group ---');
  // Keep configurator profile intact
  const configUser = users.find(u => u.email === 'nasr528@gmail.com');
  const keepProfileIds = configUser ? [configUser.id] : [];

  const { data: allUserRoles } = await supabase.from('user_roles').select('id, profile_id, role_id, roles(name)');
  for (const ur of allUserRoles || []) {
    if (!keepProfileIds.includes(ur.profile_id)) {
      await supabase.from('user_roles').delete().eq('id', ur.id);
    }
  }

  const { data: allProfileResps } = await supabase.from('profile_responsibilities').select('profile_id, responsibility_id');
  for (const pr of allProfileResps || []) {
    if (!keepProfileIds.includes(pr.profile_id)) {
      await supabase.from('profile_responsibilities').delete().eq('profile_id', pr.profile_id);
    }
  }

  console.log('--- Provisioning Leaders ---');
  const results = [];

  for (const leader of LEADERS) {
    console.log(`\nProcessing: ${leader.name} (${leader.email})`);
    
    // 1. Check or Create Auth User
    let authUser = userByEmail.get(leader.email.toLowerCase());
    if (!authUser && leader.secondaryEmail) {
      authUser = userByEmail.get(leader.secondaryEmail.toLowerCase());
    }

    // Also check if michel vs michelle existed
    if (!authUser && leader.email.includes('michelle')) {
      authUser = userByEmail.get('michel.abousleiman@sdcsjm.org');
    }

    if (!authUser) {
      console.log(`  Creating Auth User for ${leader.email}...`);
      const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
        email: leader.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: leader.name }
      });
      if (createErr) {
        console.error(`  ❌ Failed to create auth user:`, createErr.message);
        continue;
      }
      authUser = createdUser.user;
    } else {
      console.log(`  Found existing Auth User ID: ${authUser.id}`);
      // Update password to ensure leader can login
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: DEFAULT_PASSWORD,
        user_metadata: { full_name: leader.name }
      });
    }

    const userId = authUser.id;

    // 2. Ensure Member record in leadership troop if needed
    let memberId = leader.member_id;
    if (!memberId) {
      // Check if member exists by name
      const [first, ...rest] = leader.name.split(' ');
      const last = rest.join(' ');
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .ilike('first_name', first)
        .ilike('last_name', last)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existingMember) {
        memberId = existingMember.id;
      } else {
        console.log(`  Creating new member record in Leadership troop for ${leader.name}...`);
        const { data: newMem, error: memErr } = await supabase
          .from('members')
          .insert({
            first_name: first,
            last_name: last,
            first_name_en: first,
            last_name_en: last,
            current_rank: leader.rank,
            group_id: GROUP_ID,
            troop_id: TROOPS.leadership,
            is_active: true,
            is_deleted: false,
            emergency_contact_name: 'N/A',
            emergency_contact_relation: 'N/A',
            emergency_contact_phone: 'N/A'
          })
          .select('id')
          .single();

        if (memErr) {
          console.error(`  ❌ Failed to create member:`, memErr.message);
        }

        if (newMem) {
          memberId = newMem.id;
        }
      }
    }

    // 3. Upsert Profile
    const mahemmText = leader.responsibilities.join(', ');
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: authUser.email,
        full_name: leader.name,
        rank: leader.rank,
        mahemm: mahemmText,
        member_id: memberId || null,
        needs_password_change: false,
        is_deleted: false
      });

    if (profErr) {
      console.error(`  ❌ Failed to update profile:`, profErr.message);
    }

    // 4. Insert Responsibilities
    for (const respName of leader.responsibilities) {
      const respObj = respByName.get(respName);
      if (respObj) {
        await supabase.from('profile_responsibilities').insert({
          profile_id: userId,
          responsibility_id: respObj.id
        });
      }
    }

    // 5. Insert User Roles
    const roleNames = [];
    const roleScopes = [];
    const troopIds = [];

    for (const r of leader.roles) {
      const roleObj = roleByName.get(r.name);
      if (roleObj) {
        roleNames.push(roleObj.name);
        roleScopes.push(roleObj.permission_scope);
        if (r.troop_id) troopIds.push(r.troop_id);

        await supabase.from('user_roles').insert({
          profile_id: userId,
          role_id: roleObj.id,
          group_id: GROUP_ID,
          troop_id: r.troop_id || null
        });
      }
    }

    // 6. Update App Metadata in Auth
    await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        roles: roleNames,
        role_scopes: roleScopes,
        group_ids: [GROUP_ID],
        troop_ids: troopIds,
        role: roleNames[0],
        role_scope: roleScopes[0],
        group_id: GROUP_ID,
        troop_id: troopIds[0] || null,
        member_id: memberId || null,
        needs_password_change: false
      }
    });

    results.push({
      name: leader.name,
      email: authUser.email,
      rank: leader.rank,
      roles: roleNames.join(', '),
      responsibilities: mahemmText,
      member_id: memberId || 'None',
      tempPassword: DEFAULT_PASSWORD
    });
  }

  console.log('\n======================================================');
  console.log(`✅ SUCCESSFULLY CONFIGURED ${results.length} LEADERS!`);
  console.log('======================================================');
  console.table(results);
}

setup().catch(console.error);
