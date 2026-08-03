import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { notifyReminderIfDue } from '../../notify'

export default function PatientHome({ patientId }) {
  const [next, setNext] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('appointments')
        .select('*, doctors(first_name, last_name, specialization)')
        .eq('patient_id', patientId)
        .eq('status', 'Scheduled')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(1)
      const nextAppt = data && data[0]
      setNext(nextAppt)
      setLoading(false)
      if (nextAppt) notifyReminderIfDue(nextAppt)
    })()
  }, [patientId])

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Welcome back</h1>
          <div className="sub">Your next visit at a glance</div>
        </div>
      </div>
      <div className="panel">
        {loading ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : next ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Dr. {next.doctors?.first_name} {next.doctors?.last_name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{next.appointment_date} · {next.appointment_time?.slice(0, 5)}</div>
            {next.reason_for_visit && <div style={{ marginTop: 8, fontSize: 13 }}>{next.reason_for_visit}</div>}
          </div>
        ) : (
          <div style={{ color: 'var(--muted)' }}>No upcoming appointments. Use Book Appointment to schedule one.</div>
        )}
      </div>
      <div className="footer-note">CareConnect Clinic Appointment System — Patient Portal</div>
    </div>
  )
}
