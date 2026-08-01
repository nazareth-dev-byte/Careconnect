import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'new-patient', label: 'New Patient' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'patients', label: 'Patients' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
]

export default function Sidebar({ activeScreen, setActiveScreen }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })
    
    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const fullName = user?.user_metadata?.full_name || user?.email || 'Loading...'
  const role = user?.user_metadata?.role || 'Staff'

  return (
    <aside className="sidebar">
      <div className="brand">Care<span>Connect</span></div>
      <div className="brand-sub">Clinic System</div>

      {NAV_ITEMS.map((item) => (
        <div
          key={item.key}
          className={`nav-item ${activeScreen === item.key ? 'active' : ''}`}
          onClick={() => setActiveScreen(item.key)}
        >
          {item.label}
        </div>
      ))}

      <div className="sidebar-foot" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fullName}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>
          Logged in as {role}
        </div>
        <button 
          onClick={handleLogout} 
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: 'transparent',
            color: '#fca5a5',
            border: '1px solid #fca5a5',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#fca5a5'
            e.target.style.color = '#1f2937'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent'
            e.target.style.color = '#fca5a5'
          }}
        >
          Log Out
        </button>
      </div>
    </aside>
  )
}