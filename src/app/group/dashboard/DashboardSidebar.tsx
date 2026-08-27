'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Landmark, Users, Layers, ClipboardList, Calendar } from 'lucide-react'

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
  'ka2ed_idare',
  'configurator',
]

const navLink = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
  <Link
    key={href}
    href={href}
    className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? 'bg-teal-700 text-white'
        : 'text-teal-100 hover:bg-teal-800 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </Link>
)

export default function DashboardSidebar({ groupName, currentRole, onClose, onLogout }: Props) {
  const pathname = usePathname()
  const isGroupAdmin = GROUP_ADMIN_ROLES.includes(currentRole)

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
        {navLink('/group/dashboard', 'Dashboard Overview', <Landmark className="h-4 w-4" />, pathname === '/group/dashboard')}

        {isGroupAdmin && (
          <>
            {navLink('/group/dashboard/leaders', 'Leaders & Council', <Users className="h-4 w-4" />, pathname === '/group/dashboard/leaders')}
            {navLink('/group/dashboard/troops', 'Units / Troops', <Layers className="h-4 w-4" />, pathname === '/group/dashboard/troops')}
          </>
        )}

        {navLink('/group/dashboard/members', 'Youth Roster', <Users className="h-4 w-4" />, pathname === '/group/dashboard/members')}
        {navLink('/group/dashboard/attendance', 'Attendance', <ClipboardList className="h-4 w-4" />, pathname === '/group/dashboard/attendance')}
        {navLink('/group/dashboard/events', 'Events & Camps', <Calendar className="h-4 w-4" />, pathname === '/group/dashboard/events')}

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-teal-400 uppercase tracking-wider">
          Modules (Read-Only)
        </div>
        <div className="px-4 py-2 text-xs text-teal-300 italic">
          Financials and inventory sub-pages will appear here in the next dev phase.
        </div>
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
