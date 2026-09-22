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

          {/* Action button: Edit Basic Info */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/20 transition-all shadow-xs"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Basic Info</span>
          </button>
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
    </div>
  )
}
