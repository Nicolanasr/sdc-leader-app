import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can lead to a significant
  // security vulnerability.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Enforce mandatory password change if needs_password_change is true
  const path = request.nextUrl.pathname
  const needsPasswordChange = user?.app_metadata?.needs_password_change === true

  if (
    user &&
    needsPasswordChange &&
    !path.startsWith('/change-password') &&
    !path.startsWith('/login') &&
    !path.startsWith('/bootstrap') &&
    !path.startsWith('/auth') &&
    !path.startsWith('/reset-password')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/change-password'
    return NextResponse.redirect(url)
  }

  // Redirect legacy /portal to /group/dashboard
  if (path.startsWith('/portal')) {
    const url = request.nextUrl.clone()
    url.pathname = '/group/dashboard'
    return NextResponse.redirect(url)
  }

  const isScoutMember = user?.app_metadata?.role === 'scout_member'

  if (isScoutMember) {
    // Strictly administrative leader routes that scout members cannot access
    const adminOnlyRoutes = [
      '/group/dashboard/leaders',
      '/group/dashboard/troops',
      '/group/dashboard/broadcast',
      '/group/dashboard/pantry',
      '/group/dashboard/planner',
      '/group/dashboard/progression',
      '/configurator',
    ]
    if (adminOnlyRoutes.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = '/group/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
