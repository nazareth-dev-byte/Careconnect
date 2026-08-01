import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPortal, setSelectedPortal] = useState('patient')
  const { role, signOut } = useAuth()

  const handleLoginCheck = (portal) => {
    if (role && role !== portal) {
      alert(`Access denied. Your account role is ${role}, but you tried logging into the ${portal} portal.`)
      signOut()
      return
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert(error.message)
      return
    }
    handleLoginCheck(selectedPortal)
  }

  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        <h2>Clinic System Access</h2>
        <select value={selectedPortal} onChange={(e) => setSelectedPortal(e.target.value)}>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>
        <input 
          type="email" 
          placeholder="Email Address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
        <button type="submit">Sign In</button>
      </form>
    </div>
  )
}