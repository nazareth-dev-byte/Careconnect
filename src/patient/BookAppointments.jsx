import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function timeSlots(start, end, stepMin = 30) {
  const out = []
  let [h, m] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  while (h < eh || (h === eh && m < em)) {
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += stepMin
    if (m >= 60) { m -= 60; h += 1 }
  }
  return out
}
const inWindow = (t, start, end) => t >= start.slice(0, 5) && t < end.slice(0, 5)

export default function BookAppointment({ patientId }) {
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('doctors').select('*').order('last_name').then(({ data }) => setDoctors(data || []))
  }, [])

  const computeSlots = useCallback(async () => {
    setSlots([]); setSlot('')
    if (!doctorId || !date) return
    const dow = DAYS[new Date(date + 'T00:00:00').getDay()]
    const [{ data: sched }, { data: appts }] = await Promise.all([
      supabase.from('doctor_schedules').select('*').eq('doctor_id', doctorId).eq('day_of_week', dow),
      supabase.from('appointments').select('appointment_time').eq('doctor_id', doctorId).eq('appointment_date', date).eq('status', 'Scheduled'),
    ])
    if ((sched || []).some((s) => s.entry_type === 'Leave')) return
    const working = (sched || []).filter((s) => s.entry_type === 'Working')
    const breaks = (sched || []).filter((s) => s.entry_type === 'Break')
    const taken = new Set((appts || []).map((a) => a.appointment_time.slice(0, 5)))
    let all = []
    working.forEach((w) => { all = all.concat(timeSlots(w.start_time.slice(0, 5), w.end_time.slice(0, 5))) })
    const free = all.filter((t) => !breaks.some((b) => inWindow(t, b.start_time, b.end_time)) && !taken.has(t))
    setSlots([...new Set(free)].sort())
  }, [doctorId, date])

  useEffect(() => { computeSlots() }, [computeSlots])

  const submit = async () => {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('appointments').insert([{
      patient_id: patientId, doctor_id: doctorId, appointment_date: date,
      appointment_time: slot, duration_minutes: 30, reason_for_visit: reason, status: 'Scheduled',
    }])
    setBusy(false)
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'ok', text: 'Appointment booked.' }); setSlot(''); setReason(''); computeSlots() }
  }

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

        {doctorId && date && (
          <div className="field full" style={{ marginBottom: 16 }}>
            <label>Available times</label>
            {slots.length === 0 ? (
              <div className="hint">No open slots that day.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {slots.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className="btn secondary"
                    style={slot === t ? { background: 'var(--teal)', color: '#fff', borderColor: 'var(--teal)' } : {}}
                    onClick={() => setSlot(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="row"><div className="field full"><label>Reason for visit</label><input value={reason} onChange={(e) => setReason(e.target.value)} /></div></div>

        <div className="actions">
          <button className="btn primary" disabled={!slot || busy} onClick={submit}>{busy ? 'Booking…' : 'Confirm booking'}</button>
        </div>
      </div>
      <div className="footer-note">CareConnect Clinic Appointment System — Patient Portal</div>
    </div>
  )
}
