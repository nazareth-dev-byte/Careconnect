import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const calculateWaitTime = (checkIn, consultStart) => {
  if (!checkIn || !consultStart) return null
  const start = new Date(checkIn)
  const end = new Date(consultStart)
  return Math.round((end - start) / 60000)
}

export default function Reports() {
  const [timeframe, setTimeframe] = useState('This Week')
  const [selectedDoctor, setSelectedDoctor] = useState('All Doctors')
  const [doctorsList, setDoctorsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [stats, setStats] = useState({
    totalVisits: 0,
    noShowRate: '0%',
    avgWait: 'N/A',
    avgUtilization: '0%'
  })

  const [attendance, setAttendance] = useState([])
  const [utilization, setUtilization] = useState([])
  const [detail, setDetail] = useState([])

  const fetchDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, first_name, last_name')
    if (data) setDoctorsList(data)
  }

  const getDateRange = () => {
    const now = new Date()
    let startDate = new Date()

    if (timeframe === 'This Week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      startDate = new Date(now.setDate(diff))
    } else if (timeframe === 'This Month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (timeframe === 'Last 30 Days') {
      startDate.setDate(now.getDate() - 30)
    }

    return startDate.toISOString().split('T')[0]
  }

  const fetchReportData = async () => {
    setLoading(true)
    setError(null)
    try {
      const startDateStr = getDateRange()

      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          doctor_id,
          check_in_time,
          consultation_start_time,
          doctors (id, first_name, last_name)
        `)
        .gte('appointment_date', startDateStr)

      if (selectedDoctor !== 'All Doctors') {
        query = query.eq('doctor_id', selectedDoctor)
      }

      const { data: appts, error: fetchErr } = await query

      if (fetchErr) throw fetchErr

      const list = appts || []

      const completedAppts = list.filter(a => (a.status || '').toLowerCase() === 'completed')
      const noShowAppts = list.filter(a => (a.status || '').toLowerCase() === 'no-show')
      const totalVisitsCount = completedAppts.length
      const totalCount = list.length

      const calcNoShowRate = totalCount > 0 ? ((noShowAppts.length / totalCount) * 100).toFixed(1) + '%' : '0%'

      const groupedByDate = {}
      let totalOverallWait = 0
      let validOverallWaitCount = 0

      list.forEach(a => {
        const d = a.appointment_date
        if (!groupedByDate[d]) {
          groupedByDate[d] = { scheduled: 0, completed: 0, noShow: 0, cancelled: 0, dailyWaitTotal: 0, dailyWaitCount: 0 }
        }
        groupedByDate[d].scheduled += 1
        
        const st = (a.status || '').toLowerCase()
        if (st === 'completed') groupedByDate[d].completed += 1
        else if (st === 'no-show') groupedByDate[d].noShow += 1
        else if (st === 'cancelled') groupedByDate[d].cancelled += 1

        const wait = calculateWaitTime(a.check_in_time, a.consultation_start_time)
        if (wait !== null) {
          groupedByDate[d].dailyWaitTotal += wait
          groupedByDate[d].dailyWaitCount += 1
          totalOverallWait += wait
          validOverallWaitCount += 1
        }
      })

      const sortedDates = Object.keys(groupedByDate).sort()

      const detailData = sortedDates.map(d => {
        const item = groupedByDate[d]
        const formattedDate = new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
        
        const dailyAvgWait = item.dailyWaitCount > 0 
          ? `${Math.round(item.dailyWaitTotal / item.dailyWaitCount)} min`
          : 'N/A'

        return {
          date: formattedDate,
          scheduled: item.scheduled,
          completed: item.completed,
          noShow: item.noShow,
          cancelled: item.cancelled,
          wait: dailyAvgWait
        }
      })

      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }

      list.forEach(a => {
        const dayName = new Date(`${a.appointment_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
        if (dayCounts[dayName] !== undefined) {
          if ((a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'scheduled') {
            dayCounts[dayName] += 1
          }
        }
      })

      const maxVal = Math.max(...Object.values(dayCounts), 1)
      const attendanceData = daysOfWeek.map(day => {
        const val = dayCounts[day]
        const height = Math.round((val / maxVal) * 100) || 8
        return { day, value: val, height }
      })

      const docMap = {}
      list.forEach(a => {
        if (a.doctors) {
          const name = `Dr. ${a.doctors.first_name?.[0] || ''}. ${a.doctors.last_name || ''}`
          if (!docMap[name]) docMap[name] = { total: 0, completed: 0 }
          docMap[name].total += 1
          if ((a.status || '').toLowerCase() === 'completed') {
            docMap[name].completed += 1
          }
        }
      })

      const utilData = Object.keys(docMap).map(name => {
        const { total, completed } = docMap[name]
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0
        return {
          name,
          pct,
          amber: pct < 70
        }
      })

      const totalUtil = utilData.length > 0
        ? Math.round(utilData.reduce((acc, curr) => acc + curr.pct, 0) / utilData.length)
        : 0

      const overallAvgWait = validOverallWaitCount > 0 
        ? `${Math.round(totalOverallWait / validOverallWaitCount)} min`
        : 'N/A'

      setStats({
        totalVisits: totalVisitsCount,
        noShowRate: calcNoShowRate,
        avgWait: overallAvgWait,
        avgUtilization: `${totalUtil}%`
      })

      setAttendance(attendanceData)
      setUtilization(utilData.length > 0 ? utilData : doctorsList.map(d => ({
        name: `Dr. ${d.first_name?.[0] || ''}. ${d.last_name}`,
        pct: 0,
        amber: true
      })))
      setDetail(detailData)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [timeframe, selectedDoctor])

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Clinic Reports</h1>
          <div className="sub">Attendance statistics and doctor utilization</div>
        </div>
        <div className="filters">
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
          </select>
          <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
            <option value="All Doctors">All Doctors</option>
            {doctorsList.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
          <div className="btn-export" style={{ cursor: 'pointer' }} onClick={() => window.print()}>Export PDF</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading report metrics...</div>
      ) : error ? (
        <div style={{ padding: 20, color: 'red', textAlign: 'center' }}>Error: {error}</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="label">Total Visits ({timeframe})</div>
              <div className="value">{stats.totalVisits}</div>
              <div className="trend up">Live aggregate</div>
            </div>
            <div className="stat-card">
              <div className="label">No-Show Rate</div>
              <div className="value">{stats.noShowRate}</div>
              <div className="trend down">Calculated live</div>
            </div>
            <div className="stat-card">
              <div className="label">Avg. Wait Time</div>
              <div className="value">{stats.avgWait}</div>
              <div className="trend up">Calculated live</div>
            </div>
            <div className="stat-card">
              <div className="label">Avg. Doctor Utilization</div>
              <div className="value">{stats.avgUtilization}</div>
              <div className="trend up">Based on completed</div>
            </div>
          </div>

          <div className="grid">
            <div className="panel">
              <h2>Clinic Attendance — {timeframe}</h2>
              <div className="panel-sub">Patients seen per day (Mon–Sat)</div>
              <div className="bar-chart">
                {attendance.map((d) => (
                  <div className="bar-col" key={d.day}>
                    <div className="bar" style={{ height: `${d.height}%` }}>
                      <div className="val">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bar-labels">
                {attendance.map((d) => <div key={d.day}>{d.day}</div>)}
              </div>
            </div>

            <div className="panel">
              <h2>Doctor Utilization</h2>
              <div className="panel-sub">% of scheduled visits completed</div>
              {utilization.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No doctor data available</div>
              ) : (
                utilization.map((d) => (
                  <div className="doc-row" key={d.name}>
                    <div className="doc-top">
                      <span className="name">{d.name}</span>
                      <span className="pct">{d.pct}%</span>
                    </div>
                    <div className="track">
                      <div className={`fill${d.amber ? ' amber' : ''}`} style={{ width: `${d.pct}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Daily Attendance Detail</h2>
            <div className="panel-sub">Breakdown by day</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Scheduled</th>
                  <th>Completed</th>
                  <th>No-Shows</th>
                  <th>Cancelled</th>
                  <th>Avg. Wait</th>
                </tr>
              </thead>
              <tbody>
                {detail.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>No detail records found for this timeframe.</td>
                  </tr>
                ) : (
                  detail.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.scheduled}</td>
                      <td className="completed">{d.completed}</td>
                      <td className="no-show">{d.noShow}</td>
                      <td>{d.cancelled}</td>
                      <td>{d.wait}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="footer-note">CareConnect Clinic Appointment System — Reports</div>
    </div>
  )
}