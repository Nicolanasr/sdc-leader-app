'use server'

import { createClient } from '@/utils/supabase/server'
import { getEmailAliases, resolveDeliverableEmail } from '@/utils/emailDelivery'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { FEATURES } from '@/config/features'

export async function signIn(formData: FormData) {
  const rawEmail = formData.get('email') as string
  const password = formData.get('password') as string

  if (!rawEmail || !password) {
    return redirect('/login?message=Email and password are required')
  }

  const serverSupabase = await createClient()
  const candidateEmails = getEmailAliases(rawEmail)

  let authResult = await serverSupabase.auth.signInWithPassword({
    email: candidateEmails[0],
    password,
  })

  if (authResult.error && candidateEmails.length > 1) {
    const secondAttempt = await serverSupabase.auth.signInWithPassword({
      email: candidateEmails[1],
      password,
    })
    if (!secondAttempt.error) {
      authResult = secondAttempt
    }
  }

  const { data, error } = authResult

  if (error) {
    console.error('Login error:', error)
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  const role = data.user?.app_metadata?.role || data.user?.app_metadata?.role_scope

  if (!FEATURES.scoutMemberLogin && role === 'scout_member') {
    await serverSupabase.auth.signOut()
    return redirect('/login?message=Member portal is currently disabled. Leader access only.')
  }

  if (role === 'configurator') {
    redirect('/configurator')
  } else {
    redirect('/group/dashboard')
  }
}

export async function sendMagicLink(formData: FormData) {
  const rawEmail = formData.get('email') as string
  if (!rawEmail) {
    return { error: 'Email address is required.' }
  }

  const deliverable = resolveDeliverableEmail(rawEmail)
  const serverSupabase = await createClient()

  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  const { error } = await serverSupabase.auth.signInWithOtp({
    email: deliverable,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/group/dashboard`,
    },
  })

  if (error) {
    console.error('Magic link dispatch error:', error)
    if (error.message.toLowerCase().includes('rate limit')) {
      return {
        error: 'Email rate limit reached for this hour. Please use password login.',
      }
    }
    return { error: error.message }
  }

  return { success: true }
}
