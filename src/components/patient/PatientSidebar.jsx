import React from 'react'

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'book', label: 'Book Appointment' },
  { key: 'appointments', label: 'My Appointments' },
  { key: 'records', label: 'My Records' },
]

export default function PatientSidebar({ activeScreen, setActiveScreen, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">Care<span>Connect</span></div>
      <div className="brand-sub">Patient Portal</div>

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
        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '12px' }}>Logged in as Patient</div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '8px', backgroundColor: 'transparent', color: '#fca5a5',
            border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
          }}
        >
          Log Out
        </button>
      </div>
    </aside>
  )
}
