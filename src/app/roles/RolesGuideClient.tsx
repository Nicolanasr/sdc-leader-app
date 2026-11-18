'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  BookOpen,
  Share2,
  Check,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
} from 'lucide-react'

export interface RoleAccessItem {
  module: string
  level: 'full' | 'unit' | 'view' | 'none'
  note: string
}

export interface RoleWorkflowStep {
  title: string
  where: string
  steps: string[]
}

export interface RoleGuide {
  id: string
  title: string
  titleAr: string
  badge: string
  scope: string
  summary: string
  access: RoleAccessItem[]
  workflows: RoleWorkflowStep[]
  tips: string[]
}

const ROLE_GUIDES: RoleGuide[] = [
  {
    id: 'chef_groupe',
    title: 'Chef de Groupe (Group Leader)',
    titleAr: 'قائد الفوج',
    badge: 'Group Command',
    scope: 'Full Group-Wide Access (All Units & Every Module)',
    summary:
      'Top operational authority for Groupe Saint Jean Marc. Has full read/write access across every unit, leader account, audit log, WhatsApp & Push communications, treasury, equipment depot, pantry, events, library, and Cedars Scout AI.',
    access: [
      { module: 'Leaders & Council', level: 'full', note: 'Onboard leaders, assign multiple roles & troops, reset leader passwords, inspect Audit Logs' },
      { module: 'Communications & Push', level: 'full', note: 'WhatsApp broadcasts, Arabic circular builder, & direct mobile Push Notifications with lock-screen preview' },
      { module: 'Units / Troops', level: 'full', note: 'Create, rename, and organize all scout units/sections' },
      { module: 'Youth Roster & Patrols', level: 'full', note: 'Add/edit/delete scouts, create patrols, link siblings across any troop, Totem, Medical/Emergency, Export CSV' },
      { module: 'Attendance', level: 'full', note: 'Create Weekly, Activity, or Leadership sessions; mark Present/Late/Excused/Absent + reasons; edit past sheets' },
      { module: 'Events & Camps', level: 'full', note: 'Create events, manage staff, participant roster & Export CSV, event budget/fees/expenses, pantry requests & Drive docs' },
      { module: 'Library & Archive', level: 'full', note: 'Upload/edit/delete books, manuals, songbook (lyrics/chords/MP3), & browse Event Media Archive by Year/Event' },
      { module: 'Treasury & Dues', level: 'full', note: 'Dues Matrix, Group Ledger (income/expenses), approve Troop Cash Handovers & Disbursement Requests' },
      { module: 'Equipment & Gear', level: 'full', note: 'Manage central catalog, run Jard physical inventory counts, and process write-offs' },
      { module: 'Provisions & Pantry', level: 'full', note: 'Add/edit items & Stock Lots (brand/size/expiry), Take/Add stock, fulfill camp requests (FIFO), Activity Logs, Excel/CSV export' },
      { module: 'Cedars Scout AI & Profile', level: 'full', note: 'Live database AI assistant (pantry, attendance, dues, events, scouts) + My Profile & password management' },
    ],
    workflows: [
      {
        title: 'Onboard a New Leader, Reset Passwords & Audit Logs',
        where: 'Sidebar → Leaders & Council',
        steps: [
          'Tap + Onboard Leader, enter name, email, rank, and assign one or more Roles + Troop (if unit-level).',
          'If a leader forgets their password, open their card and tap Reset Password to generate a new temporary password.',
          'Open the Audit Logs tab anytime to trace who created, edited, or deleted records across the group.',
        ],
      },
      {
        title: 'Send WhatsApp Circulars or Lock-Screen Push Alerts',
        where: 'Sidebar → Communications & Alerts',
        steps: [
          'WhatsApp Broadcast: choose an Arabic circular template (or tap صانع النماذج Builder to save a custom template), pick recipients/Parents Group, and confirm dispatch.',
          'Push Notifications: switch to Push Notifications, target All Devices or Specific Users (filter by troop or "Has Device"), preview the phone lock screen, set optional delay, test on your phone, and Broadcast.',
        ],
      },
      {
        title: 'Monitor Everything with Cedars Scout AI',
        where: 'Floating ⚜️ AI button (bottom-right)',
        steps: [
          'Tap ⚜️ on any screen to query live database numbers.',
          'Ask about expired/low-stock pantry items, unpaid dues, attendance rates, upcoming events, or scout counts.',
        ],
      },
    ],
    tips: [
      'You can hold multiple roles simultaneously—permissions combine automatically.',
      'Use the Refresh icon in the top header bar when using the installed mobile app to pull the latest updates from other leaders.',
      'An amber Offline Banner appears automatically if you lose signal at a camp.',
    ],
  },
  {
    id: 'assistant_chef_groupe',
    title: 'Assistant Chef de Groupe',
    titleAr: 'مساعد قائد الفوج',
    badge: 'Group Command',
    scope: 'Full Group-Wide Access (All Units & Every Module)',
    summary:
      'Shares full group-wide operational command with the Chef de Groupe across leaders, communications, push alerts, units, youth roster, attendance, events, library, treasury, equipment, pantry, and Cedars Scout AI.',
    access: [
      { module: 'Leaders & Council', level: 'full', note: 'Onboard leaders, assign roles, reset passwords, view Audit Logs' },
      { module: 'Communications & Push', level: 'full', note: 'Send WhatsApp broadcasts, manage templates & dispatch mobile Push Notifications' },
      { module: 'Units / Troops', level: 'full', note: 'Create and manage group units' },
      { module: 'Youth Roster & Patrols', level: 'full', note: 'Full read/write across all troops, patrols, siblings & CSV export' },
      { module: 'Attendance', level: 'full', note: 'Create sessions & take attendance for any unit or leadership meeting' },
      { module: 'Events & Camps', level: 'full', note: 'Full event creation, staff, roster + CSV export, finances, pantry requests & Drive uploads' },
      { module: 'Library & Archive', level: 'full', note: 'Upload/manage resources & browse Event Media Archive' },
      { module: 'Treasury & Dues', level: 'full', note: 'View and manage dues, handovers, disbursements & group ledger' },
      { module: 'Equipment & Gear', level: 'full', note: 'Full catalog, Jard counts & write-offs' },
      { module: 'Provisions & Pantry', level: 'full', note: 'Full stock lots, quick take/add, camp requests, logs & Excel/CSV export' },
    ],
    workflows: [
      {
        title: 'Create & Run a Group Event or Camp',
        where: 'Bottom Nav → Events → + Event',
        steps: [
          'Tap + Event, set Title, Type (Camp / Meeting / Activity), Dates, and Target Troops.',
          'Inside the event: use Overview (staff & details), Roster (attendance + Export CSV), Budget (fees & expenses), Logistics (pantry requests), and Documents (Google Drive auto-folders).',
        ],
      },
      {
        title: 'Send Push Notifications to Specific Troops',
        where: 'Sidebar → Communications & Alerts → Push Notifications',
        steps: [
          'Select Specific Users, filter by Troop or Has Device, and pick recipients.',
          'Tap Test on My Phone first to verify formatting on the lock-screen mockup, then Broadcast.',
        ],
      },
    ],
    tips: [
      'Install the portal via Share → Add to Home Screen (iPhone) or Install App (Android) to receive lock-screen push alerts.',
    ],
  },
  {
    id: 'amin_serr_group',
    title: 'Secrétaire Général (Group Secretary)',
    titleAr: 'أمين السر العام',
    badge: 'Secretariat',
    scope: 'Group-Wide Administration, Roster, Attendance, Events, Library & WhatsApp',
    summary:
      'Maintains the official group registry: leader directory, audit logs, units, youth roster, patrols, attendance, events, library & event media archive, and WhatsApp circulars. Has read-only access to Pantry and no access to Treasury or Equipment.',
    access: [
      { module: 'Leaders & Council', level: 'full', note: 'Manage leader profiles, role/troop assignments, password resets & Audit Logs' },
      { module: 'Communications (WhatsApp)', level: 'full', note: 'Send WhatsApp circulars & build custom templates (Push Notifications tab is restricted to Group Leader/Assistant)' },
      { module: 'Units / Troops', level: 'full', note: 'Create and organize group troops/sections' },
      { module: 'Youth Roster & Patrols', level: 'full', note: 'Add/edit/delete scouts, create patrols, cross-troop sibling linking, medical/totem, 1-tap Call/WhatsApp & CSV Export' },
      { module: 'Attendance', level: 'full', note: 'Create sessions & record attendance across all units & leadership meetings' },
      { module: 'Events & Camps', level: 'full', note: 'Create events, manage participant rosters (+ CSV Export), fees & Google Drive documents' },
      { module: 'Library & Archive', level: 'full', note: 'Upload, edit & delete group documents, songs & browse Event Media Archive' },
      { module: 'Provisions & Pantry', level: 'view', note: 'View central stock & activity logs (read-only; cannot add/remove stock)' },
      { module: 'Treasury & Dues', level: 'none', note: 'Restricted to Treasurer, Troop Leaders & Group Command' },
      { module: 'Equipment & Gear', level: 'none', note: 'Restricted to Quartermaster & Group Command' },
    ],
    workflows: [
      {
        title: 'Add Scouts, Link Siblings Across Troops & Export CSV',
        where: 'Bottom Nav → Scouts',
        steps: [
          'Tap + Add Scout to enter EN/AR name, birth date, blood type, allergies, parent phones, emergency contact, troop, and patrol.',
          'In Family / Siblings, search for siblings across ANY troop in the group and link them.',
          'Tap the CSV button at the top right anytime to download the filtered roster for Excel.',
        ],
      },
      {
        title: 'Create a Patrouille (Patrol)',
        where: 'Bottom Nav → Scouts → + Patrol',
        steps: [
          'Tap + Patrol at the top right, choose the Troop/Unit, enter the Patrol name, and save.',
          'Edit any scout profile to assign them to that patrol or set their patrol role.',
        ],
      },
      {
        title: 'Send WhatsApp Broadcasts & Build Templates',
        where: 'Sidebar → Communications & Alerts',
        steps: [
          'Choose an Arabic circular template or tap صانع النماذج (Builder) to save reusable circulars.',
          'Select recipients / Parents Group and confirm dispatch.',
        ],
      },
    ],
    tips: [
      'Event files uploaded in any Event\'s Documents tab automatically appear in Library & Archive → Event Media organized by Year & Event.',
    ],
  },
  {
    id: 'amin_sandou2_group',
    title: 'Trésorier Général (Group Treasurer)',
    titleAr: 'أمين الصندوق العام',
    badge: 'Treasury',
    scope: 'Group-Wide Treasury, Annual Dues, Handovers, Disbursements & Event Budgets',
    summary:
      'Controls all group financial operations: tracking monthly/annual scout dues across all units, approving troop cash handovers, processing disbursement requests, managing event budgets, and logging group income/expenses.',
    access: [
      { module: 'Treasury & Dues', level: 'full', note: 'Dues Matrix (pay single or multiple months), Group Ledger, approve Handovers & Disbursement Requests' },
      { module: 'Events & Camps', level: 'full', note: 'View events, collect participant fees, log event expenses & inspect event financial balance' },
      { module: 'Library & Archive', level: 'full', note: 'Browse resources, Event Media Archive & upload financial docs' },
      { module: 'Youth Roster / Attendance', level: 'none', note: 'Managed by Secretary & Troop Leaders' },
      { module: 'Equipment & Gear', level: 'none', note: 'Managed by Quartermaster' },
      { module: 'Provisions & Pantry', level: 'none', note: 'Managed by Mounet' },
    ],
    workflows: [
      {
        title: 'Record Scout Dues Payments',
        where: 'Bottom Nav → Treasury → Dues Tab',
        steps: [
          'Search a scout by name or filter by Troop.',
          'Tap Pay $X on any pending month pill (or record a multi-month payment) to mark it paid immediately.',
        ],
      },
      {
        title: 'Approve Troop Handovers & Log Group Transactions',
        where: 'Bottom Nav → Treasury → Handovers / Ledger',
        steps: [
          'Review cash handovers submitted by Troop Leaders and mark them Received.',
          'Use Record Transaction to log group-level income or expenses with category, amount, and notes.',
        ],
      },
    ],
    tips: [
      'You can ask Cedars Scout AI (⚜️ button) to summarize unpaid dues or recent expenses at any time.',
    ],
  },
  {
    id: 'amin_tejhizet_group',
    title: 'Quartier-Maître (Equipment & Gear)',
    titleAr: 'أمين التجهيزات',
    badge: 'Logistics',
    scope: 'Central Equipment Catalog, Jard Counts & Write-Offs',
    summary:
      'Manages all physical scout gear (tents, ropes, stoves, lamps, first-aid kits). Maintains catalog quantities, runs periodic Jard (physical inventory) counts, and logs damaged or lost write-offs.',
    access: [
      { module: 'Equipment & Gear', level: 'full', note: 'Add/edit/delete catalog items, run Jard physical counts, submit & process write-offs' },
      { module: 'Events & Camps', level: 'view', note: 'View event dates & coordinate gear preparation' },
      { module: 'Library & Archive', level: 'full', note: 'Browse resources & Event Media Archive' },
      { module: 'Roster / Treasury / Pantry', level: 'none', note: 'Restricted to respective owners' },
    ],
    workflows: [
      {
        title: 'Add Equipment & Run a Jard (Physical Count)',
        where: 'Sidebar → Equipment & Gear',
        steps: [
          'Tap New Item to log gear name, category, shelf/depot location, quantity, and condition.',
          'Tap Jard Count to verify actual shelf quantities—discrepancies are recorded cleanly.',
          'Use Write-Offs to log permanently damaged or lost items.',
        ],
      },
    ],
    tips: [
      'Troop leaders do not have direct access to Equipment & Gear—coordinate camp gear requests with them directly.',
    ],
  },
  {
    id: 'mas2oul_mounet',
    title: 'Responsable Mounet (Pantry & Provisions)',
    titleAr: 'مسؤول المؤونة',
    badge: 'Provisions',
    scope: 'Central Pantry Inventory, Brand/Expiry Lots, FIFO Requests & Activity Logs',
    summary:
      'Manages all food and camp provisions. Tracks exact brands, package sizes (e.g., 1kg, 25 sachets), expiry dates, shelf locations, fulfills camp requests using FIFO (earliest expiry first), and exports Excel/CSV stock sheets.',
    access: [
      { module: 'Provisions & Pantry', level: 'full', note: 'Add/edit items, Stock Lots (brand/size/expiry), Quick Take/Add, Activity Logs, Camp Requests (FIFO), Excel & CSV Export' },
      { module: 'Events & Camps', level: 'view', note: 'View camp dates & incoming provision requests' },
      { module: 'Library & Archive', level: 'full', note: 'Browse shared resources & Event Media Archive' },
      { module: 'Roster / Treasury / Equipment', level: 'none', note: 'Restricted to respective owners' },
    ],
    workflows: [
      {
        title: 'Add or Edit Items with Brands & Expiry Dates',
        where: 'Sidebar → Provisions & Pantry → Add Item / Edit Icon',
        steps: [
          'Tap Add Item (choose Detailed Lots for multiple brands/expiries, or Quick Add for a single batch).',
          'Under Stock Lots, tap Add Lot and fill Brand / Type, Size / Format (e.g., 25 sachets), Qty, and Expiry Date.',
          'Tap Save to Pantry—stock totals and expiry alerts update automatically.',
        ],
      },
      {
        title: 'Take or Restock Provisions (Exact Brand & Expiry)',
        where: 'Provisions & Pantry → Item Card → - Take / + Add',
        steps: [
          'Tap - Take or + Add directly on any item card.',
          'Choose the exact Brand & Expiry Lot you are taking from or adding to, enter quantity, and confirm.',
          'Every change is recorded in the Activity Logs tab with user, timestamp, and reason.',
        ],
      },
      {
        title: 'Fulfill Camp Requests & Export Stock',
        where: 'Provisions & Pantry → Camp Requests / Download Icon',
        steps: [
          'Open Camp Requests to approve and deduct requested provisions using earliest-expiry-first (FIFO).',
          'Tap the Download icon at the top right to export the full pantry as Excel (.xlsx) or CSV.',
        ],
      },
    ],
    tips: [
      'Tap the top KPI cards (All Stock, Low Stock, Exp <45d, Expired) to filter expiring or low items instantly before every camp.',
    ],
  },
  {
    id: 'ka2ed_fer2a',
    title: "Chef d'Unité (Troop Leader)",
    titleAr: 'قائد الوحدة',
    badge: 'Unit Command',
    scope: 'Assigned Troop / Section Only (Scouts, Patrols, Attendance, Unit Dues & Events)',
    summary:
      'Leads a specific scout unit (Zaharat, Afrodit, Ahiram, Alissar, Jaramiz, or Ra3). Manages unit scouts, patrols, weekly attendance, unit dues & handovers, unit events, and Google Drive document/media uploads.',
    access: [
      { module: 'Youth Roster & Patrols', level: 'unit', note: 'Add/edit unit scouts, create patrols, cross-troop sibling linking, medical/totem, 1-tap Call/WhatsApp & CSV Export' },
      { module: 'Attendance', level: 'unit', note: 'Create sessions, mark Present/Late/Excused/Absent + reasons, view attendance history' },
      { module: 'Events & Camps', level: 'unit', note: 'Create unit events, manage roster & attendance (+ CSV Export), collect fees, upload photos/docs to Google Drive' },
      { module: 'Treasury & Dues', level: 'unit', note: 'Collect unit dues and submit cash handovers to Group Treasurer' },
      { module: 'Library & Archive', level: 'full', note: 'Browse manuals, songs (lyrics/chords/MP3) & Event Media Archive' },
      { module: 'Equipment & Gear', level: 'none', note: 'Not accessible to Troop Leaders (managed by Quartermaster)' },
      { module: 'Leaders / Communications / Pantry', level: 'none', note: 'Managed at Group level' },
    ],
    workflows: [
      {
        title: 'Create a Patrouille (Patrol) & Assign Scouts',
        where: 'Bottom Nav → Scouts → + Patrol',
        steps: [
          'Tap + Patrol at the top right (your unit is selected automatically).',
          'Enter the Patrol name and save.',
          'Tap the Edit (pencil) icon on any scout in your unit to assign them to the patrol or set their patrol role.',
        ],
      },
      {
        title: 'Take Weekly Attendance on Mobile',
        where: 'Bottom Nav → Attendance → New Session',
        steps: [
          'Tap New Session, pick Weekly Meeting or Activity, select date, and create.',
          'Tap Present, Late, Excused, or Absent (add optional reason) for each scout, then tap Save Sheet.',
        ],
      },
      {
        title: 'Manage Event Roster, Export CSV & Upload Camp Media',
        where: 'Bottom Nav → Events → Open Event',
        steps: [
          'Use the Roster tab to add/remove scouts, mark event attendance, or tap Export CSV for an offline sheet.',
          'Use the Documents tab to upload camp photos, PDFs, or Drive links—they auto-organize in Google Drive and appear in Library & Archive → Event Media.',
        ],
      },
    ],
    tips: [
      'When linking siblings on a scout profile, you can search scouts from ANY troop in the group.',
      'Use 1-tap Call or WhatsApp directly on any scout card in Youth Roster to reach parents quickly.',
    ],
  },
  {
    id: 'mouse3ed_ka2ed_fer2a',
    title: "Assistant Chef d'Unité (Assistant Troop Leader)",
    titleAr: 'مساعد قائد الوحدة',
    badge: 'Unit Command',
    scope: 'Assigned Troop / Section Only',
    summary:
      'Supports the Chef d\'Unité with day-to-day unit operations: youth roster, patrols, weekly attendance, unit dues, unit events, and Google Drive media/document uploads.',
    access: [
      { module: 'Youth Roster & Patrols', level: 'unit', note: 'Add/edit unit scouts, create patrols, cross-troop sibling linking & CSV Export' },
      { module: 'Attendance', level: 'unit', note: 'Create sessions & take weekly unit attendance' },
      { module: 'Events & Camps', level: 'unit', note: 'Create/manage unit events, rosters (+ CSV Export), fees & Drive uploads' },
      { module: 'Treasury & Dues', level: 'unit', note: 'Collect unit dues and log handovers' },
      { module: 'Library & Archive', level: 'full', note: 'Browse resources, songbook & Event Media Archive' },
      { module: 'Equipment & Gear', level: 'none', note: 'Not accessible to Troop Leaders' },
    ],
    workflows: [
      {
        title: 'Take Attendance & Track Unit Dues',
        where: 'Bottom Nav → Attendance / Treasury',
        steps: [
          'Open Attendance to log weekly presence/absence for your unit.',
          'Open Treasury to record monthly dues collected from scouts in your unit.',
        ],
      },
    ],
    tips: [
      'Coordinate with your Chef d\'Unité before submitting cash handovers to the Group Treasurer.',
    ],
  },
  {
    id: 'mas2oul_toswir',
    title: 'Responsable Média (Media & Photography)',
    titleAr: 'مسؤول الإعلام والتصوير',
    badge: 'Media',
    scope: 'Events Media Uploads & Group Library Archive',
    summary:
      'Documents group and unit activities, uploads camp photos/videos/Drive links inside Events (which auto-archive into Library → Event Media by Year & Event), and accesses the Group Library.',
    access: [
      { module: 'Events & Camps', level: 'full', note: 'View all events & upload media/links to Event Google Drive folders' },
      { module: 'Library & Archive', level: 'full', note: 'Browse all resources & Event Media Archive (by Year, Event, Unit & Media Type)' },
      { module: 'Roster / Treasury / Pantry / Gear', level: 'none', note: 'Restricted to administrative/unit roles' },
    ],
    workflows: [
      {
        title: 'Upload Event Photos & Media to the Archive',
        where: 'Bottom Nav → Events → Select Event → Documents Tab',
        steps: [
          'Open the event you are covering and switch to the Documents tab.',
          'Upload files or attach a Google Drive folder link—files auto-organize into Group → Troop → Event folders in Drive and appear in Library → Event Media.',
        ],
      },
    ],
    tips: [
      'Always name uploaded albums/files clearly (e.g., "Day 2 Campfire Photos") so anyone can find them later in the Event Media Archive.',
    ],
  },
  {
    id: 'ka2ed_idare',
    title: 'Chef Administratif (Administrative Leader)',
    titleAr: 'القائد الإداري',
    badge: 'Administration',
    scope: 'Events & Library Archive',
    summary:
      'Supports administrative coordination around group events, documentation, and the shared Library & Event Media Archive.',
    access: [
      { module: 'Events & Camps', level: 'full', note: 'View events and attach/review administrative documents' },
      { module: 'Library & Archive', level: 'full', note: 'Browse group templates, manuals & Event Media Archive' },
      { module: 'Roster / Treasury / Pantry / Gear', level: 'none', note: 'Restricted unless another role is also assigned' },
    ],
    workflows: [
      {
        title: 'Find & Share Administrative Documents',
        where: 'Sidebar → Library & Archive',
        steps: [
          'Use the Library tab for permanent forms/manuals, or the Event Media tab to retrieve documents from past events by Year & Event.',
        ],
      },
    ],
    tips: [
      'If you also need Roster or Attendance access, ask the Chef de Groupe to assign an additional role on your profile.',
    ],
  },
]

