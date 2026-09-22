'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Award,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Share2,
  Shield,
  Sparkles,
  Compass,
  MessageCircle,
  X,
  Flame,
} from 'lucide-react'

export interface PublicScoutData {
  id: string
  fullName: string
  fullNameAr?: string | null
  rank: string
  promiseDate?: string | null
  joinDate?: string | null
  photoUrl?: string | null
  groupName: string
  commissariatName?: string | null
  troopName?: string | null
  sectionName?: string | null
  patrolName?: string | null
  patrolRole?: string | null
  isLeader: boolean
  leaderRoles?: string[]
  completedBadgesCount: number
  recentBadges?: Array<{ title: string; category?: string; badgeIcon?: string }>
}

interface Props {
  scout: PublicScoutData
}

export default function PublicScoutCard({ scout }: Props) {
  const [copied, setCopied] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  const profileUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://portal.sdcsaintjeanmarc.org/scout/${scout.id}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${scout.fullName} • Scout Passport`,
          text: `Check out ${scout.fullName}'s Scout Passport & Achievements at Scouts des Cèdres!`,
          url: profileUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink()
    }
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `⚜️ *${scout.fullName}* - Scout Passport\n` +
      `🌲 *Group:* ${scout.groupName}\n` +
      (scout.troopName ? `🏕️ *Unit:* ${scout.troopName}\n` : '') +
      `⭐ *Rank:* ${scout.rank}\n` +
      `\nView Scout Passport & Achievements:\n${profileUrl}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=15&format=svg&data=${encodeURIComponent(
    profileUrl
  )}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-emerald-50/40 to-slate-100 text-slate-800 flex flex-col justify-between selection:bg-emerald-600 selection:text-white pb-[max(env(safe-area-inset-bottom),2rem)]">
      {/* Top Floating App Bar */}
      <header className="w-full max-w-lg mx-auto px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-lg shadow-sm">
            ⚜️
          </div>
          <div>
            <div className="text-xs font-black tracking-wider uppercase text-emerald-900 leading-none">
              Scouts des Cèdres
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Digital Scout Passport
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Show QR Code"
          >
            <QrCode className="h-4 w-4 text-emerald-700" />
            <span className="hidden sm:inline">QR Code</span>
          </button>
          <button
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* Main Passport Card Container */}
      <main className="w-full max-w-lg mx-auto px-3.5 py-3 flex-1 flex flex-col items-center justify-center">
        {/* The Digital Scout Card */}
        <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/80 overflow-hidden relative transition-all">
          {/* Top Lebanese Scout Banner */}
          <div className="relative bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-900 text-white p-5 pb-14 overflow-hidden">
            {/* Background Cedar Silhouette */}
            <div className="absolute right-2 -bottom-6 text-white/10 text-9xl font-serif select-none pointer-events-none transform -rotate-12">
              🌲
            </div>

            <div className="flex items-center justify-between relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 border border-white/15 text-[10px] font-bold text-emerald-200 uppercase tracking-widest backdrop-blur-xs">
                <Shield className="h-3 w-3 text-emerald-300" />
                Official Scout Record
              </span>
              <span className="text-[11px] font-bold text-emerald-100/90">
                Saint Jean Marc
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between relative z-10 text-xs font-medium text-emerald-100/80">
              <span className="text-[11px]">{scout.groupName}</span>
              <span className="text-right text-xs text-emerald-200 font-bold font-arabic">
                كشاف الأرز
              </span>
            </div>
          </div>

          {/* Profile Identity Section */}
          <div className="px-5 pt-0 pb-5 relative">
            {/* Avatar Row */}
            <div className="flex items-end justify-between -mt-11 mb-3">
              <div className="relative">
                <div className="h-22 w-22 sm:h-24 sm:w-24 rounded-2xl bg-emerald-900 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-3xl font-black text-white">
                  {scout.photoUrl ? (
                    <img
                      src={scout.photoUrl}
                      alt={scout.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{scout.fullName.charAt(0)}</span>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-white text-[11px] shadow-sm"
                  title="Active Member"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>

              {/* Status Tag on right */}
              <div className="mb-1 text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Verified Scout
                </span>
              </div>
            </div>

            {/* Names & Main Title */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {scout.fullName}
                </h1>
                {scout.fullNameAr && (
                  <span className="text-base font-bold text-emerald-800 font-arabic">
                    {scout.fullNameAr}
                  </span>
                )}
              </div>

              {/* Ranks & Troop Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold">
                  <Award className="h-3.5 w-3.5 text-emerald-700" />
                  {scout.rank}
                </span>

                {scout.troopName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
                    <Compass className="h-3.5 w-3.5 text-slate-600" />
                    {scout.troopName}
                  </span>
                )}
              </div>
            </div>

            {/* Leadership Responsibilities */}
            {scout.leaderRoles && scout.leaderRoles.length > 0 && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                  Leadership Responsibilities
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scout.leaderRoles.map((role, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scouting Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
              {/* Unit / Patrol */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Unit & Section
                </span>
                <div className="mt-1">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {scout.sectionName || scout.troopName || 'General Section'}
                  </span>
                  {scout.patrolName && (
                    <span className="text-[11px] text-emerald-700 font-semibold block truncate">
                      Patrol: {scout.patrolName}
                    </span>
                  )}
                </div>
              </div>

              {/* Promise Status */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Scout Promise
                </span>
                <div className="mt-1">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <span>⚜️</span>
                    {scout.promiseDate ? 'Invested' : 'Active Scout'}
                  </span>
                  {scout.promiseDate && (
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Since {new Date(scout.promiseDate).getFullYear()}
                    </span>
                  )}
                </div>
              </div>

              {/* Badges Earned */}
              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Progression
                </span>
                <div className="mt-1">
                  <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-600" />
                    {scout.completedBadgesCount} Milestone{scout.completedBadgesCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block">
                    Validated Skills
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Showcase */}
            {scout.recentBadges && scout.recentBadges.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Honors & Badges Earned</span>
                  <span className="text-emerald-700 font-bold">
                    {scout.recentBadges.length} Listed
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scout.recentBadges.map((badge, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center text-sm shrink-0">
                        {badge.badgeIcon || '🏅'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {badge.title}
                        </div>
                        {badge.category && (
                          <div className="text-[10px] text-slate-500 font-medium truncate">
                            {badge.category}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scout Motto Banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 text-xs font-bold">
                <span className="text-base">🌲</span>
                <div>
                  <div className="tracking-wide">Toujours Prêt</div>
                  <div className="text-[10px] text-emerald-200 font-normal">
                    Scout Motto of Readiness
                  </div>
                </div>
              </div>
              <div className="text-right text-xs font-bold text-emerald-200 font-arabic">
                مستعد دائماً
              </div>
            </div>

            {/* Action Buttons Strip */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Share WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                title="Copy Link"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-600" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 border border-slate-200 text-slate-700 transition-all cursor-pointer"
                title="View QR Code"
              >
                <QrCode className="h-4 w-4 text-emerald-800" />
              </button>
            </div>
          </div>
        </div>

        {/* Public Footer */}
        <div className="mt-4 text-center">
          <div className="text-[11px] text-slate-500 font-medium">
            ⚜️ Scouts des Cèdres • Groupe Saint Jean Marc
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 text-center shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="text-left">
                <h3 className="text-base font-extrabold text-slate-900">
                  Digital Scout QR
                </h3>
                <p className="text-xs text-emerald-700 font-bold">{scout.fullName}</p>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code Graphic */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt={`QR code for ${scout.fullName}`}
                className="w-56 h-56 object-contain"
              />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Scan with any mobile camera to verify and inspect this official scout profile.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Link'}
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
