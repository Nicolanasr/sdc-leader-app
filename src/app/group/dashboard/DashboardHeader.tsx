'use client'

import Link from 'next/link'
import { Menu, User, BellRing } from 'lucide-react'

interface Props {
  userName?: string
  currentRole: string
  roles?: string[]
  onOpenMobileMenu: () => void
}

const ROLE_LABELS: Record<string, string> = {
  chef_groupe: 'Chef de Groupe',
  assistant_chef_groupe: 'Assistant Chef de Groupe',
  amin_serr_group: 'Secrétaire du Groupe (أمين سر الفوج)',
  amin_sandou2_group: 'Trésorier du Groupe (أمين صندوق الفوج)',
  amin_tejhizet_group: 'Commissaire au matériel (أمين التجهيزات)',
  mas2oul_toswir: 'Responsable Médias / Communication',
  mas2oul_mounet: 'Responsable Logistique / Ravitaillement',
  ka2ed_idare: 'Commissaire Administratif',
  configurator: 'Superadmin / Configurator',
  ka2ed_fer2a: 'Chef de Troupe / Unité (قائد فرقة)',
  mouse3ed_ka2ed_fer2a: 'Assistant Chef de Troupe (مساعد قائد فرقة)',
  scout_member: 'Scout Member',
}

export default function DashboardHeader({ userName, currentRole, roles = [], onOpenMobileMenu }: Props) {
  const allRoles = Array.from(new Set([currentRole, ...roles].filter(Boolean)))
  const formattedRoles = allRoles
    .map((r) => ROLE_LABELS[r] || r.replace(/_/g, ' '))
    .join(' • ')

  return (
    <header className="bg-white/95 backdrop-blur-xs sticky top-0 z-30 border-b border-slate-200 px-3 sm:px-6 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 sm:py-3 flex items-center justify-between md:justify-end shrink-0">
      <button
        onClick={onOpenMobileMenu}
        className="md:hidden text-teal-900 p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Open Mobile Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2">
        <Link
          href="/test-push"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 active:scale-95 text-teal-900 border border-teal-200/80 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          title="Web Push Notifications Lab"
        >
          <BellRing className="h-3.5 w-3.5 text-teal-700" />
          <span className="text-[11px] sm:text-xs">Push Lab</span>
        </Link>

        <Link
          href="/group/dashboard/profile"
          className="flex items-center gap-2 text-right hover:bg-slate-100/70 p-1.5 -mr-1.5 rounded-xl transition-all group cursor-pointer"
          title="View My Profile"
        >
          <div className="flex flex-col items-end">
            {userName && (
              <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-teal-900 transition-colors truncate max-w-[120px] sm:max-w-none">
                {userName}
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200/70 truncate max-w-[200px] sm:max-w-none">
              {formattedRoles}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-teal-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
            <User className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </header>
  )
}
