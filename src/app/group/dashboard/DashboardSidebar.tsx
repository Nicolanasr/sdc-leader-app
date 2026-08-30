'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Landmark, Users, Layers, ClipboardList, Calendar, Wallet, Package, UtensilsCrossed, Megaphone, BookOpen, Award, Clock } from 'lucide-react'

interface Props {
  groupName: string
  currentRole: string
  onClose?: () => void
  onLogout: () => void
}

const GROUP_ADMIN_ROLES = [
  'chef_groupe',
  'assistant_chef_groupe',
  'amin_serr_group',
  'amin_sandou2_group',
  'amin_tejhizet_group',
  'mas2oul_toswir',
  'mas2oul_mounet',
  'amin_mounet_group',
  'ka2ed_idare',
  'configurator',
]

const navLink = (href: string, label: string, icon: React.ReactNode, active: boolean, onClick?: () => void) => (
  <Link
    key={href}
    href={href}
    prefetch={true}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
      active
        ? 'bg-teal-700 text-white shadow-xs'
        : 'text-teal-100 hover:bg-teal-800 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </Link>
)

export default function DashboardSidebar({ groupName, currentRole, onClose, onLogout }: Props) {
  const pathname = usePathname()

  // Role permissions per view (Supports multi-role leaders: group leaders, troop leaders, treasurers, and quartermasters)
  const canAccessBroadcast = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(currentRole)
  const canAccessLeaders = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(currentRole)
  const canAccessTroops = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(currentRole)
  const canAccessMembers = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'amin_sandou2_group', 'amin_tejhizet_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(currentRole)
  const canAccessAttendance = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(currentRole)
  const canAccessEvents = true
  const canAccessFinances = ['chef_groupe', 'assistant_chef_groupe', 'amin_sandou2_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(currentRole)
  const canAccessInventory = ['chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(currentRole)
  const canAccessPantry = ['chef_groupe', 'assistant_chef_groupe', 'amin_mounet_group', 'mas2oul_mounet', 'configurator'].includes(currentRole)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-teal-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{groupName}</h1>
          <p className="text-xs text-teal-300 mt-1">Group Dashboard</p>
        </div>
        {onClose && (
          <button className="md:hidden text-teal-200" onClick={onClose}>
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="p-4 space-y-1 flex-1">
        {navLink('/group/dashboard', 'Dashboard Overview', <Landmark className="h-4 w-4" />, pathname === '/group/dashboard', onClose)}

        {canAccessLeaders && (
          navLink('/group/dashboard/leaders', 'Leaders & Council', <Users className="h-4 w-4" />, pathname === '/group/dashboard/leaders', onClose)
        )}

        {canAccessBroadcast && (
          navLink('/group/dashboard/broadcast', 'WhatsApp Broadcast', <Megaphone className="h-4 w-4" />, pathname.startsWith('/group/dashboard/broadcast'), onClose)
        )}

        {canAccessTroops && (
          navLink('/group/dashboard/troops', 'Units / Troops', <Layers className="h-4 w-4" />, pathname === '/group/dashboard/troops', onClose)
        )}

        {canAccessMembers && (
          navLink('/group/dashboard/members', 'Youth Roster', <Users className="h-4 w-4" />, pathname === '/group/dashboard/members', onClose)
        )}

        {canAccessMembers && (
          navLink('/group/dashboard/progression', 'Progression & Badges', <Award className="h-4 w-4" />, pathname.startsWith('/group/dashboard/progression'), onClose)
        )}

        {canAccessAttendance && (
          navLink('/group/dashboard/attendance', 'Attendance', <ClipboardList className="h-4 w-4" />, pathname === '/group/dashboard/attendance', onClose)
        )}

        {canAccessAttendance && (
          navLink('/group/dashboard/planner', 'Session Planner (Canevas)', <Clock className="h-4 w-4" />, pathname.startsWith('/group/dashboard/planner'), onClose)
        )}

        {canAccessEvents && (
          navLink('/group/dashboard/events', 'Events & Camps', <Calendar className="h-4 w-4" />, pathname.startsWith('/group/dashboard/events'), onClose)
        )}

        {navLink('/group/dashboard/library', 'Library & Archive', <BookOpen className="h-4 w-4" />, pathname.startsWith('/group/dashboard/library'), onClose)}

        {canAccessFinances && (
          navLink('/group/dashboard/finances', 'Treasury & Dues', <Wallet className="h-4 w-4" />, pathname.startsWith('/group/dashboard/finances'), onClose)
        )}

        {canAccessInventory && (
          navLink('/group/dashboard/inventory', 'Equipment & Gear', <Package className="h-4 w-4" />, pathname.startsWith('/group/dashboard/inventory'), onClose)
        )}

        {canAccessPantry && (
          navLink('/group/dashboard/pantry', 'Provisions & Pantry', <UtensilsCrossed className="h-4 w-4" />, pathname.startsWith('/group/dashboard/pantry'), onClose)
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-teal-800">
        <button
          onClick={onLogout}
          className="w-full text-center px-4 py-2 rounded-lg text-sm font-semibold text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}
