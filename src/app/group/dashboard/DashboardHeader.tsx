'use client'

import { Menu } from 'lucide-react'

interface Props {
  userName?: string
  currentRole: string
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
}

export default function DashboardHeader({ userName, currentRole, onOpenMobileMenu }: Props) {
  const formattedRole = ROLE_LABELS[currentRole] || currentRole.replace(/_/g, ' ')

  return (
    <header className="bg-white/95 backdrop-blur-xs sticky top-0 z-30 border-b border-slate-200 px-3 sm:px-6 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 sm:py-3 flex items-center justify-between md:justify-end shrink-0">
      <button
        onClick={onOpenMobileMenu}
        className="md:hidden text-teal-900 p-1.5 -ml-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Open Mobile Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 text-right">
        {userName && (
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">
            {userName}
          </span>
        )}
        <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200/70 truncate max-w-[140px] sm:max-w-none">
          {formattedRole}
        </span>
      </div>
    </header>
  )
}
