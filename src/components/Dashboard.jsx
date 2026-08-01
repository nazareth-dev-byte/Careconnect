import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingConsultations: 0,
    totalDoctors: 0
  })
  const [recentAppointments, setRecentAppointments] = useState([])
  const [recentPatients, setRecentPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const todayStr = new Date().toISOString().split('T')[0]

      const { count: patientCount, error: pErr } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })

      const { count: todayCount, error: aErr } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', todayStr)

      const { count: pendingCount, error: statusErr } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .ilike('status', 'scheduled')

      const { count: doctorCount, error: dErr } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })

      if (pErr || aErr || statusErr || dErr) {
        throw new Error(pErr?.message || aErr?.message || statusErr?.message || dErr?.message)
      }

      setMetrics({
        totalPatients: patientCount || 0,
        todayAppointments: todayCount || 0,
        pendingConsultations: pendingCount || 0,
        totalDoctors: doctorCount || 0
      })

      const { data: apptData } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason_for_visit,
          patients (first_name, last_name),
          doctors (first_name, last_name)
        `)
        .order('appointment_date', { ascending: false })
        .limit(5)

      const { data: patData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentAppointments(apptData || [])
      setRecentPatients(patData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return ''
    const dateObj = new Date(`${dateStr}T${timeStr || '00:00:00'}`)
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Overview of clinic operations and patient activity</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading dashboard metrics...</div>
      ) : error ? (
        <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title">Total Patients</div>
              <div className="metric-value">{metrics.totalPatients}</div>
              <div className="metric-sub">Registered in system</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Today's Appointments</div>
              <div className="metric-value">{metrics.todayAppointments}</div>
              <div className="metric-sub">Scheduled for today</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Pending Consultations</div>
              <div className="metric-value">{metrics.pendingConsultations}</div>
              <div className="metric-sub">Awaiting visit</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Active Doctors</div>
              <div className="metric-value">{metrics.totalDoctors}</div>
              <div className="metric-sub">Available staff</div>
            </div>
          </div>

          <div className="dashboard-sections">
            <div className="panel flex-1">
              <div className="panel-header">
                <h3>Recent Appointments</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No recent appointments</td></tr>
                  ) : (
                    recentAppointments.map((a) => {
                      const patientName = a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : 'Unknown'
                      const doctorName = a.doctors ? `Dr. ${a.doctors.first_name} ${a.doctors.last_name}` : 'Unassigned'
                      return (
                        <tr key={a.id}>
                          <td><strong>{patientName}</strong></td>
                          <td>{doctorName}</td>
                          <td>{formatDateTime(a.appointment_date, a.appointment_time)}</td>
                          <td><span className={`status ${(a.status || 'scheduled').toLowerCase()}`}>{a.status || 'Scheduled'}</span></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="panel flex-1">
              <div className="panel-header">
                <h3>Recently Added Patients</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPatients.length === 0 ? (
                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: 20 }}>No recent patients</td></tr>
                  ) : (
                    recentPatients.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.first_name} {p.last_name}</strong></td>
                        <td>{p.phone || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .metric-card {
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .metric-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--teal-deep);
          margin-bottom: 4px;
        }
        .metric-sub {
          font-size: 12px;
          color: var(--muted);
        }
        .dashboard-sections {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .flex-1 {
          flex: 1;
          min-width: 320px;
        }
        .panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
          color: var(--ink);
        }
      `}</style>
    </div>
  )
}