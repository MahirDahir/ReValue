import { useState } from 'react'
import { useAppContext } from '../AppContext'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const { setError, setView } = useAppContext()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await register(form.name, form.phone, form.password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="form-container auth-container">
        <div className="auth-logo">
          <h1>♻️</h1>
          <h2>Create Account</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Your name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
              placeholder="+1234567890"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength="6"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Account</button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#888' }}>
          Already have an account?{' '}
          <button className="btn-link" onClick={() => { setError(''); setView('login') }}>Login</button>
        </p>
      </div>
    </div>
  )
}
