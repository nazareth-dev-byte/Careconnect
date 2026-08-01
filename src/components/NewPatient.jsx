import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function NewPatient({ onNavigate }) {
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'Female',
    phoneNumber: '',
    email: '',
    address: '',
    coverageType: 'Self-pay',
    insuranceProvider: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const nameParts = formData.fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const provider = formData.coverageType === 'Self-pay' 
      ? null 
      : formData.insuranceProvider || formData.coverageType

    const { error: supabaseError } = await supabase
      .from('patients')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender.toLowerCase(),
          phone_number: formData.phoneNumber,
          email: formData.email || null,
          address: formData.address || null,
          insurance_provider: provider
        }
      ])

    setLoading(false)

    if (supabaseError) {
      setError(supabaseError.message)
    } else if (onNavigate) {
      onNavigate('patients')
    }
  }

  return (
    <div className="main" style={{ maxWidth: '920px' }}>
      <div className="topbar">
        <h1>New Patient Registration</h1>
        <div className="sub">
          Fields marked <span style={{ color: 'var(--red)', fontWeight: 700 }}>*</span> are required before the record can be saved.
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && (
          <div style={{ color: 'var(--red)', marginBottom: '16px', fontWeight: 600 }}>
            Error: {error}
          </div>
        )}

        <div className="section-title">Personal Details</div>
        <div className="row three">
          <div className="field">
            <label>Full name <span className="req">*</span></label>
            <input 
              type="text" 
              name="fullName"
              required
              value={formData.fullName} 
              onChange={handleChange}
              placeholder="First and last name" 
            />
          </div>
          <div className="field">
            <label>Date of birth <span className="req">*</span></label>
            <input 
              type="date" 
              name="dateOfBirth"
              required
              value={formData.dateOfBirth} 
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>Sex <span className="req">*</span></label>
            <select name="gender" value={formData.gender} onChange={handleChange}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other / Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="section-title">Contact Information</div>
        <div className="row">
          <div className="field">
            <label>Mobile number <span className="req">*</span></label>
            <input 
              type="text" 
              name="phoneNumber"
              required
              value={formData.phoneNumber} 
              onChange={handleChange}
              placeholder="e.g. 09172345566"
            />
          </div>
          <div className="field">
            <label>Email address <span className="opt">(optional)</span></label>
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange}
              placeholder="patient@example.com"
            />
          </div>
        </div>
        <div className="row">
          <div className="field full">
            <label>Home address <span className="opt">(optional)</span></label>
            <input 
              type="text" 
              name="address"
              value={formData.address} 
              onChange={handleChange}
              placeholder="Street, City, Postal code" 
            />
          </div>
        </div>

        <div className="section-title">Insurance / Billing</div>
        <div className="row">
          <div className="field">
            <label>Coverage type <span className="req">*</span></label>
            <div className="radio-group" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <label className="radio-opt">
                <input 
                  type="radio" 
                  name="coverageType" 
                  value="Self-pay" 
                  checked={formData.coverageType === 'Self-pay'}
                  onChange={handleChange} 
                /> Self-pay
              </label>
              <label className="radio-opt">
                <input 
                  type="radio" 
                  name="coverageType" 
                  value="Insurance" 
                  checked={formData.coverageType === 'Insurance'}
                  onChange={handleChange} 
                /> Insurance
              </label>
              <label className="radio-opt">
                <input 
                  type="radio" 
                  name="coverageType" 
                  value="HMO" 
                  checked={formData.coverageType === 'HMO'}
                  onChange={handleChange} 
                /> HMO
              </label>
            </div>
          </div>
          {formData.coverageType !== 'Self-pay' && (
            <div className="field">
              <label>Provider / Policy Name</label>
              <input 
                type="text" 
                name="insuranceProvider"
                value={formData.insuranceProvider} 
                onChange={handleChange}
                placeholder="e.g. Medicare, Blue Cross" 
              />
            </div>
          )}
        </div>

        <div className="actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn secondary" 
            onClick={() => onNavigate && onNavigate('patients')}
          >
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Saving Record...' : 'Save Patient Record'}
          </button>
        </div>
      </form>

      <div className="footer-note">CareConnect Clinic Appointment System — New Patient Registration</div>
    </div>
  )
}