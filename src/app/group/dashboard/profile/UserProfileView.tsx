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
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  School,
  Smile,
  AlertCircle,
  ExternalLink,
  Edit,
  Share2,
  Copy,
  Check,
  QrCode,
  MessageCircle,
  X,
  Link as LinkIcon,
  Plus,
  Loader2,
} from 'lucide-react'
import EditBasicInfoModal, { BasicProfileData } from './EditBasicInfoModal'

export interface ProfileRecord {
  id: string
  full_name: string
  email: string
  phone_number?: string | null
  whatsapp_number?: string | null
  rank?: string | null
  member_id?: string | null
}

export interface MemberRecord {
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
  address?: string | null
  father_name?: string | null
  father_name_en?: string | null
  father_name_ar?: string | null
  mother_name?: string | null
  mother_name_en?: string | null
  mother_name_ar?: string | null
  first_name_en?: string | null
  last_name_en?: string | null
  first_name_ar?: string | null
  last_name_ar?: string | null
  is_active: boolean
  troops?: {
    id: string
    name: string
  } | null
  patrols?: {
    id: string
    name: string
  } | null
}

export interface LeaderRoleItem {
  roleName: string
  troopName?: string | null
  permissionScope?: string | null
}

interface Props {
  profile: ProfileRecord
  member: MemberRecord | null
  leaderRoles: LeaderRoleItem[]
  suggestedMembers: Array<{
    id: string
    first_name: string
    last_name: string
    current_rank?: string | null
    troops?: { name?: string } | null
  }>
  currentRole: string
}

