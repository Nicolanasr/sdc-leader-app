import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/group/dashboard'

  // Validate redirect target to prevent open redirect vulnerabilities
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/group/dashboard'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  const getSuccessRedirectUrl = () => {
    if (isLocalEnv) {
      return `${origin}${safeNext}`
    } else if (forwardedHost) {
      return `https://${forwardedHost}${safeNext}`
    } else {
      return `${origin}${safeNext}`
    }
  }

  // 1. Support PKCE code exchange (Standard OAuth & Email link flow)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(getSuccessRedirectUrl())
    }

    console.error('[AuthCallback] Code exchange error:', error.message)
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('The authentication link has expired or is invalid. Please request a new one.')}`
    )
  }

  // 2. Support Token Hash & OTP verification (Magic Link direct token flow)
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      return NextResponse.redirect(getSuccessRedirectUrl())
    }

    console.error('[AuthCallback] OTP verification error:', error.message)
    return NextResponse.redirect(
      `${origin}/login?message=${encodeURIComponent('The magic link has expired or is invalid. Please request a new one.')}`
    )
  }

  return NextResponse.redirect(`${origin}/login`)
}
