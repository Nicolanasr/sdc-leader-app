'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  User,
  Shield,
  Phone,
  Calendar,
  Heart,
  Award,
  Users,
  Tent,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  School,
  Smile,
  AlertCircle,
  ExternalLink,
  ClipboardList,
  Wallet,
  Package,
  ArrowRight,
  Edit,
} from 'lucide-react'
import EditBasicInfoModal from './profile/EditBasicInfoModal'

export interface MemberData {
  id: string
  first_name: string
  last_name: string
  birth_date?: string | null
  blood_type?: string | null
  medical_info?: string | null
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact_phone: string
  photo_url?: string | null
  promise_date?: string | null
  current_rank?: string | null
  patrol_role?: string | null
  member_phone?: string | null
  school?: string | null
  hobbies?: string | null
  father_name?: string | null
  father_name_en?: string | null
  father_name_ar?: string | null
  father_blood_type?: string | null
  father_birth_date?: string | null
  father_phone?: string | null
  father_job?: string | null
  mother_name?: string | null
  mother_name_en?: string | null
  mother_name_ar?: string | null
  mother_blood_type?: string | null
  mother_phone?: string | null
  mother_job?: string | null
  first_name_en?: string | null
  last_name_en?: string | null
  first_name_ar?: string | null
  last_name_ar?: string | null
  address?: string | null
  registry_place?: string | null
  registry_number?: string | null
  join_date?: string | null
  is_active: boolean
  troops?: {
    id: string
    name: string
    section_types?: { name?: string } | null
  } | null
  patrols?: {
    id: string
    name: string
  } | null
}

export interface EventItem {
  id: string
  title: string
  description?: string | null
  eventType: string
  startTime: string
  endTime: string
  location?: string | null
  feeStatus?: string | null
  consentStatus?: string | null
  staffRole?: string | null
}

export interface LeaderContact {
  id: string
  fullName: string
  phone?: string | null
  whatsapp?: string | null
  roleName: string
  rank?: string | null
}

export interface AttendanceSummary {
  total: number
  present: number
  late: number
  absent: number
  excused: number
  rate: number
}

interface Props {
  member: MemberData
  events: EventItem[]
  leaders: LeaderContact[]
  attendance: AttendanceSummary
}