export default function UserProfileView({
  profile: initialProfile,
  member: initialMember,
  leaderRoles,
  suggestedMembers: initialSuggestions,
  currentRole,
}: Props) {
  const [profile, setProfile] = useState<ProfileRecord>(initialProfile)
  const [member, setMember] = useState<MemberRecord | null>(initialMember)
  const [suggestedMembers, setSuggestedMembers] = useState(initialSuggestions)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [linking, setLinking] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isMemberRole = currentRole === 'scout_member'

  const [showShareModal, setShowShareModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const passportTargetId = member?.id || profile.member_id || profile.id
  const passportUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/scout/${passportTargetId}`
      : `https://portal.sdcsaintjeanmarc.org/scout/${passportTargetId}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(passportUrl)
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
          title: `${profile.full_name} • Scout Passport`,
          text: `Check out ${profile.full_name}'s official Scout Passport & Achievements at Scouts des Cèdres!`,
          url: passportUrl,
        })
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink()
    }
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `⚜️ *${profile.full_name}* - Scout Passport\n` +
      (member?.troops?.name ? `🌲 *Unit:* ${member.troops.name}\n` : '') +
      `⭐ *Rank:* ${member?.current_rank || profile.rank || 'Scout'}\n` +
      `\nView Official Scout Record & Passport:\n${passportUrl}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=15&format=svg&data=${encodeURIComponent(
    passportUrl
  )}`

  const handleEditSuccess = (updated: BasicProfileData) => {
    setProfile((prev) => ({
      ...prev,
      phone_number: updated.phone_number || prev.phone_number,
      whatsapp_number: updated.whatsapp_number || prev.whatsapp_number,
    }))

    if (member) {
      setMember((prev) => {
        if (!prev) return null
        return {
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
        }
      })
    }

    setStatusMsg({ type: 'success', text: 'Personal details updated successfully.' })
    setTimeout(() => setStatusMsg(null), 4000)
  }

  const handleLinkMember = async (memberId: string) => {
    setLinking(true)
    setStatusMsg(null)

    try {
      const res = await fetch('/api/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', memberId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to link member record.')

      // Refresh page to load linked data
      window.location.reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error linking member.'
      setStatusMsg({ type: 'error', text: msg })
      setLinking(false)
    }
  }

  const handleCreateMember = async () => {
    setLinking(true)
    setStatusMsg(null)

    try {
      const res = await fetch('/api/me/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create member record.')

      window.location.reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating member.'
      setStatusMsg({ type: 'error', text: msg })
      setLinking(false)
    }
  }

  const displayPhone = profile.phone_number || member?.member_phone
  const displayWhatsApp = profile.whatsapp_number || displayPhone
  const displayAddress = member?.address
  const displayEmergency = member ? {
    name: member.emergency_contact_name,
    relation: member.emergency_contact_relation,
    phone: member.emergency_contact_phone,
  } : null

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold text-center ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* ── TOP HERO CARD ── */}
      <div className="bg-gradient-to-br from-teal-900 via-teal-950 to-slate-950 text-white rounded-3xl p-5 sm:p-7 shadow-sm border border-teal-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {member?.photo_url ? (
              <img
                src={member.photo_url}
                alt={profile.full_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-teal-300/40 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-800/80 border border-teal-400/30 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-md">
                ⚜️
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-400/30">
                  {currentRole.replace(/_/g, ' ')}
                </span>
                {member?.current_rank && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    {member.current_rank}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{profile.full_name}</h1>
              <p className="text-xs text-teal-200/80 font-medium">{profile.email}</p>
            </div>
          </div>

          {/* Action buttons: Public Passport + Share + Edit Basic Info */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/scout/${passportTargetId}`}
              target="_blank"
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 active:scale-95 text-teal-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-teal-400/30 transition-all shadow-xs"
              title="Open Public Passport"
            >
              <span>Public Passport</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>

            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Share Passport"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-200 border border-white/20 transition-all shadow-xs cursor-pointer"
              title="View QR Code"
            >
              <QrCode className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/20 transition-all shadow-xs cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit Basic Info</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── UNLINKED LEADER BANNER ── */}
      {!member && !isMemberRole && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Scout Member Record Not Linked</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Every leader holds a permanent scout identity. Linking your member record enables tracking of your scout promise, progression, blood type, emergency contacts, and camps.
              </p>
            </div>
          </div>

          {/* Suggestions if found */}
          {suggestedMembers && suggestedMembers.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-amber-200/80 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                Found matching scout member profile:
              </span>
              <div className="space-y-2">
                {suggestedMembers.map((sm) => (
                  <div
                    key={sm.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900">
                        {sm.first_name} {sm.last_name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Troop: {sm.troops?.name || 'Unit'} • Rank: {sm.current_rank || 'Scout'}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={linking}
                      onClick={() => handleLinkMember(sm.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3 w-3" />}
                      <span>Link to My Account</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={linking}
              onClick={handleCreateMember}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            >
              {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Create Member Record in Leadership Troop</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MEMBER PROFILE SUMMARY CARD (When Linked) ── */}
      {member && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                ⚜️
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Scout Member Record</h3>
                <span className="text-[10px] font-bold text-slate-400">
                  Unit: {member.troops?.name || 'Leadership'} {member.patrols ? `• Patrol: ${member.patrols.name}` : ''}
                </span>
              </div>
            </div>

            {member.promise_date ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                <Award className="h-3 w-3 text-amber-600" />
                <span>Promise: {member.promise_date}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                Aspirant / Scout
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Blood Type
              </span>
              <span className="text-base font-black text-rose-600 block mt-0.5">
                {member.blood_type || 'Unknown'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Birth Date
              </span>
              <span className="text-sm font-black text-slate-800 block mt-0.5">
                {member.birth_date || 'Not recorded'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Unit Duty / Role
              </span>
              <span className="text-sm font-black text-teal-900 block mt-0.5">
                {member.patrol_role ? member.patrol_role.replace(/_/g, ' ') : 'None'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Membership Status
              </span>
              <span className="text-sm font-black text-emerald-700 block mt-0.5">
                {member.is_active ? 'Active Member ✓' : 'Inactive'}
              </span>
            </div>
          </div>

          {member.medical_info && (
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/70 text-xs text-rose-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-[11px] text-rose-700">
                <AlertCircle className="h-3.5 w-3.5" />
                Medical Information & Allergies:
              </span>
              <p className="leading-relaxed">{member.medical_info}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CONTACT & EMERGENCY GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Contact Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Phone className="h-4 w-4 text-teal-800" />
            <h3 className="font-black text-sm text-slate-900">Direct Contact</h3>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Mobile Phone:</span>
              {displayPhone ? (
                <a
                  href={`tel:${displayPhone}`}
                  className="font-bold text-teal-800 hover:underline flex items-center gap-1"
                >
                  <span>{displayPhone}</span>
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">WhatsApp:</span>
              {displayWhatsApp ? (
                <a
                  href={`https://wa.me/${displayWhatsApp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>{displayWhatsApp}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>

            <div className="flex items-start justify-between">
              <span className="text-slate-500 font-medium">Address:</span>
              <span className="font-bold text-slate-800 text-right max-w-[200px]">
                {displayAddress || 'Not set'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">School / Job:</span>
              <span className="font-bold text-slate-800">{member?.school || 'Not set'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Hobbies:</span>
              <span className="font-bold text-slate-800">{member?.hobbies || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Emergency Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Heart className="h-4 w-4 text-rose-600" />
            <h3 className="font-black text-sm text-slate-900">Emergency Contact</h3>
          </div>

          {displayEmergency ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Contact Person:</span>
                <span className="font-bold text-slate-900">{displayEmergency.name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Relationship:</span>
                <span className="font-bold text-slate-700">{displayEmergency.relation}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Emergency Number:</span>
                <a
                  href={`tel:${displayEmergency.phone}`}
                  className="font-black text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Phone className="h-3 w-3" />
                  <span>{displayEmergency.phone}</span>
                </a>
              </div>

              <div className="pt-2">
                <a
                  href={`tel:${displayEmergency.phone}`}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Emergency Contact</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 italic">
              No emergency contact registered yet. Click &ldquo;Edit Basic Info&rdquo; to add one.
            </div>
          )}
        </div>
      </div>

      {/* ── LEADER RESPONSIBILITIES & ROLES (If Leader) ── */}
      {leaderRoles && leaderRoles.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Shield className="h-4 w-4 text-teal-800" />
            <h3 className="font-black text-sm text-slate-900">Assigned Leadership Roles</h3>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {leaderRoles.map((r, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-teal-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <span>{r.roleName.replace(/_/g, ' ')}</span>
                {r.troopName && (
                  <span className="text-[10px] text-teal-200 font-medium">({r.troopName})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── EDIT BASIC INFO MODAL ── */}
      <EditBasicInfoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={{
          first_name: member?.first_name_en || member?.first_name || profile.full_name?.split(' ')[0] || '',
          first_name_ar: member?.first_name_ar || '',
          last_name: member?.last_name_en || member?.last_name || profile.full_name?.split(' ').slice(1).join(' ') || '',
          last_name_ar: member?.last_name_ar || '',
          father_name: member?.father_name_en || member?.father_name || '',
          father_name_ar: member?.father_name_ar || '',
          mother_name: member?.mother_name_en || member?.mother_name || '',
          mother_name_ar: member?.mother_name_ar || '',
          phone_number: displayPhone,
          whatsapp_number: displayWhatsApp,
          emergency_contact_name: displayEmergency?.name,
          emergency_contact_relation: displayEmergency?.relation,
          emergency_contact_phone: displayEmergency?.phone,
          blood_type: member?.blood_type,
          medical_info: member?.medical_info,
          address: displayAddress,
          school: member?.school,
          hobbies: member?.hobbies,
          photo_url: member?.photo_url,
        }}
        onSuccess={handleEditSuccess}
      />

      {/* ── SHARE PASSPORT MODAL ── */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  <span>⚜️</span>
                  <span>Scouts des Cèdres</span>
                </div>
                <h3 className="text-base font-black text-slate-900">Share Scout Passport</h3>
                <p className="text-xs text-slate-500">{profile.full_name}</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Share on WhatsApp</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="w-full py-3 px-4 rounded-2xl bg-teal-800 hover:bg-teal-900 active:scale-98 text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Share to Other Apps</span>
              </button>

              <button
                onClick={() => {
                  setShowShareModal(false)
                  setShowQrModal(true)
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-xs font-bold text-slate-800 border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-emerald-700" />
                <span>Show QR Code</span>
              </button>
            </div>

            {/* Link Copy Box */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Passport URL
              </label>
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-50 border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={passportUrl}
                  className="flex-1 bg-transparent px-2.5 text-xs text-slate-600 outline-none select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QR CODE MODAL ── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 text-center shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center text-left">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Scout Passport QR
                </h3>
                <p className="text-xs text-emerald-700 font-bold">{profile.full_name}</p>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt={`QR code for ${profile.full_name}`}
                className="w-56 h-56 object-contain"
              />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Scan with any phone camera to view and verify your official Scout Passport record.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
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
