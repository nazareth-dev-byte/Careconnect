import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function MyRecords({ patientId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: appts } = await supabase
        .from('appointments')
        .select('*, doctors(first_name, last_name)')
        .eq('patient_id', patientId)
        .eq('status', 'Completed')

      const withRecs = await Promise.all((appts || []).map(async (a) => {
        const { data: recs } = await supabase.from('medical_records').select('*').eq('appointment_id', a.id)
        const rec = recs && recs[0]
        let rx = []
        if (rec) {
          const { data } = await supabase.from('prescriptions').select('*').eq('record_id', rec.id)
          rx = data || []
        }
        return { appt: a, rec, rx }
      }))

      setItems(withRecs.filter((i) => i.rec).sort((x, y) => new Date(y.appt.appointment_date) - new Date(x.appt.appointment_date)))
      setLoading(false)
    })()
  }, [patientId])

  return (
    <div className="main">
      <div className="topbar"><div><h1>My records</h1><div className="sub">Diagnoses, treatment plans, and prescriptions</div></div></div>
      {loading ? (
        <div className="panel" style={{ color: 'var(--muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="panel" style={{ color: 'var(--muted)' }}>Nothing on file yet.</div>
      ) : (
        items.map(({ appt, rec, rx }) => (
          <div className="panel" key={rec.id}>
            <div className="panel-sub" style={{ marginBottom: 6 }}>{appt.appointment_date} · Dr. {appt.doctors?.first_name} {appt.doctors?.last_name}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{rec.diagnosis}</div>
            {rec.treatment_plan && <div style={{ fontSize: 13, marginTop: 4 }}>{rec.treatment_plan}</div>}
            {rx.length > 0 && (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                {rx.map((p) => (
                  <div key={p.id} style={{ fontSize: 12.5 }}>
                    {p.medication_name}{p.dosage ? ` — ${p.dosage}` : ''}{p.frequency ? ` (${p.frequency})` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
      <div className="footer-note">CareConnect Clinic Appointment System — Patient Portal</div>
    </div>
  )
}
