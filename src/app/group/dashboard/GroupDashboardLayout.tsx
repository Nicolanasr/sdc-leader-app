'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar, ClipboardList, Users, CheckSquare, Award, Wrench,
  UtensilsCrossed, Radio, MapPin, Clock, ArrowRight, Sparkles,
  ShieldCheck, ArrowUpRight, Plus, FolderKanban, BookOpen,
  DollarSign, Activity, Compass, ChevronRight, Tent, Wallet, Layers
} from 'lucide-react'
import DashboardShell from './DashboardShell'
import { formatDateDisplay } from '@/utils/dateTimeUtils'

export interface UpcomingEvent {
  id: string
  title: string
  event_type: string
  start_time: string
  end_time?: string
  location_name?: string
  troops?: { name: string } | null
}

interface Stats {
  scoutCount: number
  troopCount: number
  leaderCount: number
  upcomingEventsCount: number
  equipmentCount: number
  pantryCount: number
}

interface Props {
  groupName: string
  commissariatName: string
  role: string
  groupId: string
  stats: Stats
  userName?: string
  assignedTroopName?: string | null
  upcomingEvents?: UpcomingEvent[]
}

const ROLE_LABELS: Record<string, { label: string; ar: string }> = {
  chef_groupe: { label: 'Chef de Groupe (قائد الفوج)', ar: 'قائد الفوج' },
  assistant_chef_groupe: { label: 'Assistant Chef de Groupe (مساعد قائد الفوج)', ar: 'مساعد قائد الفوج' },
  amin_serr_group: { label: 'Secrétaire Général (أمين السر)', ar: 'أمين السر' },
  amin_sandou2_group: { label: 'Trésorier Général (أمين الصندوق)', ar: 'أمين الصندوق' },
  amin_tejhizet_group: { label: 'Quartier-Maître / Intendant (أمين التجهيزات)', ar: 'أمين التجهيزات' },
  mas2oul_mounet: { label: 'Responsable Mounet & Provisions (مسؤول المؤونة)', ar: 'مسؤول المؤونة' },
  amin_mounet_group: { label: 'Responsable Mounet & Provisions (مسؤول المؤونة)', ar: 'مسؤول المؤونة' },
  mas2oul_toswir: { label: 'Responsable Média & Communication (مسؤول الإعلام)', ar: 'مسؤول الإعلام' },
  ka2ed_idare: { label: 'Chef Administratif (القائد الإداري)', ar: 'القائد الإداري' },
  ka2ed_fer2a: { label: 'Chef d’Unité (قائد الوحدة)', ar: 'قائد الوحدة' },
  mouse3ed_ka2ed_fer2a: { label: 'Assistant Chef d’Unité (مساعد قائد الوحدة)', ar: 'مساعد قائد الوحدة' },
}