const ACCESS_BADGE: Record<RoleAccessItem['level'], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  full: {
    label: 'Full Access',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  unit: {
    label: 'Assigned Unit',
    cls: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: Shield,
  },
  view: {
    label: 'Read-Only',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Eye,
  },
  none: {
    label: 'No Access',
    cls: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: XCircle,
  },
}

export default function RolesGuideClient({ initialRoleId }: { initialRoleId?: string }) {
  const validInitial = ROLE_GUIDES.find((r) => r.id === initialRoleId)?.id || ROLE_GUIDES[0].id
  const [selectedId, setSelectedId] = useState<string>(validInitial)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialRoleId && ROLE_GUIDES.some((r) => r.id === initialRoleId)) {
      setSelectedId(initialRoleId)
    }
  }, [initialRoleId])

  const activeRole = ROLE_GUIDES.find((r) => r.id === selectedId) || ROLE_GUIDES[0]

  const handleSelectRole = (id: string) => {
    setSelectedId(id)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('role', id)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleShareRole = async () => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/roles?role=${activeRole.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback ignored
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-[max(env(safe-area-inset-bottom),2rem)]">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/login"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700 shrink-0"
              title="Back to Sign In"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base">⚜️</span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  Leader Roles & Onboarding Guide
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                Scouts des Cèdres • Groupe Saint Jean Marc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareRole}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            <span>{copied ? 'Copied' : 'Share Role'}</span>
          </button>
        </div>

        {/* Horizontal Role Selector */}
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {ROLE_GUIDES.map((role) => {
            const active = role.id === activeRole.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role.id)}
                className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
                  active
                    ? 'bg-teal-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {role.title.split(' (')[0]}
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4">
        {/* Role Hero Card */}
        <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-700/80 text-teal-100 border border-teal-500/40">
              {activeRole.badge}
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-300" dir="rtl">
              {activeRole.titleAr}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{activeRole.title}</h2>
          <p className="text-sm font-bold text-teal-200">{activeRole.scope}</p>
          <p className="text-sm sm:text-base text-teal-50/95 leading-relaxed pt-1">
            {activeRole.summary}
          </p>
        </section>

        {/* Access Matrix */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-800" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              What You Have Access To
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {activeRole.access.map((item) => {
              const badge = ACCESS_BADGE[item.level]
              const Icon = badge.icon
              return (
                <div
                  key={item.module}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm sm:text-base font-bold text-slate-900">
                      {item.module}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.note}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold self-start sm:self-center shrink-0 ${badge.cls}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{badge.label}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Step-by-Step Workflows */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-800" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              How To Do Your Core Tasks (Step-by-Step)
            </h3>
          </div>

          <div className="space-y-3.5">
            {activeRole.workflows.map((wf) => (
              <div
                key={wf.title}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">{wf.title}</h4>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg self-start">
                    <ChevronRight className="h-3.5 w-3.5" />
                    {wf.where}
                  </span>
                </div>
                <ol className="space-y-2 pl-5 list-decimal text-sm text-slate-700 leading-relaxed">
                  {wf.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* First-Time Setup & Tips */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Role Tips & First-Time Setup
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5 leading-relaxed">
            {activeRole.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
            <li>
              <strong>First Login:</strong> Sign in at{' '}
              <Link href="/login" className="text-teal-800 font-bold underline">
                /login
              </Link>{' '}
              with the temporary password given by your Group Leader and set your own password immediately.
            </li>
          </ul>
        </section>

        {/* Mobile App Install Card */}
        <section className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-sm text-slate-700 leading-relaxed">
            <div className="font-black text-slate-900 text-base">Install as a Mobile App</div>
            <p>
              <strong>iPhone (Safari):</strong> Tap Share → <em>Add to Home Screen</em>.{' '}
              <strong>Android (Chrome):</strong> Tap ⋮ Menu → <em>Install app</em>. Then allow notifications when prompted.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
