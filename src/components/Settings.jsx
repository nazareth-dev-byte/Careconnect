import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const NOTIFICATION_TOGGLES_DEF = [
  { key: 'booking_confirmations', name: 'Booking confirmations', desc: 'Email + SMS sent when a patient books online' },
  { key: 'reminders_24h', name: '24-hour reminders', desc: 'Automated reminder sent the day before a visit' },
  { key: 'cancellation_alerts', name: 'Cancellation alerts', desc: 'Notify front desk when a patient cancels' },
  { key: 'lab_result_flags', name: 'Lab result flags', desc: 'Notify the assigned doctor of abnormal results' },
]

const ASSIGNABLE_ROLES = ['Patient', 'Doctor', 'Receptionist', 'Admin']
const IS_ADMIN_TIER = (role) => role === 'Admin' || role === 'Receptionist'

// role is the REAL role, passed down from App.jsx after reading the `profiles` table.
// It is never taken from auth user_metadata, which any signed-in user can edit themselves.
export default function Settings({ role }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [clinicName, setClinicName] = useState('')
  const [operatingHours, setOperatingHours] = useState('')
  const [clinicPhone, setClinicPhone] = useState('')
  const [toggles, setToggles] = useState({
    booking_confirmations: true,
    reminders_24h: true,
    cancellation_alerts: true,
    lab_result_flags: false,
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [profilesList, setProfilesList] = useState([])
  const [doctorsList, setDoctorsList] = useState([])
  const [patientsList, setPatientsList] = useState([])

  const [statusMsg, setStatusMsg] = useState('')
  const [statusType, setStatusType] = useState('success')
  const [isSaving, setIsSaving] = useState(false)

  const fileInputRef = useRef(null)
  const isAdminTier = IS_ADMIN_TIER(role)

  const fetchAuthUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setEmail(user.email || '')
      setFullName(user.user_metadata?.full_name || '')
      setPhone(user.user_metadata?.phone || '')
      setAvatarUrl(user.user_metadata?.avatar_url || '')
    }
  }

  const fetchClinicSettings = async () => {
    const { data } = await supabase.from('clinic_settings').select('*').eq('id', 1).maybeSingle()
    if (data) {
      setClinicName(data.clinic_name || '')
      setOperatingHours(data.operating_hours || '')
      setClinicPhone(data.contact_number || '')
      setToggles({
        booking_confirmations: !!data.booking_confirmations,
        reminders_24h: !!data.reminders_24h,
        cancellation_alerts: !!data.cancellation_alerts,
        lab_result_flags: !!data.lab_result_flags,
      })
    }
  }

  // Admin-tier only: real roster, sourced from profiles (the actual access-control table).
  const fetchRoster = async () => {
    if (!IS_ADMIN_TIER(role)) return
    const [{ data: profiles }, { data: docs }, { data: pats }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('doctors').select('id, first_name, last_name, specialization'),
      supabase.from('patients').select('id, first_name, last_name'),
    ])
    setProfilesList(profiles || [])
    setDoctorsList(docs || [])
    setPatientsList(pats || [])
  }

  useEffect(() => {
    fetchAuthUser()
    fetchClinicSettings()
    fetchRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsSaving(true)
    setStatusMsg('')

    const fileExt = file.name.split('.').pop()
    const filePath = `${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) {
      setStatusType('error'); setStatusMsg(uploadError.message); setIsSaving(false); return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    setAvatarUrl(publicUrl)

    const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
    setIsSaving(false)
    if (updateError) { setStatusType('error'); setStatusMsg(updateError.message) }
    else { setStatusType('success'); setStatusMsg('Profile photo updated successfully.') }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setStatusMsg('')
    // Note: role is deliberately NOT included here. It lives in `profiles`, editable only
    // by an Admin via the roster below — never by the account owner themselves.
    const { error } = await supabase.auth.updateUser({
      email,
      data: { full_name: fullName, phone },
    })
    setIsSaving(false)
    if (error) { setStatusType('error'); setStatusMsg(error.message) }
    else { setStatusType('success'); setStatusMsg('Profile details updated successfully.') }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) { setStatusType('error'); setStatusMsg('Please enter your current password.'); return }
    if (!newPassword || newPassword.length < 8) {
      setStatusType('error'); setStatusMsg('New password must be at least 8 characters.'); return
    }

    setIsSaving(true)
    setStatusMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (reauthError) {
      setIsSaving(false); setStatusType('error'); setStatusMsg('Current password is incorrect.'); return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsSaving(false)
    if (error) { setStatusType('error'); setStatusMsg(error.message) }
    else {
      setStatusType('success'); setStatusMsg('Password updated successfully.')
      setCurrentPassword(''); setNewPassword('')
    }
  }

  const handleSaveClinic = async () => {
    setIsSaving(true)
    setStatusMsg('')
    const { error } = await supabase.from('clinic_settings').upsert({
      id: 1, clinic_name: clinicName, operating_hours: operatingHours,
      contact_number: clinicPhone, ...toggles, updated_at: new Date().toISOString(),
    })
    setIsSaving(false)
    if (error) { setStatusType('error'); setStatusMsg(error.message) }
    else { setStatusType('success'); setStatusMsg('Clinic details saved.') }
  }

  const handleToggleChange = async (key) => {
    const nextState = { ...toggles, [key]: !toggles[key] }
    setToggles(nextState)
    await supabase.from('clinic_settings').upsert({
      id: 1, clinic_name: clinicName, operating_hours: operatingHours,
      contact_number: clinicPhone, ...nextState, updated_at: new Date().toISOString(),
    })
  }

  // The only place a role can change — Admin-tier writing to `profiles`, not the account owner.
  const handleSetRole = async (profileId, newRole) => {
    setIsSaving(true)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId)
    setIsSaving(false)
    if (error) { setStatusType('error'); setStatusMsg(error.message) }
    else { setStatusType('success'); setStatusMsg('Role updated successfully.'); fetchRoster() }
  }

  const handleLinkDoctor = async (profileId, doctorId) => {
    await supabase.from('profiles').update({ doctor_id: doctorId || null }).eq('id', profileId)
    fetchRoster()
  }

  const rosterLabel = (p) => {
    if (p.doctor_id) {
      const d = doctorsList.find((x) => x.id === p.doctor_id)
      return d ? `Dr. ${d.first_name} ${d.last_name}` : 'Doctor (unlinked record)'
    }
    if (p.patient_id) {
      const pt = patientsList.find((x) => x.id === p.patient_id)
      return pt ? `${pt.first_name} ${pt.last_name}` : 'Patient (unlinked record)'
    }
    return p.id
  }

  const initials = fullName.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'DP'

  return (
    <div className="main" style={{ maxWidth: '1000px' }}>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <div className="sub">Manage your profile, clinic details, and notification preferences.</div>
        </div>
      </div>

      {statusMsg && (
        <div style={{
          padding: '12px 16px', marginBottom: '20px', borderRadius: '8px', fontSize: '13.5px',
          backgroundColor: statusType === 'error' ? '#fdeeec' : '#eaf6ea',
          color: statusType === 'error' ? '#b5432f' : '#2e7d32',
          border: `1px solid ${statusType === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
        }}>
          {statusMsg}
        </div>
      )}

      <div>
        <div className="panel" id="Profile">
          <h2>Profile</h2>
          <div className="panel-sub">Your personal account details</div>
          <div className="avatar-row">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar-lg">{initials}</div>
            )}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
            <button type="button" className="btn secondary" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
              Change photo
            </button>
          </div>
          <div className="row">
            <div className="field">
              <label>Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>Role</label>
              {/* Read-only, by design: role is access control and lives in `profiles`,
                  set only by an Admin via Users & Roles below — never self-editable. */}
              <input type="text" value={role} disabled style={{ backgroundColor: '#f3f4f6', color: 'var(--muted)' }} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Email</label>
              <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="actions-end">
            <button type="button" className="btn secondary" onClick={fetchAuthUser}>Cancel</button>
            <button type="button" className="btn primary" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {isAdminTier && (
          <div className="panel" id="Clinic Information">
            <h2>Clinic Information</h2>
            <div className="panel-sub">Shown on patient-facing confirmations and reminders</div>
            <div className="row">
              <div className="field full">
                <label>Clinic name</label>
                <input type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Operating hours</label>
                <input type="text" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} />
              </div>
              <div className="field">
                <label>Contact number</label>
                <input type="text" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} />
              </div>
            </div>
            <div className="actions-end">
              <button type="button" className="btn primary" onClick={handleSaveClinic} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Information'}
              </button>
            </div>
          </div>
        )}

        {isAdminTier && (
          <div className="panel" id="Notifications">
            <h2>Notifications</h2>
            <div className="panel-sub">Choose which automated alerts are sent</div>
            {NOTIFICATION_TOGGLES_DEF.map((t) => (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{t.name}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{t.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange(t.key)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    backgroundColor: toggles[t.key] ? '#059669' : '#d1d5db',
                    position: 'relative', border: 'none', cursor: 'pointer',
                    transition: 'background-color 0.2s', flexShrink: 0, marginLeft: '16px',
                  }}
                >
                  <span style={{
                    display: 'block', width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: '#ffffff', position: 'absolute', top: '3px',
                    left: toggles[t.key] ? '23px' : '3px', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isAdminTier && (
          <div className="panel" id="Users & Roles">
            <h2>Users &amp; Roles <span className="panel-sub" style={{ margin: 0 }}>(Admin only)</span></h2>
            <div className="panel-sub">
              Sourced from <code>profiles</code> — the only table that actually controls access. Emails aren't
              shown here; this app has no service-role key to look them up from auth.users.
            </div>
            <table>
              <thead><tr><th>Linked record</th><th>Role</th><th>Doctor link</th></tr></thead>
              <tbody>
                {profilesList.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 12.5 }}>{p.email || rosterLabel(p)}</td>
                    <td>
                      <select value={p.role} onChange={(e) => handleSetRole(p.id, e.target.value)} disabled={isSaving}>
                        {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      {p.role === 'Doctor' ? (
                        <select value={p.doctor_id || ''} onChange={(e) => handleLinkDoctor(p.id, e.target.value)}>
                          <option value="">Link to doctor…</option>
                          {doctorsList.map((d) => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel" id="Security">
          <h2>Security</h2>
          <div className="panel-sub">Change your password</div>
          <div className="row">
            <div className="field">
              <label>Current password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" placeholder="Minimum 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <div className="actions-end">
            <button type="button" className="btn primary" onClick={handleUpdatePassword} disabled={isSaving}>
              {isSaving ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      <div className="footer-note">CareConnect Clinic Appointment System — Settings</div>
    </div>
  )
}
