import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

const PORTALS = [
  { key: 'Patient', label: 'Patient' },
  { key: 'Doctor', label: 'Doctor' },
  { key: 'Admin', label: 'Admin' },
]

function roleMatches(role, portal) {
  if (portal === 'Admin') return role === 'Admin' || role === 'Receptionist'
  return role === portal
}

export default function AuthFlow({ onAuthed }) {
  const [step, setStep] = useState('landing') // landing | picker | form
  const [userType, setUserType] = useState(null) // existing | new
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
      .insert([{ id: userId, role: 'Patient' }])
      .select()
      .single()
    if (createErr) throw createErr
    return created
  }

  const resetToLanding = () => {
    setStep('landing'); setUserType(null); setPortal(null); setMismatch(null); setError('')
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

  if (mismatch) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--paper)' }}>
        <div className="panel" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
          <h2 style={{ marginTop: 0 }}>Role mismatch</h2>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
            You picked <b>{portal}</b>, but this account is currently a <b>{mismatch.role}</b>.
            {portal !== 'Patient' && ' An Administrator needs to raise your role in Settings → Users & Roles first.'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => onAuthed(mismatch)}>
              Continue as {mismatch.role}
            </button>
            <button
              className="btn secondary"
              onClick={async () => { await supabase.auth.signOut(); resetToLanding() }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--paper)' }}>
      <div className="panel" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px 0' }}>
            Care<span style={{ color: 'var(--teal)' }}>Connect</span>
          </h1>
          <div className="panel-sub" style={{ margin: 0 }}>Clinic System Access</div>
        </div>

        {step === 'landing' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', marginTop: 0 }}>
              New here, or already have an account?
            </p>
            <button className="btn primary" style={{ justifyContent: 'center' }} onClick={() => { setUserType('existing'); setStep('picker') }}>
              I already have an account
            </button>
            <button className="btn secondary" style={{ justifyContent: 'center' }} onClick={() => { setUserType('new'); setStep('picker') }}>
              I'm new here
            </button>
          </div>
        )}

        {step === 'picker' && (
          <div>
            <button className="btn secondary" style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }} onClick={() => { setStep('landing'); setUserType(null) }}>
              ← Back
            </button>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 0 }}>
              {userType === 'existing' ? 'Sign in as:' : 'Sign up as:'}
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {PORTALS.map((p) => (
                <button
                  key={p.key}
                  className="btn secondary"
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => { setPortal(p.key); setStep('form') }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div>
            <button className="btn secondary" style={{ marginBottom: 16, padding: '6px 12px', fontSize: 12 }} onClick={() => setStep('picker')}>
              ← Back
            </button>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 0 }}>
              {userType === 'existing' ? `Sign in — ${portal}` : `Sign up — ${portal}`}
            </p>

            {error && (
              <div style={{
                padding: 12, marginBottom: 16, borderRadius: 6, fontSize: 14,
                backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field full">
                <label>Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 10, boxSizing: 'border-box' }} />
              </div>
              <div className="field full">
                <label>Password</label>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 10, boxSizing: 'border-box' }} />
              </div>
              <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%', padding: 12, justifyContent: 'center' }}>
                {loading ? 'Processing...' : userType === 'existing' ? 'Sign in' : 'Create Account'}
              </button>
            </form>

            {userType === 'new' && portal !== 'Patient' && (
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
                New accounts start as Patient regardless of the pick above. An Administrator must raise this account
                to {portal} afterward in Settings → Users &amp; Roles.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
