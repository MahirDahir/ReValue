import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'
import * as usersApi from '../api/users'

export default function ProfilePage({ onBack }) {
  const { user } = useAppContext()
  const { t } = useTranslation()
  const [form, setForm]       = useState({ old_password: '', new_password: '', confirm: '' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.new_password !== form.confirm) {
      setError(t('profile.mismatch'))
      return
    }
    if (form.new_password.length < 6) {
      setError(t('profile.tooShort'))
      return
    }
    setLoading(true)
    try {
      await usersApi.changePassword(form.old_password, form.new_password)
      setSuccess(t('profile.success'))
      setForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setError(err.response?.data?.detail || t('profile.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container" style={{ maxWidth: '480px' }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '20px' }}>{t('common.back')}</button>

      <h2 style={{ marginBottom: '24px' }}>👤 {t('profile.title')}</h2>

      <div style={{
        background: 'var(--primary-light)', border: '1.5px solid var(--primary)',
        borderRadius: '12px', padding: '20px', marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, flexShrink: 0,
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#111' }}>{user?.name}</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>📱 {user?.phone}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '120px', background: 'white', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-text)' }}>
              {user?.buyer_rating?.toFixed(1) || '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t('profile.buyerRating')}</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px', background: 'white', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-text)' }}>
              {user?.seller_rating?.toFixed(1) || '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t('profile.sellerRating')}</div>
          </div>
          <div style={{ flex: 1, minWidth: '120px', background: 'white', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-text)' }}>
              {user?.total_transactions || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t('profile.transactions')}</div>
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#333' }}>🔒 {t('profile.changePassword')}</h3>

      {error   && <div className="error-message"   style={{ marginBottom: '14px' }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '14px' }}>{success}</div>}

      <form onSubmit={handleChange}>
        <div className="form-group">
          <label>{t('profile.currentPassword')}</label>
          <input
            type="password"
            value={form.old_password}
            onChange={e => setForm({ ...form, old_password: e.target.value })}
            required
            placeholder={t('profile.currentPasswordPlaceholder')}
          />
        </div>
        <div className="form-group">
          <label>{t('profile.newPassword')}</label>
          <input
            type="password"
            value={form.new_password}
            onChange={e => setForm({ ...form, new_password: e.target.value })}
            required
            placeholder={t('profile.newPasswordPlaceholder')}
            minLength="6"
          />
        </div>
        <div className="form-group">
          <label>{t('profile.confirmPassword')}</label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            required
            placeholder={t('profile.confirmPasswordPlaceholder')}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? t('profile.saving') : t('profile.saveBtn')}
        </button>
      </form>
    </div>
  )
}
