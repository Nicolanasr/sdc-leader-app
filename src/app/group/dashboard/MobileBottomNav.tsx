'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Landmark, Calendar, Users, ClipboardList, Menu, Wallet } from 'lucide-react'

interface Props {
  currentRole: string
  onOpenMenu: () => void
}

export default function MobileBottomNav({ currentRole, onOpenMenu }: Props) {
  const pathname = usePathname()

  const canAccessMembers = [
    'chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 
    'amin_sandou2_group', 'amin_tejhizet_group', 'ka2ed_fer2a', 
    'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'
  ].includes(currentRole)

  const isTreasurer = currentRole === 'amin_sandou2_group'

  const navItems = [
    {
      label: 'Home',
      href: '/group/dashboard',
      icon: Landmark,
      active: pathname === '/group/dashboard',
    },
    {
      label: 'Events',
      href: '/group/dashboard/events',
      icon: Calendar,
      active: pathname.startsWith('/group/dashboard/events'),
    },
    ...(canAccessMembers
      ? [
          {
            label: 'Scouts',
            href: '/group/dashboard/members',
            icon: Users,
            active: pathname.startsWith('/group/dashboard/members'),
          },
        ]
      : []),
    ...(isTreasurer
      ? [
          {
            label: 'Treasury',
            href: '/group/dashboard/finances',
            icon: Wallet,
            active: pathname.startsWith('/group/dashboard/finances'),
          },
        ]
      : [
          {
            label: 'Planner',
            href: '/group/dashboard/planner',
            icon: ClipboardList,
            active: pathname.startsWith('/group/dashboard/planner'),
          },
        ]),
  ]

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-95 min-w-[58px] ${
                item.active
                  ? 'text-teal-800 font-black'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  item.active ? 'bg-teal-100/70 text-teal-800' : 'text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          )
        })}

        {/* Menu Drawer Button */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-95 min-w-[58px] text-slate-500 hover:text-slate-800 font-medium"
        >
          <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  )
}
