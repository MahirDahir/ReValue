import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const { setView } = useAppContext()
  const { register } = useAuth()
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(form.name, form.phone, form.password)
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (detail || t('register.failed'))
      setError(msg)
    }
  }

  return (
    <div className="auth-page">
      <div className="form-container auth-container">
        <div className="auth-logo">
          <h1>♻️</h1>
          <h2>{t('register.title')}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('register.nameLabel')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setError('') }}
              required
              placeholder={t('register.namePlaceholder')}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>{t('register.phoneLabel')}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => { setForm({ ...form, phone: e.target.value }); setError('') }}
              required
              placeholder={t('register.phonePlaceholder')}
            />
          </div>
          <div className="form-group">
            <label>{t('register.passwordLabel')}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => { setForm({ ...form, password: e.target.value }); setError('') }}
              required
              minLength="6"
              placeholder={t('register.passwordPlaceholder')}
            />
          </div>
          {error && <p style={{ color: '#c00', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{t('register.createBtn')}</button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#888' }}>
          {t('register.hasAccount')}{' '}
          <button className="btn-link" onClick={() => { setError(''); setView('login') }}>{t('register.loginLink')}</button>
        </p>
      </div>
    </div>
  )
}
