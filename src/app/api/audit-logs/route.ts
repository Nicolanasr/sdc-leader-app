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

const AUTHORIZED_ROLES = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator']

export async function GET(request: NextRequest) {
  try {
    const clientSupabase = await createServerSupabase()
    const {
      data: { user },
    } = await clientSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const callerRole = user.app_metadata?.role || 'scout_member'
    const callerRoles: string[] = Array.from(
      new Set([
        callerRole,
        ...(user.app_metadata?.roles || []),
        ...(user.app_metadata?.role_scopes || []),
      ].filter(Boolean))
    )
    const callerGroupId = user.app_metadata?.group_id
    const isConfigurator = callerRoles.includes('configurator')
    const hasAuthorizedRole = callerRoles.some((r) => AUTHORIZED_ROLES.includes(r))

    if (!hasAuthorizedRole) {
      return NextResponse.json({ error: 'Forbidden. Audit log access restricted.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const tableName = searchParams.get('table')
    const action = searchParams.get('action')
    const recordId = searchParams.get('record_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    const adminSupabase = getAdminClient()

    let query = adminSupabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!isConfigurator && callerGroupId) {
      query = query.or(`group_id.eq.${callerGroupId},group_id.is.null`)
    }

    if (tableName) {
      query = query.eq('table_name', tableName)
    }

    if (action) {
      query = query.eq('action', action.toUpperCase())
    }

    if (recordId) {
      query = query.eq('record_id', recordId)
    }

    const { data: logs, error } = await query

    if (error) {
      // If table doesn't exist yet prior to migration run
      if (error.message?.includes('relation "public.audit_logs" does not exist') || error.message?.includes('schema cache')) {
        return NextResponse.json({ logs: [], pendingMigration: true })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (err: unknown) {
    console.error('Audit logs API error:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