export default function GroupDashboardLayout({
  groupName,
  commissariatName,
  role,
  groupId,
  stats,
  userName = 'Leader',
  assignedTroopName,
  upcomingEvents = [],
}: Props) {
  const roleInfo = ROLE_LABELS[role] || { label: 'Scout Leader', ar: 'قائد' }

  // Role permissions per workspace
  const canAccessBroadcast = ['chef_groupe', 'assistant_chef_groupe', 'configurator'].includes(role)
  const canAccessLeaders = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(role)
  const canAccessTroops = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'configurator'].includes(role)
  const canAccessMembers = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'amin_sandou2_group', 'amin_tejhizet_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(role)
  const canAccessAttendance = ['chef_groupe', 'assistant_chef_groupe', 'amin_serr_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(role)
  const canAccessFinances = ['chef_groupe', 'assistant_chef_groupe', 'amin_sandou2_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(role)
  const canAccessInventory = ['chef_groupe', 'assistant_chef_groupe', 'amin_tejhizet_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'chef_troupe', 'configurator'].includes(role)
  const canAccessPantry = ['chef_groupe', 'assistant_chef_groupe', 'amin_mounet_group', 'mas2oul_mounet', 'amin_serr_group', 'amin_sandou2_group', 'ka2ed_fer2a', 'mouse3ed_ka2ed_fer2a', 'configurator'].includes(role)

  // Dynamic Workspace Modules tailored to the active role
  const modules = [
    {
      title: 'Events & Camps',
      arTitle: 'الأنشطة والمخيمات',
      desc: 'Plan gatherings, camps, outings, logistics & staff',
      href: '/group/dashboard/events',
      icon: Calendar,
      color: 'bg-teal-50 text-teal-800 border-teal-200 hover:border-teal-400',
      badge: `${stats.upcomingEventsCount} Scheduled`,
      badgeColor: 'bg-teal-100 text-teal-900',
      canAccess: true,
    },
    {
      title: 'Session Planner (Canevas)',
      arTitle: 'دفتر التحضير والتخطيط',
      desc: 'Prepare weekly meeting schedules, timing, games & prayer',
      href: '/group/dashboard/planner',
      icon: ClipboardList,
      color: 'bg-blue-50 text-blue-800 border-blue-200 hover:border-blue-400',
      badge: 'Weekly Canevas',
      badgeColor: 'bg-blue-100 text-blue-900',
      canAccess: true,
    },
    {
      title: 'Scout Members & Troops',
      arTitle: 'سجل الأعضاء والوحدات',
      desc: 'Roster, patrols, medical records & emergency cards',
      href: '/group/dashboard/members',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:border-indigo-400',
      badge: `${stats.scoutCount} Scouts`,
      badgeColor: 'bg-indigo-100 text-indigo-900',
      canAccess: canAccessMembers,
    },
    {
      title: 'Attendance & Call-Sheet',
      arTitle: 'سجل الحضور والغياب',
      desc: 'Fast check-in for weekly gatherings, outings & stats',
      href: '/group/dashboard/attendance',
      icon: CheckSquare,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400',
      badge: 'Live Call-Sheet',
      badgeColor: 'bg-emerald-100 text-emerald-900',
      canAccess: canAccessAttendance,
    },
    {
      title: 'Progression & Badges',
      arTitle: 'سجل التقدم والأوسمة',
      desc: 'Scout advancement, classes, badges & investitures',
      href: '/group/dashboard/progression',
      icon: Award,
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400',
      badge: 'Progression',
      badgeColor: 'bg-amber-100 text-amber-900',
      canAccess: true,
    },
    {
      title: 'Quartermaster & Gear',
      arTitle: 'المستودع والتجهيزات',
      desc: 'Tents, pioneering wood, tools, sound & loan tracking',
      href: '/group/dashboard/inventory',
      icon: Wrench,
      color: 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400',
      badge: `${stats.equipmentCount} Items`,
      badgeColor: 'bg-slate-200 text-slate-900',
      canAccess: canAccessInventory,
    },
    {
      title: 'Central Pantry & Mounet',
      arTitle: 'المؤونة المركزية والمطبخ',
      desc: 'Dry food inventory, FIFO lot tracking & camp transfers',
      href: '/group/dashboard/pantry',
      icon: UtensilsCrossed,
      color: 'bg-orange-50 text-orange-800 border-orange-200 hover:border-orange-400',
      badge: `${stats.pantryCount} Stocked`,
      badgeColor: 'bg-orange-100 text-orange-900',
      canAccess: canAccessPantry,
    },
    {
      title: 'Treasury & Dues',
      arTitle: 'الصندوق والاشتراكات',
      desc: 'Master treasury, membership dues, camp budget & expense ledger',
      href: '/group/dashboard/finances',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400',
      badge: 'Treasury Ledger',
      badgeColor: 'bg-emerald-100 text-emerald-900',
      canAccess: canAccessFinances,
    },
    {
      title: 'Leaders & Council',
      arTitle: 'مجلس القيادة والقادة',
      desc: 'Council directory, onboarding, ranks & passwords',
      href: '/group/dashboard/leaders',
      icon: ShieldCheck,
      color: 'bg-teal-50 text-teal-800 border-teal-200 hover:border-teal-400',
      badge: `${stats.leaderCount} Leaders`,
      badgeColor: 'bg-teal-100 text-teal-900',
      canAccess: canAccessLeaders,
    },
    {
      title: 'Units & Troops',
      arTitle: 'الوحدات والفرق',
      desc: 'Troop age branches, patrols, leader assignments',
      href: '/group/dashboard/troops',
      icon: Layers,
      color: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:border-cyan-400',
      badge: `${stats.troopCount} Units`,
      badgeColor: 'bg-cyan-100 text-cyan-900',
      canAccess: canAccessTroops,
    },
    {
      title: 'Broadcast & Comms',
      arTitle: 'التعاميم والتواصل',
      desc: 'Direct announcements, WhatsApp alerts & group bulletins',
      href: '/group/dashboard/broadcast',
      icon: Radio,
      color: 'bg-purple-50 text-purple-800 border-purple-200 hover:border-purple-400',
      badge: 'WhatsApp Sync',
      badgeColor: 'bg-purple-100 text-purple-900',
      canAccess: canAccessBroadcast,
    },
    {
      title: 'Library & Archives',
      arTitle: 'المكتبة والأرشيف',
      desc: 'Ceremony guides, games, prayer books, songbooks & manuals',
      href: '/group/dashboard/library',
      icon: BookOpen,
      color: 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-400',
      badge: 'Resource Archive',
      badgeColor: 'bg-rose-100 text-rose-900',
      canAccess: true,
    },
  ].filter((m) => m.canAccess)

  return (
    <DashboardShell groupName={groupName} currentRole={role} userName={userName}>
      <div className="w-full pb-20 space-y-3 sm:space-y-4">
        {/* ── 1. WELCOME & LEADER IDENTITY HERO CARD ── */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-teal-950/40 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-700/80 text-teal-100 border border-teal-600/40 uppercase tracking-wider">
                  ⚜️ {roleInfo.label}
                </span>
                {assignedTroopName && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                    🏕️ {assignedTroopName}
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                Bonjour Chef {userName}
              </h1>
              <p className="text-xs text-teal-200/90 font-medium">
                {groupName} • {commissariatName} • Scout Operational Command
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
              <Link
                href="/group/dashboard/planner"
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl text-xs backdrop-blur-xs border border-white/15 transition-all flex items-center gap-1 shadow-2xs active:scale-95"
              >
                <ClipboardList className="h-3.5 w-3.5 text-teal-300" />
                <span>New Canevas</span>
              </Link>
              <Link
                href="/group/dashboard/events"
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1 shadow-2xs active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Event</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── 2. LIVE GROUP PULSE (4 METRICS FOR ALL LEADERS) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
          <Link
            href="/group/dashboard/members"
            className="bg-white p-3 sm:p-3.5 border border-slate-200/90 hover:border-teal-600 rounded-2xl shadow-2xs transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-teal-700">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Active Scouts</span>
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-base sm:text-xl font-black text-slate-900 group-hover:text-teal-900">
              {stats.scoutCount}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Youth members</p>
          </Link>

          <Link
            href={canAccessTroops ? '/group/dashboard/troops' : '/group/dashboard/members'}
            className="bg-white p-3 sm:p-3.5 border border-slate-200/90 hover:border-teal-600 rounded-2xl shadow-2xs transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-teal-700">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Scout Units</span>
              <Tent className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-base sm:text-xl font-black text-slate-900 group-hover:text-teal-900">
              {stats.troopCount}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Active troops</p>
          </Link>

          <Link
            href="/group/dashboard/events"
            className="bg-white p-3 sm:p-3.5 border border-slate-200/90 hover:border-teal-600 rounded-2xl shadow-2xs transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-teal-700">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Upcoming Camps</span>
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-base sm:text-xl font-black text-slate-900 group-hover:text-teal-900">
              {stats.upcomingEventsCount}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Scheduled activities</p>
          </Link>

          <Link
            href={canAccessLeaders ? '/group/dashboard/leaders' : '/group/dashboard/events'}
            className="bg-white p-3 sm:p-3.5 border border-slate-200/90 hover:border-teal-600 rounded-2xl shadow-2xs transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 group-hover:text-teal-700">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Leaders Council</span>
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-base sm:text-xl font-black text-slate-900 group-hover:text-teal-900">
              {stats.leaderCount}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Council & unit chiefs</p>
          </Link>
        </div>

        {/* ── 3. UPCOMING ACTIVITIES & MEETINGS (REAL-TIME WIDGET) ── */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-teal-800" />
              <h2 className="text-xs sm:text-sm font-black text-slate-900">
                Next Upcoming Gatherings & Camps
              </h2>
            </div>
            <Link
              href="/group/dashboard/events"
              className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center gap-0.5"
            >
              <span>Full Calendar</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-1.5">
              <p className="text-xs font-bold text-slate-600">No upcoming events scheduled right now.</p>
              <Link
                href="/group/dashboard/events"
                className="inline-flex items-center gap-1 text-xs font-black text-teal-800 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create a new meeting or camp</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {upcomingEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/group/dashboard/events/${ev.id}`}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-teal-50/40 hover:border-teal-300 transition-all flex flex-col justify-between space-y-2 group shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-teal-100 text-teal-900 uppercase">
                        {ev.event_type || 'Activity'}
                      </span>
                      {ev.troops?.name && (
                        <span className="text-[9px] font-bold text-slate-500 truncate">
                          {ev.troops.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-black text-slate-900 group-hover:text-teal-900 line-clamp-1">
                      {ev.title}
                    </h3>
                  </div>

                  <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-teal-700 shrink-0" />
                      <span>{formatDateDisplay(ev.start_time)}</span>
                    </div>
                    {ev.location_name && (
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 text-rose-600 shrink-0" />
                        <span className="truncate">{ev.location_name}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. OPERATIONAL COMMAND WORKSPACES (DYNAMIC ACCESSIBLE MODULES) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Scout Operations & Command Centers
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">
              {modules.length} accessible {modules.length === 1 ? 'workspace' : 'workspaces'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className="bg-white p-3 sm:p-3.5 border border-slate-200/90 hover:border-teal-600 hover:shadow-xs rounded-2xl transition-all flex flex-col justify-between space-y-3 group shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${mod.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${mod.badgeColor}`}>
                        {mod.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-teal-900 leading-tight">
                        {mod.title}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 font-sans">
                        {mod.arTitle}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-teal-800 group-hover:text-teal-950">
                    <span>Open Workspace</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── 5. QUICK RESOURCE BAR (LIBRARY & COUNCIL) ── */}
        <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 text-[11px] font-medium text-center sm:text-left">
            <Compass className="h-4 w-4 text-teal-800 shrink-0" />
            <span>Need training materials, ceremony guides, or songs?</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/group/dashboard/library"
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-slate-300 text-xs shadow-2xs transition-all flex items-center gap-1"
            >
              <BookOpen className="h-3.5 w-3.5 text-teal-800" />
              <span>Scout Library</span>
            </Link>
            <Link
              href="/group/dashboard/leaders"
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-slate-300 text-xs shadow-2xs transition-all flex items-center gap-1"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-teal-800" />
              <span>Leaders Directory</span>
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