export default function MemberDashboardView({ member: initialMember, events, leaders, attendance }: Props) {
  const [member, setMember] = useState<MemberData>(initialMember)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'events' | 'leaders' | 'attendance'>('profile')

  const fullName = `${member.first_name} ${member.last_name}`
  const troopName = member.troops?.name || 'Unit'
  const sectionName = member.troops?.section_types?.name || 'Scout'
  const patrolName = member.patrols?.name || null

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null
    const birth = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(member.birth_date)

  const formatEnglishDate = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(dateStr))
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-10">
      {/* ── HERO BANNER CARD ── */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl relative overflow-hidden border border-teal-800/60">
        {/* Decorative background fleur-de-lis */}
        <div className="absolute right-4 -bottom-6 text-8xl sm:text-9xl text-white/5 pointer-events-none select-none font-serif">
          ⚜️
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar / Photo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg border-2 border-amber-300 shrink-0">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt={fullName}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span>
                  {member.first_name[0]}
                  {member.last_name[0]}
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  {sectionName}
                </span>
                {patrolName && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-800/80 text-teal-200 border border-teal-700">
                    {patrolName} Patrol
                  </span>
                )}
                {member.current_rank && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                    {member.current_rank}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {fullName}
              </h1>

              <p className="text-xs text-teal-200/90 font-medium mt-0.5">
                {troopName} • {member.patrol_role ? `Role: ${member.patrol_role}` : 'Active Scout Member'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Promise Badge */}
            {member.promise_date ? (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-200 shrink-0">
                <Award className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold block text-white text-[11px]">Scout Promise</span>
                  <span className="text-[10px] text-amber-200/80">
                    {formatEnglishDate(member.promise_date)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-2 text-xs text-slate-300 shrink-0">
                <Sparkles className="h-4 w-4 text-teal-400" />
                <span className="text-[11px] font-medium">Aspirant / In Preparation</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all shadow-xs shrink-0"
              title="Edit Personal Information"
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Info</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── UNIT LEADERSHIP DUTY BANNER (Dynamic based on patrol_role) ── */}
      {member.patrol_role === 'amin_serr' && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-blue-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-400/20 text-blue-200 border border-blue-400/30">
                  Unit Officer Duty
                </span>
                <h3 className="text-sm font-black text-white">Unit Secretary (Amin Serr)</h3>
              </div>
              <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
                You are assigned as the secretary for your unit. You have permissions to record weekly attendance and inspect your troop youth roster.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              href="/group/dashboard/attendance"
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Unit Attendance</span>
            </Link>
            <Link
              href="/group/dashboard/members"
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-white/20 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Youth Roster</span>
            </Link>
          </div>
        </div>
      )}

      {member.patrol_role === 'sandou2' && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-emerald-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Unit Officer Duty
                </span>
                <h3 className="text-sm font-black text-white">Unit Treasurer (Sandou2)</h3>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
                You are assigned as the treasurer for your unit. You have permissions to track monthly subscription dues and financial collections for your troop members.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              href="/group/dashboard/finances"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>Troop Dues & Treasury</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {member.patrol_role === 'tejhizet' && (
        <div className="bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  Unit Officer Duty
                </span>
                <h3 className="text-sm font-black text-white">Unit Quartermaster (Tejhizet)</h3>
              </div>
              <p className="text-xs text-amber-100/80 mt-1 max-w-xl">
                You are assigned as the quartermaster for your unit. You can view the equipment catalog, check item availability, and prepare gear requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              href="/group/dashboard/inventory"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Unit Equipment & Gear</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── TABS NAVIGATION (Native App Feel) ── */}
      <div className="flex border-b border-slate-200 gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'profile'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>My Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'events'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Tent className="h-3.5 w-3.5" />
          <span>My Events & Camps</span>
          {events.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'events' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {events.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'leaders'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Troop Leaders</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'attendance'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Attendance</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'attendance' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {attendance.rate}%
          </span>
        </button>
      </div>

      {/* ── TAB 1: MY PROFILE ── */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Age & Birthdate
              </span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">
                {age ? `${age} years old` : '—'}
              </span>
              <span className="text-[10px] text-slate-500">{formatEnglishDate(member.birth_date)}</span>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Blood Type
              </span>
              <span className="text-sm font-black text-rose-700 block mt-0.5">
                🩸 {member.blood_type || 'Unspecified'}
              </span>
              <span className="text-[10px] text-slate-500">Emergency record</span>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Member Since
              </span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">
                {member.join_date ? formatEnglishDate(member.join_date) : 'Active Member'}
              </span>
              <span className="text-[10px] text-slate-500">Scouts des Cèdres</span>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Civil Registry
              </span>
              <span className="text-sm font-black text-slate-900 block mt-0.5 truncate">
                {member.registry_place || 'Lebanon'}
              </span>
              <span className="text-[10px] text-slate-500">
                {member.registry_number ? `No. ${member.registry_number}` : 'Standard'}
              </span>
            </div>
          </div>

          {/* Cards: Emergency & Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Emergency Contact */}
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                <Heart className="h-4 w-4" />
                <span>Primary Emergency Contact</span>
              </div>

              <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-100/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {member.emergency_contact_name}
                    </span>
                    <span className="text-[11px] text-rose-800 font-medium">
                      Relationship: {member.emergency_contact_relation}
                    </span>
                  </div>

                  {member.emergency_contact_phone && (
                    <a
                      href={`tel:${member.emergency_contact_phone}`}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call Now</span>
                    </a>
                  )}
                </div>

                <p className="text-xs font-mono font-bold text-slate-700">
                  {member.emergency_contact_phone}
                </p>
              </div>

              {/* Parents Contacts */}
              <div className="space-y-2 pt-1 text-xs">
                {member.father_name && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Father: {member.father_name}</span>
                      {member.father_job && (
                        <span className="text-[10px] text-slate-500">{member.father_job}</span>
                      )}
                    </div>
                    {member.father_phone && (
                      <a
                        href={`tel:${member.father_phone}`}
                        className="text-teal-700 hover:underline font-mono text-[11px] font-bold"
                      >
                        {member.father_phone}
                      </a>
                    )}
                  </div>
                )}

                {member.mother_name && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800 block">Mother: {member.mother_name}</span>
                      {member.mother_job && (
                        <span className="text-[10px] text-slate-500">{member.mother_job}</span>
                      )}
                    </div>
                    {member.mother_phone && (
                      <a
                        href={`tel:${member.mother_phone}`}
                        className="text-teal-700 hover:underline font-mono text-[11px] font-bold"
                      >
                        {member.mother_phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Health & Personal Info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-teal-800 font-black text-sm">
                <Shield className="h-4 w-4" />
                <span>Health & Personal Record</span>
              </div>

              {/* Medical Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  Medical Notes & Allergies:
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {member.medical_info?.trim() || 'No known allergies or medical restrictions recorded.'}
                </p>
              </div>

              {/* School, Hobbies, Address */}
              <div className="space-y-2 text-xs">
                {member.school && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <School className="h-4 w-4 text-teal-700 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">
                        School / University
                      </span>
                      <span className="font-medium text-slate-800">{member.school}</span>
                    </div>
                  </div>
                )}

                {member.hobbies && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <Smile className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Hobbies</span>
                      <span className="font-medium text-slate-800">{member.hobbies}</span>
                    </div>
                  </div>
                )}

                {member.address && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Address</span>
                      <span className="font-medium text-slate-800">{member.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MY EVENTS & CAMPS ── */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-teal-900 text-white rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black tracking-tight">Registered Activities & Camps</h3>
              <p className="text-[11px] text-teal-200">
                You can only view events where you are an enrolled participant or designated staff member.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-800 text-amber-300 border border-teal-700">
              {events.length} Event{events.length > 1 ? 's' : ''}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
              <Tent className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">No Upcoming Activities</h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Once your Troop Leader registers you for an upcoming camp, outing, or session, all details will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-900 border border-teal-200">
                        {evt.eventType.replace(/_/g, ' ')}
                      </span>

                      {evt.staffRole && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                          🌟 Staff Role: {evt.staffRole}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-900">{evt.title}</h4>
                    {evt.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                      <span>{formatEnglishDate(evt.startTime)}</span>
                    </div>

                    {evt.location && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 text-[10px]">
                      {evt.feeStatus && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            evt.feeStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          Dues: {evt.feeStatus === 'paid' ? 'Paid ✓' : 'Pending'}
                        </span>
                      )}

                      {evt.consentStatus && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            evt.consentStatus === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Consent: {evt.consentStatus}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      {evt.staffRole ? (
                        <Link
                          href={`/group/dashboard/events/${evt.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-teal-900 hover:bg-teal-950 text-white text-xs font-bold flex items-center justify-between transition-colors shadow-2xs"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>Open Event Workspace</span>
                            <span className="text-[10px] font-medium text-teal-200">({evt.staffRole})</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/group/dashboard/events/${evt.id}`}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-between transition-colors border border-slate-200"
                        >
                          <span>View Event Details</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TROOP LEADERS ── */}
      {activeTab === 'leaders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-1">
            <h3 className="text-sm font-black text-slate-900">{troopName} Leadership</h3>
            <p className="text-xs text-slate-500">
              Direct contact details of your Unit Chiefs for questions, assistance, or urgent communications.
            </p>
          </div>

          {leaders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-xs text-slate-400">
              No leadership profiles currently registered for this unit.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {leaders.map((leader) => (
                <div
                  key={leader.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                      ⚜️
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{leader.fullName}</h4>
                      <span className="text-[10px] font-bold text-teal-800 block">
                        {leader.roleName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {leader.phone && (
                      <a
                        href={`tel:${leader.phone}`}
                        className="flex-1 text-center py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold flex items-center justify-center gap-1.5 border border-teal-200 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Call</span>
                      </a>
                    )}
                    {leader.whatsapp && (
                      <a
                        href={`https://wa.me/${leader.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Attendance Rate
              </span>
              <span className="text-2xl font-black text-teal-900 block mt-1">
                {attendance.rate}%
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sessions Present
              </span>
              <span className="text-2xl font-black text-emerald-700 block mt-1">
                {attendance.present}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Excused Absences
              </span>
              <span className="text-2xl font-black text-amber-600 block mt-1">
                {attendance.excused}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Sessions
              </span>
              <span className="text-2xl font-black text-slate-800 block mt-1">
                {attendance.total}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-teal-700 shrink-0" />
            <span>
              Attendance at weekly gatherings and camps is required for rank advancement and Scout Promise eligibility.
            </span>
          </div>
        </div>
      )}

      {/* ── EDIT BASIC INFO MODAL ── */}
      <EditBasicInfoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={{
          first_name: member.first_name_en || member.first_name,
          first_name_ar: member.first_name_ar,
          last_name: member.last_name_en || member.last_name,
          last_name_ar: member.last_name_ar,
          father_name: member.father_name_en || member.father_name,
          father_name_ar: member.father_name_ar,
          mother_name: member.mother_name_en || member.mother_name,
          mother_name_ar: member.mother_name_ar,
          phone_number: member.member_phone,
          emergency_contact_name: member.emergency_contact_name,
          emergency_contact_relation: member.emergency_contact_relation,
          emergency_contact_phone: member.emergency_contact_phone,
          blood_type: member.blood_type,
          medical_info: member.medical_info,
          address: member.address,
          school: member.school,
          hobbies: member.hobbies,
          photo_url: member.photo_url,
        }}
        onSuccess={(updated) => {
          setMember((prev) => ({
            ...prev,
            first_name: updated.first_name || prev.first_name,
            first_name_en: updated.first_name || prev.first_name_en,
            first_name_ar: updated.first_name_ar !== undefined ? updated.first_name_ar : prev.first_name_ar,
            last_name: updated.last_name || prev.last_name,
            last_name_en: updated.last_name || prev.last_name_en,
            last_name_ar: updated.last_name_ar !== undefined ? updated.last_name_ar : prev.last_name_ar,
            father_name: updated.father_name || prev.father_name,
            father_name_en: updated.father_name || prev.father_name_en,
            father_name_ar: updated.father_name_ar !== undefined ? updated.father_name_ar : prev.father_name_ar,
            mother_name: updated.mother_name || prev.mother_name,
            mother_name_en: updated.mother_name || prev.mother_name_en,
            mother_name_ar: updated.mother_name_ar !== undefined ? updated.mother_name_ar : prev.mother_name_ar,
            member_phone: updated.phone_number || prev.member_phone,
            emergency_contact_name: updated.emergency_contact_name || prev.emergency_contact_name,
            emergency_contact_relation: updated.emergency_contact_relation || prev.emergency_contact_relation,
            emergency_contact_phone: updated.emergency_contact_phone || prev.emergency_contact_phone,
            blood_type: updated.blood_type || prev.blood_type,
            medical_info: updated.medical_info || prev.medical_info,
            address: updated.address || prev.address,
            school: updated.school || prev.school,
            hobbies: updated.hobbies || prev.hobbies,
            photo_url: updated.photo_url || prev.photo_url,
          }))
        }}
      />
    </div>
  )
}
