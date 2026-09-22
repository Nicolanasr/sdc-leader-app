import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createServerSupabase } from '@/utils/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is not set.')
  }
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

const ADMIN_ROLES = [
  'chef_groupe',
  'assistant_chef_groupe',
  'amin_serr_group',
  'configurator',
]

// ── GET: Fetch current user profile and linked member record ──
export async function GET() {
  try {
    const clientSupabase = await createServerSupabase()
    const {
      data: { user },
    } = await clientSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const adminSupabase = getAdminClient()

    // 1. Fetch profile
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    let member = null
    let memberId = profile.member_id || user.app_metadata?.member_id

    // 2. Fetch member if linked
    if (memberId) {
      const { data: memberData } = await adminSupabase
        .from('members')
        .select(`
          *,
          troops:troop_id (
            id,
            name
          ),
          patrols:patrol_id (
            id,
            name
          )
        `)
        .eq('id', memberId)
        .maybeSingle()
      member = memberData
    }

    // 3. If not linked, check if a matching member exists in this group by name
    let suggestedMembers: any[] = []
    if (!member && profile.full_name) {
      const nameParts = profile.full_name.trim().split(/\s+/)
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ')

      const { data: matches } = await adminSupabase
        .from('members')
        .select('id, first_name, last_name, troop_id, troops:troop_id(name), current_rank')
        .eq('is_deleted', false)
        .ilike('first_name', `%${firstName}%`)
        .limit(5)

      if (matches) {
        suggestedMembers = matches.filter((m) => {
          if (!lastName) return true
          return m.last_name.toLowerCase().includes(lastName.toLowerCase())
        })
      }
    }

    return NextResponse.json({
      profile,
      member,
      suggestedMembers,
    })
  } catch (err: unknown) {
    console.error('Fetch profile error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── PATCH: Self-edit basic profile and member information ──
export async function PATCH(request: NextRequest) {
  try {
    const clientSupabase = await createServerSupabase()
    const {
      data: { user },
    } = await clientSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const adminSupabase = getAdminClient()

    // 1. Fetch current profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, member_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    // 2. Extract allowed fields to update
    const {
      first_name,
      last_name,
      first_name_ar,
      last_name_ar,
      father_name,
      father_name_ar,
      mother_name,
      mother_name_ar,
      phone_number,
      whatsapp_number,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_phone,
      blood_type,
      medical_info,
      address,
      school,
      hobbies,
      photo_url,
    } = body

    // 3. Update profiles table
    const profileUpdates: Record<string, any> = {}
    if (phone_number !== undefined) profileUpdates.phone_number = phone_number || null
    if (whatsapp_number !== undefined) profileUpdates.whatsapp_number = whatsapp_number || null
    if (first_name !== undefined || last_name !== undefined) {
      const fn = first_name !== undefined ? first_name : ''
      const ln = last_name !== undefined ? last_name : ''
      if (fn || ln) {
        profileUpdates.full_name = `${fn} ${ln}`.trim()
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: pErr } = await clientSupabase.from('profiles').update(profileUpdates).eq('id', user.id)
      if (pErr) {
        await adminSupabase.from('profiles').update(profileUpdates).eq('id', user.id)
      }
    }

    // 4. Update members table if member record is linked
    const memberId = profile.member_id || user.app_metadata?.member_id
    let updatedMember = null

    if (memberId) {
      const memberUpdates: Record<string, any> = {}
      if (first_name !== undefined) {
        memberUpdates.first_name = first_name.trim()
        memberUpdates.first_name_en = first_name.trim()
      }
      if (last_name !== undefined) {
        memberUpdates.last_name = last_name.trim()
        memberUpdates.last_name_en = last_name.trim()
      }
      if (first_name_ar !== undefined) memberUpdates.first_name_ar = first_name_ar?.trim() || null
      if (last_name_ar !== undefined) memberUpdates.last_name_ar = last_name_ar?.trim() || null
      if (father_name !== undefined) {
        memberUpdates.father_name = father_name?.trim() || null
        memberUpdates.father_name_en = father_name?.trim() || null
      }
      if (father_name_ar !== undefined) memberUpdates.father_name_ar = father_name_ar?.trim() || null
      if (mother_name !== undefined) {
        memberUpdates.mother_name = mother_name?.trim() || null
        memberUpdates.mother_name_en = mother_name?.trim() || null
      }
      if (mother_name_ar !== undefined) memberUpdates.mother_name_ar = mother_name_ar?.trim() || null

      if (phone_number !== undefined) memberUpdates.member_phone = phone_number || null
      if (emergency_contact_name !== undefined) memberUpdates.emergency_contact_name = emergency_contact_name
      if (emergency_contact_relation !== undefined) memberUpdates.emergency_contact_relation = emergency_contact_relation
      if (emergency_contact_phone !== undefined) memberUpdates.emergency_contact_phone = emergency_contact_phone
      if (blood_type !== undefined) memberUpdates.blood_type = blood_type || null
      if (medical_info !== undefined) memberUpdates.medical_info = medical_info || null
      if (address !== undefined) memberUpdates.address = address || null
      if (school !== undefined) memberUpdates.school = school || null
      if (hobbies !== undefined) memberUpdates.hobbies = hobbies || null
      if (photo_url !== undefined) memberUpdates.photo_url = photo_url || null

      if (Object.keys(memberUpdates).length > 0) {
        let { data: mData, error: mError } = await clientSupabase
          .from('members')
          .update(memberUpdates)
          .eq('id', memberId)
          .select('*')
          .single()

        if (mError) {
          const { data: adminData, error: adminErr } = await adminSupabase
            .from('members')
            .update(memberUpdates)
            .eq('id', memberId)
            .select('*')
            .single()

          if (adminErr) {
            if (adminErr.message?.includes('schema cache') || adminErr.message?.includes('column')) {
              const fallback = { ...memberUpdates }
              delete fallback.first_name_ar
              delete fallback.last_name_ar
              delete fallback.father_name_ar
              delete fallback.mother_name_ar
              delete fallback.first_name_en
              delete fallback.last_name_en
              delete fallback.father_name_en
              delete fallback.mother_name_en
              const { data: fallbackData } = await adminSupabase
                .from('members')
                .update(fallback)
                .eq('id', memberId)
                .select('*')
                .single()
              updatedMember = fallbackData
            } else {
              console.error('Failed to update member record:', adminErr)
              return NextResponse.json({ error: adminErr.message }, { status: 400 })
            }
          } else {
            updatedMember = adminData
          }
        } else {
          updatedMember = mData
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Basic information updated successfully.',
      member: updatedMember,
    })
  } catch (err: unknown) {
    console.error('Update basic info error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST: Link or create a member record for a profile ──
export async function POST(request: NextRequest) {
  try {
    const clientSupabase = await createServerSupabase()
    const {
      data: { user },
    } = await clientSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { action, targetProfileId, memberId, troopId } = body
    const adminSupabase = getAdminClient()

    const callerRole = user.app_metadata?.role
    const isCallerAdmin = ADMIN_ROLES.includes(callerRole)

    // Determine target profile
    const profileIdToUpdate = targetProfileId || user.id

    // If updating someone else's profile, caller must be admin
    if (profileIdToUpdate !== user.id && !isCallerAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }

    // 1. Fetch the target profile
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email, phone_number, rank')
      .eq('id', profileIdToUpdate)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target profile not found.' }, { status: 404 })
    }

    const callerGroupId = user.app_metadata?.group_id

    if (action === 'link') {
      if (!memberId) {
        return NextResponse.json({ error: 'memberId is required to link.' }, { status: 400 })
      }

      // Verify the member exists
      const { data: memberRecord, error: memError } = await adminSupabase
        .from('members')
        .select('id, first_name, last_name, troop_id')
        .eq('id', memberId)
        .single()

      if (memError || !memberRecord) {
        return NextResponse.json({ error: 'Member record not found.' }, { status: 404 })
      }

      // Link to profile
      await adminSupabase
        .from('profiles')
        .update({ member_id: memberId })
        .eq('id', profileIdToUpdate)

      // Also update auth app_metadata for this user so JWT reflects member_id
      await adminSupabase.auth.admin.updateUserById(profileIdToUpdate, {
        app_metadata: {
          member_id: memberId,
          troop_id: memberRecord.troop_id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Member profile linked successfully.',
        memberId,
      })
    }

    if (action === 'create') {
      // Find the 'Leadership' troop in this group, or fallback to first troop
      let targetTroopId = troopId

      if (!targetTroopId) {
        const { data: leadershipTroop } = await adminSupabase
          .from('troops')
          .select('id')
          .eq('group_id', callerGroupId)
          .ilike('name', '%leadership%')
          .maybeSingle()

        if (leadershipTroop) {
          targetTroopId = leadershipTroop.id
        } else {
          const { data: firstTroop } = await adminSupabase
            .from('troops')
            .select('id')
            .eq('group_id', callerGroupId)
            .limit(1)
            .maybeSingle()
          targetTroopId = firstTroop?.id
        }
      }

      if (!targetTroopId) {
        return NextResponse.json({ error: 'No troop found in group to assign member to.' }, { status: 400 })
      }

      const nameParts = (targetProfile.full_name || 'Leader Profile').trim().split(/\s+/)
      const firstName = nameParts[0] || 'Leader'
      const lastName = nameParts.slice(1).join(' ') || 'Member'

      // Create member in members table
      const { data: newMember, error: createError } = await adminSupabase
        .from('members')
        .insert({
          group_id: callerGroupId,
          troop_id: targetTroopId,
          first_name: firstName,
          last_name: lastName,
          member_phone: targetProfile.phone_number || null,
          current_rank: targetProfile.rank || 'Leader',
          emergency_contact_name: 'Group Headquarters',
          emergency_contact_relation: 'Scout Group',
          emergency_contact_phone: targetProfile.phone_number || '00000000',
          is_active: true,
        })
        .select('*')
        .single()

      if (createError || !newMember) {
        console.error('Failed to create member record:', createError)
        return NextResponse.json({ error: createError?.message || 'Failed to create member record.' }, { status: 500 })
      }

      // Link to profile
      await adminSupabase
        .from('profiles')
        .update({ member_id: newMember.id })
        .eq('id', profileIdToUpdate)

      // Update auth user app_metadata
      await adminSupabase.auth.admin.updateUserById(profileIdToUpdate, {
        app_metadata: {
          member_id: newMember.id,
          troop_id: targetTroopId,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Member record created and linked successfully.',
        member: newMember,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Must be "link" or "create".' }, { status: 400 })
  } catch (err: unknown) {
    console.error('Member link error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
