/**
 * Email Domain Mapping & Delivery Utilities for Scouts des Cèdres
 *
 * Leaders and staff accounts may be created in the system with the shorthand domain:
 *   - @sdcsjm.org (e.g. nicolas.nasr@sdcsjm.org)
 *
 * In reality, physical inboxes and Google Workspace / mail servers are hosted on:
 *   - @sdcsaintjeanmarc.org (e.g. nicolas.nasr@sdcsaintjeanmarc.org)
 *
 * These utilities ensure that:
 * 1. All outgoing emails (notifications, Resend, password resets, onboarding emails) are routed to @sdcsaintjeanmarc.org.
 * 2. Login and password reset forms accept both @sdcsjm.org and @sdcsaintjeanmarc.org interchangeably.
 */

export const SDC_SHORTHAND_DOMAIN = 'sdcsjm.org'
export const SDC_DELIVERABLE_DOMAIN = 'sdcsaintjeanmarc.org'

/**
 * Resolves the actual receiving email inbox address.
 * Replaces @sdcsjm.org with @sdcsaintjeanmarc.org.
 *
 * @param email Input email (e.g. "nicolas.nasr@sdcsjm.org")
 * @returns Deliverable email (e.g. "nicolas.nasr@sdcsaintjeanmarc.org")
 */
export function resolveDeliverableEmail(email?: string | null): string {
  if (!email) return ''
  const trimmed = email.trim()
  return trimmed.replace(/@sdcsjm\.org$/i, `@${SDC_DELIVERABLE_DOMAIN}`)
}

/**
 * Returns candidate email addresses to test during authentication or lookups.
 * E.g. "user@sdcsjm.org" -> ["user@sdcsjm.org", "user@sdcsaintjeanmarc.org"]
 */
export function getEmailAliases(email?: string | null): string[] {
  if (!email) return []
  const trimmed = email.trim()
  const lower = trimmed.toLowerCase()
  const candidates = new Set<string>()

  candidates.add(trimmed)

  if (lower.endsWith(`@${SDC_SHORTHAND_DOMAIN}`)) {
    candidates.add(trimmed.replace(new RegExp(`@${SDC_SHORTHAND_DOMAIN}$`, 'i'), `@${SDC_DELIVERABLE_DOMAIN}`))
  } else if (lower.endsWith(`@${SDC_DELIVERABLE_DOMAIN}`)) {
    candidates.add(trimmed.replace(new RegExp(`@${SDC_DELIVERABLE_DOMAIN}$`, 'i'), `@${SDC_SHORTHAND_DOMAIN}`))
  }

  return Array.from(candidates)
}
