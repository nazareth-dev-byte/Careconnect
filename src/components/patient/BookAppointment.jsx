import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function BookAppointment({ patientId }) {
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('doctors').select('*').order('last_name').then(({ data }) => setDoctors(data || []))
  }, [])

  const submit = async () => {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('appointments').insert([{
      patient_id: patientId, doctor_id: doctorId, appointment_date: date,
      appointment_time: time, duration_minutes: 30, reason_for_visit: reason, status: 'Scheduled',
    }])
    setBusy(false)
    if (error) {
      // Friendlier message for the DB's double-booking constraint, raw message otherwise.
      const isConflict = /duplicate|conflict|constraint/i.test(error.message)
      setMsg({ type: 'error', text: isConflict ? 'That doctor already has an appointment at this exact date and time. Pick another time.' : error.message })
    } else {
      setMsg({ type: 'ok', text: 'Appointment booked.' })
      setTime(''); setReason('')
    }
  }

  const canSubmit = doctorId && date && time && !busy

  return (
    <div className="main">
      <div className="topbar"><div><h1>Book an appointment</h1><div className="sub">Choose a doctor, date, and time</div></div></div>
      <div className="form-card" style={{ maxWidth: 520 }}>
        {msg && <div className={msg.type === 'error' ? 'hint error' : 'hint'} style={{ marginBottom: 16 }}>{msg.text}</div>}
        <div className="row">
          <div className="field">
            <label>Doctor</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Choose a doctor</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} — {d.specialization}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div className="field full">
            <label>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="row"><div className="field full"><label>Reason for visit</label><input value={reason} onChange={(e) => setReason(e.target.value)} /></div></div>

        <div className="actions">
          <button className="btn primary" disabled={!canSubmit} onClick={submit}>{busy ? 'Booking…' : 'Confirm booking'}</button>
        </div>
      </div>
      <div className="footer-note">CareConnect Clinic Appointment System — Patient Portal</div>
    </div>
  )
}
