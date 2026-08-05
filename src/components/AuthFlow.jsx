import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

const PORTALS = [
  { key: 'Patient', label: 'Patient', desc: 'Book visits, view your records' },
  { key: 'Doctor', label: 'Doctor', desc: 'Manage your own appointments' },
  { key: 'Admin', label: 'Admin', desc: 'Run the front desk and reports' },
]

const FEATURES = [
  'Comprehensive visit records and diagnosis access',
  'Real-time appointment scheduling for a calm front desk',
  'Automated patient alerts and reminders',
  'Secure, role-based portals for all staff',
]

function roleMatches(role, portal) {
  if (portal === 'Admin') return role === 'Admin' || role === 'Receptionist'
  return role === portal
}

export default function AuthFlow({ onAuthed }) {
  const [step, setStep] = useState('picker') // picker | form
  const [userType, setUserType] = useState('existing') // existing | new
  const [portal, setPortal] = useState(null) // Patient | Doctor | Admin
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mismatch, setMismatch] = useState(null) // holds the real profile row when it doesn't match the pick

  // Ensures a profiles row exists even if there's no DB trigger creating one on signup.
  const ensureProfile = async (userId) => {
    const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (existing) return existing
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .insert([{ id: userId, role: 'Patient', email: (await supabase.auth.getUser()).data.user.email }])
      .select()
      .single()
    if (createErr) throw createErr
    return created
  }

  const resetToLanding = () => {
    setStep('picker'); setUserType('existing'); setPortal(null); setMismatch(null); setError('')
  }

  const chooseTab = (type) => {
    setUserType(type); setPortal(null); setStep('picker'); setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (userType === 'existing') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        const profile = await ensureProfile(data.user.id)
        roleMatches(profile.role, portal) ? onAuthed(profile) : setMismatch(profile)
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        if (!data.session) {
          setError('Check your inbox to confirm your address, then sign in.')
        } else {
          const profile = await ensureProfile(data.user.id)
          roleMatches(profile.role, portal) ? onAuthed(profile) : setMismatch(profile)
        }
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const Shell = ({ children }) => (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-mark" />
          <span className="auth-word">CareConnect</span>
        </div>

        <h1 className="auth-hero-title">Your Integrated Clinic,<br />Just One Click Away</h1>
        <p className="auth-hero-sub">Sign in to manage appointments, access records, and streamline your clinic workflow for better care.</p>

        <div className="auth-feature-list">
          {FEATURES.map((f) => (
            <div className="auth-feature" key={f}>
              <span className="check">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab${userType === 'existing' ? ' active' : ''}`} onClick={() => chooseTab('existing')}>Sign In</button>
            <button className={`auth-tab${userType === 'new' ? ' active' : ''}`} onClick={() => chooseTab('new')}>Register</button>
          </div>

          {children}

          <p className="auth-trust">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 3L20 6.5V11C20 16 16.5 20 12 21C7.5 20 4 16 4 11V6.5L12 3Z" stroke="var(--teal)" strokeWidth="1.7" strokeLinejoin="round" /></svg>
            Role-based access keeps every record private
          </p>
        </div>
      </div>

      <style>{`
        .auth-page{ min-height:100vh; display:flex; font-family:'Inter',sans-serif; }
        .auth-left{
          flex:0 0 44%; background:linear-gradient(160deg, var(--teal-deep), var(--ink));
          color:#eaf3f1; padding:56px 52px; display:flex; flex-direction:column; justify-content:center;
          position:relative; overflow:hidden;
        }
        .auth-left::before{
          content:''; position:absolute; inset:0;
          background:radial-gradient(circle at 85% 15%, rgba(127,184,176,0.18), transparent 45%);
        }
        .auth-brand{ position:relative; display:flex; align-items:center; gap:10px; margin-bottom:56px; }
        .auth-mark{ width:26px; height:26px; border-radius:8px; background:linear-gradient(135deg,var(--sage),var(--teal)); flex-shrink:0; }
        .auth-word{ font-family:'Fraunces',serif; font-weight:600; font-size:19px; color:#fff; }
        .auth-hero-title{
          position:relative; font-family:'Fraunces',serif; font-weight:600; font-size:34px; line-height:1.2;
          color:#fff; margin:0 0 18px; max-width:420px;
        }
        .auth-hero-sub{ position:relative; font-size:14.5px; line-height:1.65; color:#bcd7d1; max-width:380px; margin:0 0 36px; }
        .auth-feature-list{ position:relative; display:grid; gap:16px; }
        .auth-feature{ display:flex; align-items:center; gap:12px; font-size:13.5px; color:#dcece8; }
        .auth-feature .check{
          width:19px; height:19px; border-radius:50%; background:var(--teal); flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
        }

        .auth-right{ flex:1; display:flex; align-items:center; justify-content:center; background:var(--paper); padding:32px; }
        .auth-card{
          width:100%; max-width:400px; background:var(--panel); border:1px solid var(--line);
          border-radius:24px; padding:14px 30px 28px; box-shadow:0 30px 70px -30px rgba(22,52,47,0.28);
        }
        .auth-tabs{ display:flex; background:var(--paper); border-radius:999px; padding:4px; margin:16px 0 22px; }
        .auth-tab{
          flex:1; padding:10px; border:none; background:none; border-radius:999px; cursor:pointer;
          font-family:'Inter',sans-serif; font-size:13.5px; font-weight:600; color:var(--muted);
          transition:background .2s ease, color .2s ease, box-shadow .2s ease;
        }
        .auth-tab.active{ background:#fff; color:var(--ink); box-shadow:0 6px 16px -8px rgba(22,52,47,0.25); }

        .auth-eyebrow{
          display:inline-flex; align-items:center; gap:7px; font-family:'IBM Plex Mono',monospace;
          font-size:10.5px; font-weight:500; letter-spacing:.05em; text-transform:uppercase; color:var(--teal-deep);
          background:#eaf1ef; border:1px solid #d7e6e2; padding:5px 11px; border-radius:999px; margin-bottom:14px;
        }
        .auth-eyebrow .dot{ width:5px; height:5px; border-radius:50%; background:var(--teal); }
        .auth-title{ font-family:'Fraunces',serif; font-weight:600; font-size:21px; color:var(--ink); margin:0 0 6px; }
        .auth-sub{ font-size:13px; color:var(--muted); margin:0 0 22px; line-height:1.55; }
        .auth-sub b{ color:var(--teal-deep); cursor:pointer; }

        .auth-stack{ display:grid; gap:11px; }
        .auth-portal{
          display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%;
          padding:15px 17px; border-radius:15px; border:1.5px solid var(--line); background:var(--paper);
          cursor:pointer; text-align:left; font-family:'Inter',sans-serif;
          transition:border-color .2s ease, background .2s ease, transform .18s ease;
        }
        .auth-portal:hover{ border-color:var(--teal); background:#fff; transform:translateY(-1px); }
        .auth-portal .p-label{ font-size:14px; font-weight:700; color:var(--ink); }
        .auth-portal .p-desc{ font-size:11px; color:var(--muted); margin-top:2px; }
        .auth-portal .chev{ color:var(--teal); flex-shrink:0; }

        .auth-back{
          display:inline-flex; align-items:center; gap:5px; background:none; border:none; cursor:pointer;
          font-family:'Inter',sans-serif; font-size:12px; font-weight:600; color:var(--muted); padding:0; margin-bottom:14px;
        }
        .auth-back:hover{ color:var(--teal-deep); }

        .auth-field{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
        .auth-field label{ font-size:12.5px; font-weight:600; color:var(--ink); }
        .auth-input-wrap{ position:relative; display:flex; align-items:center; }
        .auth-input-wrap svg{ position:absolute; left:14px; color:var(--muted); pointer-events:none; }
        .auth-field input{
          width:100%; border:1.5px solid var(--line); border-radius:12px; padding:12px 14px 12px 38px;
          font-size:13.5px; font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
          box-sizing:border-box; transition:border-color .2s ease, background .2s ease;
        }
        .auth-field input:focus{ outline:none; border-color:var(--teal); background:#fff; }

        .auth-btn{
          display:flex; align-items:center; justify-content:center; gap:8px; width:100%;
          padding:13px 18px; border-radius:999px; font-size:14px; font-weight:600;
          font-family:'Inter',sans-serif; cursor:pointer; border:1.5px solid transparent; margin-top:6px;
          transition:transform .18s ease, box-shadow .18s ease, background .2s ease;
        }
        .auth-btn:hover{ transform:translateY(-1px); }
        .auth-btn.primary{ background:var(--teal); color:#fff; }
        .auth-btn.primary:hover{ background:var(--teal-deep); box-shadow:0 14px 26px -12px rgba(28,75,69,0.5); }
        .auth-btn.primary:disabled{ opacity:.6; cursor:default; transform:none; box-shadow:none; }
        .auth-btn.ghost{ background:transparent; color:var(--ink); border-color:var(--line); }
        .auth-btn.ghost:hover{ border-color:var(--teal); color:var(--teal-deep); }

        .auth-error{
          padding:10px 13px; margin-bottom:14px; border-radius:12px; font-size:12.5px;
          background:#fdeeec; color:var(--red); border:1px solid #f3c9c1;
        }
        .auth-note{ font-size:11px; color:var(--muted); margin-top:14px; line-height:1.6; }
        .auth-trust{
          display:flex; align-items:center; justify-content:center; gap:7px; margin:20px 0 0;
          font-size:11px; color:var(--muted); border-top:1px solid var(--line); padding-top:16px;
        }

        @media (max-width: 900px){
          .auth-page{ flex-direction:column; }
          .auth-left{ flex:none; padding:40px 28px; }
          .auth-hero-title{ font-size:26px; }
          .auth-right{ padding:28px; }
        }
      `}</style>
    </div>
  )

  if (mismatch) {
    return (
      <Shell>
        <h2 className="auth-title">Role mismatch</h2>
        <p className="auth-sub">
          You picked <b style={{ cursor: 'default', color: 'var(--ink)' }}>{portal}</b>, but this account is currently a <b style={{ cursor: 'default', color: 'var(--ink)' }}>{mismatch.role}</b>.
          {portal !== 'Patient' && ' An Administrator needs to raise your role in Settings → Users & Roles first.'}
        </p>
        <div className="auth-stack">
          <button className="auth-btn primary" onClick={() => onAuthed(mismatch)}>
            Continue as {mismatch.role}
          </button>
          <button
            className="auth-btn ghost"
            onClick={async () => { await supabase.auth.signOut(); resetToLanding() }}
          >
            Sign out
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {step === 'picker' && (
        <div>
          <div className="auth-eyebrow"><span className="dot" />{userType === 'existing' ? 'Welcome back' : "Let's get you set up"}</div>
          <h2 className="auth-title">{userType === 'existing' ? 'Sign in as:' : 'Sign up as:'}</h2>
          <p className="auth-sub">Choose the portal that matches your role.</p>
          <div className="auth-stack">
            {PORTALS.map((p) => (
              <button key={p.key} className="auth-portal" onClick={() => { setPortal(p.key); setStep('form') }}>
                <div>
                  <div className="p-label">{p.label}</div>
                  <div className="p-desc">{p.desc}</div>
                </div>
                <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'form' && (
        <div>
          <button className="auth-back" onClick={() => setStep('picker')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          <div className="auth-eyebrow"><span className="dot" />{portal}</div>
          <h2 className="auth-title">{userType === 'existing' ? 'Sign in to your account' : 'Create your account'}</h2>
          <p className="auth-sub">
            {userType === 'existing' ? 'New to CareConnect? ' : 'Already have an account? '}
            <b onClick={() => chooseTab(userType === 'existing' ? 'new' : 'existing')}>
              {userType === 'existing' ? 'Create an account' : 'Sign in'}
            </b>
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submit}>
            <div className="auth-field">
              <label>Email address</label>
              <div className="auth-input-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6H20V18H4V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M4 7L12 13L20 7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.7" /></svg>
                <input type="password" required minLength={6} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="auth-btn primary" disabled={loading}>
              {loading ? 'Processing...' : userType === 'existing' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {userType === 'new' && portal !== 'Patient' && (
            <p className="auth-note">
              New accounts start as Patient regardless of the pick above. An Administrator must raise this account
              to {portal} afterward in Settings → Users &amp; Roles.
            </p>
          )}
        </div>
      )}
    </Shell>
  )
}
