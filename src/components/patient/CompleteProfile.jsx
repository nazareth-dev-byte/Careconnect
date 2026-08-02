import React, { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function CompleteProfile({ userId, onDone }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: 'Female',
    phone: '', address: '', insurance_provider: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const newId = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('patients')
      .insert([{ id: newId, ...form, email: user.email }])

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    const { error: linkError } = await supabase
      .from('profiles')
      .update({ patient_id: newId })
      .eq('id', userId)

    setSaving(false)
    if (linkError) setError(linkError.message)
    else onDone()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--paper)', padding: 20 }}>
      <form className="form-card" style={{ width: '100%', maxWidth: 480 }} onSubmit={submit}>
        <div className="section-title" style={{ marginTop: 0 }}>Complete your patient profile</div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -8, marginBottom: 16 }}>
          One-time step so your clinician has the basics on file.
        </p>
        {error && <div className="hint error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="row">
          <div className="field"><label>First name <span className="req">*</span></label><input required value={form.first_name} onChange={set('first_name')} /></div>
          <div className="field"><label>Last name <span className="req">*</span></label><input required value={form.last_name} onChange={set('last_name')} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Date of birth <span className="req">*</span></label><input type="date" required value={form.date_of_birth} onChange={set('date_of_birth')} /></div>
          <div className="field">
            <label>Sex</label>
            <select value={form.gender} onChange={set('gender')}>
              <option>Female</option><option>Male</option><option>Other</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field"><label>Mobile number <span className="req">*</span></label><input required value={form.phone} onChange={set('phone')} /></div>
          <div className="field"><label>Insurance provider <span className="opt">(optional)</span></label><input value={form.insurance_provider} onChange={set('insurance_provider')} /></div>
        </div>
        <div className="row">
          <div className="field full"><label>Address <span className="opt">(optional)</span></label><input value={form.address} onChange={set('address')} /></div>
        </div>
        <div className="actions">
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </form>
    </div>
  )
}
