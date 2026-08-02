import './CareConnect.css'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import NewPatient from './components/NewPatient'
import Appointments from './components/Appointments'
import Patients from './components/Patients'
import Reports from './components/Reports'
import Settings from './components/Settings'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div>Loading...</div>

  if (!session) {
    return <Login />
  }

  return (
    <div className="app-layout">
      <Sidebar activeScreen={activeScreen} setActiveScreen={setActiveScreen} onLogout={handleLogout} />
      <main className="main">
        {activeScreen === 'dashboard' && <Dashboard />}
        {activeScreen === 'new-patient' && <NewPatient />}
        {activeScreen === 'appointments' && <Appointments />}
        {activeScreen === 'patients' && <Patients />}
        {activeScreen === 'reports' && <Reports />}
        {activeScreen === 'settings' && <Settings />}
      </main>
    </div>
  )
}
