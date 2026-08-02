import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function calculateAge(dob) {
  if (!dob) return ''
  const diffMs = Date.now() - new Date(dob).getTime()
  const ageDt = new Date(diffMs)
  return Math.abs(ageDt.getUTCFullYear() - 1970)
}

export default function Patients({ onAddPatientClick }) {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [coverageFilter, setCoverageFilter] = useState('All Coverage')

  useEffect(() => {
    async function fetchPatients() {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_name', { ascending: true })

      if (data) {
        setPatients(data)
      }
      setLoading(false)
    }

    fetchPatients()
  }, [])

  const filteredPatients = patients.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          (p.phone && p.phone.includes(searchTerm))
    
    return matchesSearch
  })

  const total = patients.length
  const currentMonth = new Date().getMonth()
  const newThisMonth = patients.filter(p => new Date(p.created_at).getMonth() === currentMonth).length

  const insuredCount = patients.filter(p => p.insurance_provider && p.insurance_provider.trim() !== '').length
  const insuredPercent = total > 0 ? Math.round((insuredCount / total) * 100) : 0
  const selfPayPercent = total > 0 ? 100 - insuredPercent : 0

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Patient Directory</h1>
          <div className="sub">Manage registered clinic patient records</div>
        </div>
        <button type="button" className="btn primary" onClick={onAddPatientClick}>+ Register New Patient</button>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="label">Total Registered</div>
          <div className="value">{total}</div>
          <div className="sub">All-time active records</div>
        </div>
        <div className="stat-card">
          <div className="label">New This Month</div>
          <div className="value">{newThisMonth}</div>
          <div className="trend up">▲ Active growth</div>
        </div>
        <div className="stat-card">
          <div className="label">Insured Patients</div>
          <div className="value">{insuredPercent}%</div>
          <div className="sub">HMO &amp; Private Insurance</div>
        </div>
        <div className="stat-card">
          <div className="label">Self-Pay</div>
          <div className="value">{selfPayPercent}%</div>
          <div className="sub">Out-of-pocket billing</div>
        </div>
      </div>

      <div className="panel">
        <div className="controls" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search by name or phone number..." 
            style={{ flex: 1 }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)}>
            <option>All Coverage</option>
            <option>HMO</option>
            <option>Self-Pay</option>
            <option>Insurance</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Gender / Age</th>
                <th>Contact Number</th>
                <th>Last Visit</th>
                <th>Billing Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading records...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)' }}>No matching patients found.</td></tr>
              ) : (
                filteredPatients.map((p) => {
                  const displayId = p.id ? `#P-${p.id.toString().slice(0, 4)}` : '—'
                  const age = calculateAge(p.date_of_birth)
                  const genderDisplay = p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'
                  
                  return (
                    <tr key={p.id}>
                      <td><b>{displayId}</b></td>
                      <td style={{ fontWeight: '500' }}>{p.first_name} {p.last_name}</td>
                      <td>{genderDisplay}{age ? `, ${age}` : ''}</td>
                      <td>{p.phone || '—'}</td>
                      <td>—</td>
                      <td>{p.insurance_provider || 'Self-Pay'}</td>
                      <td><button type="button" className="btn secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Record</button></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer-note">CareConnect Clinic Appointment System — Patient Directory</div>
    </div>
  )
}
