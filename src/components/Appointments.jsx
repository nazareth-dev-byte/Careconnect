import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function Appointments() {
  const [activeTab, setActiveTab] = useState('all')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const [searchFilter, setSearchFilter] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('All Doctors')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [dateFilter, setDateFilter] = useState('')

  const [doctorsList, setDoctorsList] = useState([])
  const [statusesList, setStatusesList] = useState([])
  const [reasonsList, setReasonsList] = useState([])

  const [patientQuery, setPatientQuery] = useState('')
  const [patientResults, setPatientResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)

  const [doctorQuery, setDoctorQuery] = useState('')
  const [doctorResults, setDoctorResults] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)

  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('')
  const [apptDuration, setApptDuration] = useState('30')
  const [apptReason, setApptReason] = useState('')

  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [completeTarget, setCompleteTarget] = useState(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [rxLines, setRxLines] = useState([{ medication_name: '', dosage: '', frequency: '' }])
  const [completeError, setCompleteError] = useState('')
  const [completeSaving, setCompleteSaving] = useState(false)

  const fetchAppointments = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchErr } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (id, first_name, last_name, phone),
        doctors (id, first_name, last_name, specialization)
      `)
      .order('appointment_date', { ascending: true })

    if (fetchErr) {
      setError(fetchErr.message)
    } else {
      const fetched = data || []
      setAppointments(fetched)
      
      const uniqueStatuses = [...new Set(fetched.map(a => a.status).filter(Boolean))]
      setStatusesList(uniqueStatuses)

      const uniqueReasons = [...new Set(fetched.map(a => a.reason_for_visit).filter(Boolean))]
      setReasonsList(uniqueReasons)
    }
    setLoading(false)
  }

  const fetchDoctors = async () => {
    const { data } = await supabase.from('doctors').select('id, first_name, last_name, specialization')
    if (data) setDoctorsList(data)
  }

  useEffect(() => {
    fetchAppointments()
    fetchDoctors()

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const q = patientQuery.trim()
    if (q.length < 1) {
      setPatientResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(5)

      if (data) setPatientResults(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientQuery])

  useEffect(() => {
    const q = doctorQuery.trim()
    if (q.length < 1) {
      setDoctorResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('doctors')
        .select('id, first_name, last_name, specialization')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(5)

      if (data) setDoctorResults(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [doctorQuery])

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return ''
    const dateObj = new Date(`${dateStr.split('T')[0]}T${timeStr || '00:00:00'}`)
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleSubmit = async () => {
    setFormError('')
    if (!selectedPatient || !selectedDoctor || !apptDate || !apptTime) {
      setFormError('Please select a patient, a doctor, and a date and time.')
      return
    }

    setIsSaving(true)

    const { error: insertError } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id: selectedPatient.id,
          doctor_id: selectedDoctor.id,
          appointment_date: apptDate,
          appointment_time: apptTime,
          duration_minutes: parseInt(apptDuration, 10),
          reason_for_visit: apptReason,
          status: 'Scheduled'
        }
      ])

    setIsSaving(false)

    if (insertError) {
      setFormError(insertError.message)
    } else {
      setShowModal(false)
      setSelectedPatient(null)
      setSelectedDoctor(null)
      setApptDate('')
      setApptTime('')
      setApptDuration('30')
      setApptReason('')
      fetchAppointments()
    }
  }

  const handleCancelAppointment = async (id) => {
    await supabase
      .from('appointments')
      .update({ status: 'Cancelled' })
      .eq('id', id)
    fetchAppointments()
  }

  const openComplete = (appt) => {
    setCompleteTarget(appt)
    setDiagnosis('')
    setTreatmentPlan('')
    setRxLines([{ medication_name: '', dosage: '', frequency: '' }])
    setCompleteError('')
  }

  const closeComplete = () => setCompleteTarget(null)

  const updateRxLine = (idx, field, value) => {
    setRxLines((prev) => prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line)))
  }

  const addRxLine = () => setRxLines((prev) => [...prev, { medication_name: '', dosage: '', frequency: '' }])

  const removeRxLine = (idx) => setRxLines((prev) => prev.filter((_, i) => i !== idx))

  const submitComplete = async () => {
    setCompleteError('')
    const validRx = rxLines.filter((r) => r.medication_name.trim())

    if (!diagnosis.trim()) { setCompleteError('Diagnosis is required.'); return }
    if (validRx.length === 0) { setCompleteError('Add at least one prescription line.'); return }

    setCompleteSaving(true)

    const { data: record, error: recordError } = await supabase
      .from('medical_records')
      .insert([{
        appointment_id: completeTarget.id,
        diagnosis: diagnosis.trim(),
        treatment_plan: treatmentPlan.trim() || null,
      }])
      .select()
      .single()

    if (recordError) {
      setCompleteSaving(false)
      setCompleteError(recordError.message)
      return
    }

    const { error: rxError } = await supabase
      .from('prescriptions')
      .insert(validRx.map((r) => ({
        record_id: record.id,
        medication_name: r.medication_name.trim(),
        dosage: r.dosage.trim() || null,
        frequency: r.frequency.trim() || null,
      })))

    if (rxError) {
      setCompleteSaving(false)
      setCompleteError(rxError.message)
      return
    }

    const { error: statusError } = await supabase
      .from('appointments')
      .update({ status: 'Completed' })
      .eq('id', completeTarget.id)

    setCompleteSaving(false)

    if (statusError) {
      setCompleteError(statusError.message)
      return
    }

    setCompleteTarget(null)
    fetchAppointments()
  }

  const todayStr = new Date().toLocaleDateString('en-CA')

  const filteredAppointments = appointments.filter((a) => {
    const patientName = a.patients ? `${a.patients.first_name} ${a.patients.last_name}`.toLowerCase() : ''
    const doctorName = a.doctors ? `dr. ${a.doctors.first_name} ${a.doctors.last_name}`.toLowerCase() : ''
    const matchesSearch = patientName.includes(searchFilter.toLowerCase()) || doctorName.includes(searchFilter.toLowerCase())

    const matchesDoctor = doctorFilter === 'All Doctors' || String(a.doctor_id) === String(doctorFilter)
    const matchesStatus = statusFilter === 'All Statuses' || (a.status && a.status.toLowerCase() === statusFilter.toLowerCase())
    
    const apptDateOnly = a.appointment_date ? a.appointment_date.split('T')[0] : ''
    const matchesDate = !dateFilter || apptDateOnly === dateFilter

    let matchesTab = true
    const currentStatus = a.status?.toLowerCase() || ''
    
    if (activeTab === 'today') {
      matchesTab = apptDateOnly === todayStr
    } else if (activeTab === 'upcoming') {
      matchesTab = apptDateOnly > todayStr && currentStatus !== 'cancelled'
    } else if (activeTab === 'cancelled') {
      matchesTab = currentStatus === 'cancelled'
    }

    return matchesSearch && matchesDoctor && matchesStatus && matchesDate && matchesTab
  })

  return (
    <div className="main">
      <div className="topbar">
        <div>
          <h1>Appointments</h1>
          <div className="sub">Book, reschedule, and manage the clinic's appointment queue</div>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowModal(true)}>
          + New Appointment
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="filters">
        <input 
          type="search" 
          placeholder="Search patient or doctor…" 
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          <option value="All Doctors">All Doctors</option>
          {doctorsList.map((d) => (
            <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All Statuses">All Statuses</option>
          {statusesList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input 
          type="date" 
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
      </div>

      <div className="panel">
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading appointments...</div>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'red' }}>Error: {error}</div>
        ) : (
          <table>
            <thead>
              <tr><th>Patient</th><th>Doctor</th><th>Date &amp; Time</th><th>Reason</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>No appointments found.</td></tr>
              ) : (
                filteredAppointments.map((a) => {
                  const patientName = a.patients ? `${a.patients.first_name} ${a.patients.last_name}` : 'Unknown Patient'
                  const doctorName = a.doctors ? `Dr. ${a.doctors.first_name} ${a.doctors.last_name}` : 'Unassigned'
                  const initial = patientName.charAt(0).toUpperCase()

                  return (
                    <tr key={a.id || `${a.appointment_date}-${a.appointment_time}`}>
                      <td>
                        <div className="patient-cell">
                          <div className="mini-avatar">{initial}</div>
                          <div>
                            <div className="p-name">{patientName}</div>
                            <div className="p-reason">{a.reason_for_visit}</div>
                          </div>
                        </div>
                      </td>
                      <td>{doctorName}</td>
                      <td>{formatDateTime(a.appointment_date, a.appointment_time)}</td>
                      <td>{a.reason_for_visit}</td>
                      <td><span className={`status ${a.status?.toLowerCase() || 'scheduled'}`}>{a.status || 'Scheduled'}</span></td>
                      <td>
                        <div className="row-actions">
                          {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                            <div className="icon-btn" title="Complete Visit" onClick={() => openComplete(a)}>✓</div>
                          )}
                          <div className="icon-btn" title="Cancel Appointment" onClick={() => handleCancelAppointment(a.id)}>✕</div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>New Appointment</h2>
                <p>Book a visit for a patient</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {formError && <div className="form-error" style={{ display: 'block' }}>{formError}</div>}

            <div className="modal-body">
              <div className="field-group">
                <div className="group-label">Who</div>

                <div className="picker">
                  <label>Patient</label>
                  {!selectedPatient ? (
                    <>
                      <input
                        type="text"
                        placeholder="Search patient by name…"
                        autoComplete="off"
                        value={patientQuery}
                        onChange={(e) => setPatientQuery(e.target.value)}
                      />
                      {patientQuery.trim().length > 0 && (
                        <div className="picker-results" style={{ display: 'block' }}>
                          {patientResults.length > 0 ? patientResults.map(p => (
                            <div key={p.id} className="picker-result" onClick={() => { setSelectedPatient(p); setPatientQuery(''); }}>
                              <span className="name">{p.first_name} {p.last_name}</span>
                              <span className="meta">{p.phone || ''}</span>
                            </div>
                          )) : (
                            <div className="picker-result"><span className="meta">No matches</span></div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="chip">
                      <div className="avatar">{(selectedPatient.first_name?.[0] || '').toUpperCase() + (selectedPatient.last_name?.[0] || '').toUpperCase()}</div>
                      <div className="info">
                        <div className="n">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                        <div className="m">{selectedPatient.phone}</div>
                      </div>
                      <button className="change" onClick={() => { setSelectedPatient(null); setPatientQuery('') }}>Change</button>
                    </div>
                  )}
                </div>

                <div className="picker" style={{ marginTop: '12px' }}>
                  <label>Doctor</label>
                  {!selectedDoctor ? (
                    <>
                      <input
                        type="text"
                        placeholder="Search doctor by name…"
                        autoComplete="off"
                        value={doctorQuery}
                        onChange={(e) => setDoctorQuery(e.target.value)}
                      />
                      {doctorQuery.trim().length > 0 && (
                        <div className="picker-results" style={{ display: 'block' }}>
                          {doctorResults.length > 0 ? doctorResults.map(d => (
                            <div key={d.id} className="picker-result" onClick={() => { setSelectedDoctor(d); setDoctorQuery(''); }}>
                              <span className="name">Dr. {d.first_name} {d.last_name}</span>
                              <span className="meta">{d.specialization || ''}</span>
                            </div>
                          )) : (
                            <div className="picker-result"><span className="meta">No matches</span></div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="chip">
                      <div className="avatar">{(selectedDoctor.first_name?.[0] || '').toUpperCase() + (selectedDoctor.last_name?.[0] || '').toUpperCase()}</div>
                      <div className="info">
                        <div className="n">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</div>
                        <div className="m">{selectedDoctor.specialization}</div>
                      </div>
                      <button className="change" onClick={() => { setSelectedDoctor(null); setDoctorQuery('') }}>Change</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="field-group">
                <div className="group-label">When</div>
                <div className="row3">
                  <div>
                    <label>Date</label>
                    <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} />
                  </div>
                  <div>
                    <label>Time</label>
                    <input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} />
                  </div>
                  <div>
                    <label>Duration</label>
                    <select value={apptDuration} onChange={(e) => setApptDuration(e.target.value)}>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="field-group">
                <div className="group-label">Why</div>
                <div className="reason-chips">
                  {reasonsList.map(r => (
                    <div key={r} className="reason-chip" onClick={() => setApptReason(r)}>{r}</div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Reason for visit"
                  value={apptReason}
                  onChange={(e) => setApptReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn primary" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completeTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-head">
              <div>
                <h2>Complete Visit</h2>
                <p>
                  {completeTarget.patients ? `${completeTarget.patients.first_name} ${completeTarget.patients.last_name}` : 'Patient'}
                  {' — '}{completeTarget.appointment_date}
                </p>
              </div>
              <button className="modal-close" onClick={closeComplete}>✕</button>
            </div>

            {completeError && <div className="form-error" style={{ display: 'block' }}>{completeError}</div>}

            <div className="modal-body">
              <div className="field-group">
                <div className="group-label">Diagnosis</div>
                <textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Required" />
              </div>

              <div className="field-group">
                <div className="group-label">Treatment plan</div>
                <textarea rows={2} value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} placeholder="Optional" />
              </div>

              <div className="field-group">
                <div className="group-label">Prescriptions</div>
                {rxLines.map((line, idx) => (
                  <div key={idx} className="row3" style={{ marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      <label>Medication</label>
                      <input type="text" value={line.medication_name} onChange={(e) => updateRxLine(idx, 'medication_name', e.target.value)} />
                    </div>
                    <div>
                      <label>Dosage</label>
                      <input type="text" value={line.dosage} onChange={(e) => updateRxLine(idx, 'dosage', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                      <div style={{ flex: 1 }}>
                        <label>Frequency</label>
                        <input type="text" value={line.frequency} onChange={(e) => updateRxLine(idx, 'frequency', e.target.value)} />
                      </div>
                      {rxLines.length > 1 && (
                        <div className="icon-btn" title="Remove line" onClick={() => removeRxLine(idx)} style={{ marginBottom: 2 }}>✕</div>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={addRxLine}>+ Add line</button>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn secondary" onClick={closeComplete}>Cancel</button>
              <button className="btn primary" onClick={submitComplete} disabled={completeSaving}>
                {completeSaving ? 'Saving…' : 'Complete Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tabs{display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--line);}
        .tab{padding:8px 16px;font-size:13.5px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;user-select:none;}
        .tab.active{color:var(--teal-deep);border-bottom-color:var(--teal-deep);}
        .tab:hover{color:var(--ink);}
        .modal-overlay{position:fixed;inset:0;background:rgba(20,30,28,.45);display:flex;align-items:center;justify-content:center;z-index:100;}
        .modal{background:var(--panel);width:560px;max-width:92vw;max-height:88vh;overflow-y:auto;border-radius:16px;box-shadow:0 24px 60px -12px rgba(10,30,26,.35);}
        .modal-head{padding:24px 28px 18px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;}
        .modal-head h2{margin:0 0 3px;font-size:19px;font-weight:700;}
        .modal-head p{margin:0;font-size:12.5px;color:var(--muted);}
        .modal-close{background:none;border:none;font-size:18px;color:var(--muted);cursor:pointer;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;}
        .modal-close:hover{background:var(--bg);}
        .modal-body{padding:22px 28px 6px;}
        .field-group{margin-bottom:18px;}
        .group-label{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--teal-deep);margin-bottom:10px;display:flex;align-items:center;gap:6px;}
        .modal label{display:block;font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:5px;}
        .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
        .modal input[type=text],.modal input[type=date],.modal input[type=time],.modal select,.modal textarea{width:100%;border:1.5px solid var(--line);border-radius:8px;padding:9px 11px;font-size:13.5px;font-family:inherit;color:var(--ink);background:#fff;}
        .modal input:focus,.modal select:focus,.modal textarea:focus{outline:none;border-color:var(--teal);}
        .picker{position:relative;margin-bottom:8px;}
        .picker-results{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:9px;box-shadow:0 10px 26px rgba(0,0,0,.1);max-height:180px;overflow-y:auto;z-index:5;}
        .picker-result{padding:9px 12px;font-size:13px;cursor:pointer;display:flex;justify-content:space-between;}
        .picker-result:hover{background:var(--teal-soft);}
        .picker-result .name{font-weight:600;}
        .picker-result .meta{color:var(--muted);font-size:11.5px;}
        .chip{display:flex;align-items:center;gap:10px;background:var(--teal-soft);border:1px solid #bfe0da;border-radius:10px;padding:9px 12px;font-size:13px;}
        .chip .avatar{width:28px;height:28px;border-radius:50%;background:var(--teal-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;flex-shrink:0;}
        .chip .info{flex:1;}
        .chip .info .n{font-weight:700;}
        .chip .info .m{color:var(--muted);font-size:11.5px;}
        .chip .change{background:none;border:none;color:var(--teal-deep);font-size:12px;font-weight:600;cursor:pointer;}
        .reason-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:9px;}
        .reason-chip{border:1px solid var(--line);background:#fff;border-radius:20px;padding:5px 12px;font-size:12px;color:var(--ink);cursor:pointer;}
        .reason-chip:hover{border-color:var(--teal);color:var(--teal-deep);}
        .form-error{background:var(--danger-soft);color:var(--danger);border-radius:8px;padding:10px 13px;font-size:13px;margin:0 28px 14px;}
        .modal-foot{padding:16px 28px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line);margin-top:6px;}
      `}</style>
    </div>
  )
}
