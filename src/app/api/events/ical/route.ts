import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ical from 'ical-generator'

// Instantiate Supabase admin client (using service role key for unauthenticated calendar subscription feeds)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  if (!groupId) {
    return new NextResponse('Group ID required', { status: 400 })
  }

  // Fetch Group Name
  const { data: groupData } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  const groupName = groupData?.name || 'Scouts des Cèdres'

  // Fetch active events for group
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('iCal events fetch error:', error)
  }

  // Initialize Calendar
  const calendar = ical({
    name: `${groupName} — Scout Events`,
    timezone: 'Asia/Beirut',
    url: request.url,
    ttl: 1800, // 30 minutes refresh interval on phone
  })

  for (const ev of events || []) {
    if (!ev.start_time || !ev.end_time) continue

    calendar.createEvent({
      id: ev.id,
      start: new Date(ev.start_time),
      end: new Date(ev.end_time),
      summary: ev.title,
      description: ev.description ? `${ev.description}\n\nType: ${ev.event_type.toUpperCase()} | Scope: ${ev.scope}` : `Scope: ${ev.scope} | Type: ${ev.event_type}`,
      location: ev.location || '',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.sdcsaintjeanmarc.org'}/group/dashboard/events/${ev.id}`,
    })
  }

  const calendarContent = calendar.toString()

  return new NextResponse(calendarContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${groupName.replace(/\s+/g, '_')}_scout_events.ics"`,
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
