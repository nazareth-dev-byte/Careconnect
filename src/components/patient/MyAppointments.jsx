import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../supabaseClient'

export default function MyAppointments({ patientId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, doctors(first_name, last_name)')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }, [patientId])

  useEffect(() => { load() }, [load])

  const cancel = async (id) => {
    await supabase.from('appointments').update({ status: 'Cancelled' }).eq('id', id)
    load()
  }

  return (
    <div className="main">
      <div className="topbar"><div><h1>My appointments</h1><div className="sub">Upcoming and past visits</div></div></div>
      <div className="panel">
        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No appointments yet.</div>
        ) : (
          <table>
            <thead><tr><th>Doctor</th><th>Date &amp; Time</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>Dr. {a.doctors?.first_name} {a.doctors?.last_name}</td>
                  <td>{a.appointment_date} · {a.appointment_time?.slice(0, 5)}</td>
                  <td>{a.reason_for_visit}</td>
                  <td><span className={`status ${a.status?.toLowerCase()}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'Scheduled' && new Date(`${a.appointment_date}T${a.appointment_time}`) > new Date() && (
                      <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => cancel(a.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="footer-note">CareConnect Clinic Appointment System — Patient Portal</div>
    </div>
  )
}
