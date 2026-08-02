import './CareConnect.css'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import AuthFlow from './components/AuthFlow'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import NewPatient from './components/NewPatient'
import Appointments from './components/Appointments'
import Patients from './components/Patients'
import Reports from './components/Reports'
import Settings from './components/Settings'
import CompleteProfile from './components/patient/CompleteProfile'
import PatientSidebar from './components/patient/PatientSidebar'
import PatientHome from './components/patient/PatientHome'
import BookAppointment from './components/patient/BookAppointment'
import MyAppointments from './components/patient/MyAppointments'
import MyRecords from './components/patient/MyRecords'

const STAFF_ROLES = ['Doctor', 'Admin', 'Receptionist']
const BACK_OFFICE_ROLES = ['Admin', 'Receptionist'] // sees Patients/Reports/New Patient; Doctor doesn't

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [staffScreen, setStaffScreen] = useState('dashboard')
  const [patientScreen, setPatientScreen] = useState('home')

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data || null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div>Loading...</div>

  // Not signed in — landing / portal pick / credentials / mismatch check
  if (!session) {
    return <AuthFlow onAuthed={(p) => setProfile(p)} />
  }

  // Signed in, profile still loading
  if (!profile) return <div>Setting up your account…</div>

  // ---------------- Patient ----------------
  if (profile.role === 'Patient') {
    if (!profile.patient_id) {
      return <CompleteProfile userId={session.user.id} onDone={() => loadProfile(session.user.id)} />
    }
    return (
      <div className="app-layout">
        <PatientSidebar activeScreen={patientScreen} setActiveScreen={setPatientScreen} onLogout={handleLogout} />
        <main className="main">
          {patientScreen === 'home' && <PatientHome patientId={profile.patient_id} />}
          {patientScreen === 'book' && <BookAppointment patientId={profile.patient_id} />}
          {patientScreen === 'appointments' && <MyAppointments patientId={profile.patient_id} />}
          {patientScreen === 'records' && <MyRecords patientId={profile.patient_id} />}
        </main>
      </div>
    )
  }

  // ---------------- Doctor, not yet linked to a doctor record ----------------
  if (profile.role === 'Doctor' && !profile.doctor_id) {
    return (
      <div style={{ padding: 40, maxWidth: 480 }}>
        <p>Your account isn't linked to a doctor record yet. Ask an Administrator to link it in Settings → Users &amp; Roles.</p>
        <button className="btn secondary" onClick={handleLogout}>Sign out</button>
      </div>
    )
  }

  // ---------------- Doctor / Admin / Receptionist — existing staff app, gated by role ----------------
  if (STAFF_ROLES.includes(profile.role)) {
    const isBackOffice = BACK_OFFICE_ROLES.includes(profile.role)
    return (
      <div className="app-layout">
        <Sidebar activeScreen={staffScreen} setActiveScreen={setStaffScreen} onLogout={handleLogout} role={profile.role} />
        <main className="main">
          {staffScreen === 'dashboard' && <Dashboard />}
          {staffScreen === 'new-patient' && isBackOffice && <NewPatient onNavigate={setStaffScreen} />}
          {staffScreen === 'appointments' && <Appointments />}
          {staffScreen === 'patients' && isBackOffice && <Patients onAddPatientClick={() => setStaffScreen('new-patient')} />}
          {staffScreen === 'reports' && isBackOffice && <Reports />}
          {staffScreen === 'settings' && <Settings role={profile.role} />}
        </main>
      </div>
    )
  }

  // Unknown role — shouldn't happen, but don't leave someone in limbo
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <p>Your account has an unrecognized role ("{profile.role}"). Ask an Administrator to check Settings → Users &amp; Roles.</p>
      <button className="btn secondary" onClick={handleLogout}>Sign out</button>
    </div>
  )
}
