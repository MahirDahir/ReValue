import { useState } from 'react'
import { useAppContext } from '../AppContext'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { setError, setView } = useAppContext()
  const { login } = useAuth()
  const [form, setForm] = useState({ phone: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(form.phone, form.password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="form-container auth-container">
        <div className="auth-logo">
          <h1>♻️</h1>
          <h2>ReValue</h2>
          <p>Turn your waste into money</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required
              placeholder="+1234567890"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#888' }}>
          Don&apos;t have an account?{' '}
          <button className="btn-link" onClick={() => { setError(''); setView('register') }}>Register</button>
        </p>
      </div>
    </div>
  )
}
