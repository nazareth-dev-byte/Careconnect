import React from 'react'
import { supabase } from '../supabaseClient'
import NotificationBell from './NotificationBell'

const NAV_ITEMS_ALL = [
  { key: 'dashboard', label: 'Dashboard', roles: ['Doctor', 'Admin', 'Receptionist'] },
  { key: 'new-patient', label: 'New Patient', roles: ['Admin', 'Receptionist'] },
  { key: 'appointments', label: 'Appointments', roles: ['Doctor', 'Admin', 'Receptionist'] },
  { key: 'patients', label: 'Patients', roles: ['Admin', 'Receptionist'] },
  { key: 'reports', label: 'Reports', roles: ['Admin', 'Receptionist'] },
  { key: 'settings', label: 'Settings', roles: ['Doctor', 'Admin', 'Receptionist'] },
]

export default function Sidebar({ activeScreen, setActiveScreen, onLogout, role, profileId }) {
  const items = NAV_ITEMS_ALL.filter((item) => item.roles.includes(role))

  const handleLogout = async () => {
    if (onLogout) await onLogout()
    else await supabase.auth.signOut()
  }

  return (
    <aside className="sidebar">
      <div className="brand">Care<span>Connect</span></div>
      <div className="brand-sub">Clinic System</div>
      <NotificationBell profileId={profileId} role={role} />

      {items.map((item) => (
        <div
          key={item.key}
          className={`nav-item ${activeScreen === item.key ? 'active' : ''}`}
          onClick={() => setActiveScreen(item.key)}
        >
          {item.label}
        </div>
      ))}

      <div className="sidebar-foot" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.target.style.backgroundColor = '#fca5a5'; e.target.style.color = '#1f2937' }}
          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#fca5a5' }}
        >
          Log Out
        </button>
      </div>
    </aside>
  )
}
