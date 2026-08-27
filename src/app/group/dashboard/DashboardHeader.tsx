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
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between md:justify-end shrink-0">
      <button
        onClick={onOpenMobileMenu}
        className="md:hidden text-teal-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Open Mobile Menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="text-right">
        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Logged in as</span>
        <div className="flex items-center justify-end gap-2">
          {userName && <span className="text-xs sm:text-sm font-bold text-slate-900">{userName}</span>}
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60">
            {formattedRole}
          </span>
        </div>
      </div>
    </header>
  )
}
