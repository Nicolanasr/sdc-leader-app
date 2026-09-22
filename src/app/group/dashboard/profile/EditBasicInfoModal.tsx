'use client'

import { useState } from 'react'
import { X, Save, Loader2, Phone, Heart, AlertCircle, MapPin, School, User } from 'lucide-react'

export interface BasicProfileData {
  first_name?: string | null
  last_name?: string | null
  first_name_ar?: string | null
  last_name_ar?: string | null
  father_name?: string | null
  father_name_ar?: string | null
  mother_name?: string | null
  mother_name_ar?: string | null
  phone_number?: string | null
  whatsapp_number?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relation?: string | null
  emergency_contact_phone?: string | null
  blood_type?: string | null
  medical_info?: string | null
  address?: string | null
  school?: string | null
  hobbies?: string | null
  photo_url?: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  initialData: BasicProfileData
  onSuccess: (updated: BasicProfileData) => void
}

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export default function EditBasicInfoModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: Props) {
  const [firstName, setFirstName] = useState(initialData.first_name || '')
  const [lastName, setLastName] = useState(initialData.last_name || '')
  const [firstNameAr, setFirstNameAr] = useState(initialData.first_name_ar || '')
  const [lastNameAr, setLastNameAr] = useState(initialData.last_name_ar || '')
  const [fatherName, setFatherName] = useState(initialData.father_name || '')
  const [fatherNameAr, setFatherNameAr] = useState(initialData.father_name_ar || '')
  const [motherName, setMotherName] = useState(initialData.mother_name || '')
  const [motherNameAr, setMotherNameAr] = useState(initialData.mother_name_ar || '')

  const [phoneNumber, setPhoneNumber] = useState(initialData.phone_number || '')
  const [whatsappNumber, setWhatsappNumber] = useState(initialData.whatsapp_number || '')
  const [emergencyName, setEmergencyName] = useState(initialData.emergency_contact_name || '')
  const [emergencyRelation, setEmergencyRelation] = useState(initialData.emergency_contact_relation || '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergency_contact_phone || '')
  const [bloodType, setBloodType] = useState(initialData.blood_type || 'O+')
  const [medicalInfo, setMedicalInfo] = useState(initialData.medical_info || '')
  const [address, setAddress] = useState(initialData.address || '')
  const [school, setSchool] = useState(initialData.school || '')
  const [hobbies, setHobbies] = useState(initialData.hobbies || '')
  const [photoUrl, setPhotoUrl] = useState(initialData.photo_url || '')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)

    try {
      const payload: BasicProfileData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        first_name_ar: firstNameAr.trim() || null,
        last_name_ar: lastNameAr.trim() || null,
        father_name: fatherName.trim() || null,
        father_name_ar: fatherNameAr.trim() || null,
        mother_name: motherName.trim() || null,
        mother_name_ar: motherNameAr.trim() || null,
        phone_number: phoneNumber.trim() || null,
        whatsapp_number: whatsappNumber.trim() || null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_relation: emergencyRelation.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        blood_type: bloodType.trim() || null,
        medical_info: medicalInfo.trim() || null,
        address: address.trim() || null,
        school: school.trim() || null,
        hobbies: hobbies.trim() || null,
        photo_url: photoUrl.trim() || null,
      }

      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update basic information.')
      }

      onSuccess(payload)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred.'
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center font-black text-xs shadow-2xs">
              ✎
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Edit Personal Information</h2>
              <p className="text-[11px] text-slate-500">Update your bilingual name, contacts, and personal details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 0: Bilingual Names & Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold uppercase tracking-wider text-[10px]">
              <User className="h-3 w-3" />
              <span>Bilingual Name & Civil Identity (الاسم بالعربي والإنكليزي)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">First Name (English)</label>
                <input
                  type="text"
                  placeholder="e.g. Peter"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم الأول (بالعربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: بيتر"
                  value={firstNameAr}
                  onChange={(e) => setFirstNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Last Name / Family (English)</label>
                <input
                  type="text"
                  placeholder="e.g. Haddad"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الشهرة / العائلة (بالعربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: حداد"
                  value={lastNameAr}
                  onChange={(e) => setLastNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Father Name (English)</label>
                <input
                  type="text"
                  placeholder="e.g. Georges Haddad"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الأب الكامل (بالعربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: جورج حداد"
                  value={fatherNameAr}
                  onChange={(e) => setFatherNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mother Name (English)</label>
                <input
                  type="text"
                  placeholder="e.g. Claudette Nader"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الأم الكامل (بالعربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="مثال: كلوديت نادر"
                  value={motherNameAr}
                  onChange={(e) => setMotherNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 1: Contact Details */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold uppercase tracking-wider text-[10px]">
              <Phone className="h-3 w-3" />
              <span>Contact Numbers & Location</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="+961 70 123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="+961 70 123456"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Home Address / Town</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Byblos, Main Street, Bldg 4"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold uppercase tracking-wider text-[10px]">
              <Heart className="h-3 w-3" />
              <span>Emergency Contact Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Parent Name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  placeholder="e.g. Mother / Father / Spouse"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  placeholder="+961 03 123456"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold uppercase tracking-wider text-[10px]">
              <Heart className="h-3 w-3" />
              <span>Medical & Health</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Blood Type</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Medical Notes & Allergies
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Peanut allergy, Asthma, takes daily antihistamine..."
                  value={medicalInfo}
                  onChange={(e) => setMedicalInfo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white resize-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold uppercase tracking-wider text-[10px]">
              <School className="h-3 w-3" />
              <span>School / Workplace & Hobbies</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">School / University / Job</label>
                <input
                  type="text"
                  placeholder="e.g. USJ / Engineer"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hobbies & Interests</label>
                <input
                  type="text"
                  placeholder="e.g. Camping, Guitar, Hiking"
                  value={hobbies}
                  onChange={(e) => setHobbies(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Profile Photo URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/my-photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 outline-none text-xs bg-white"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-teal-900 hover:bg-teal-950 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
