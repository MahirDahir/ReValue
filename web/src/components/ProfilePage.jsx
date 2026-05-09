import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'
import * as usersApi from '../api/users'

const BUSINESS_TYPES = ['contractor', 'dealer', 'factory', 'other']

export default function ProfilePage({ onBack }) {
  const { user, setUser } = useAppContext()
  const { t } = useTranslation()
  const [form, setForm]             = useState({ old_password: '', new_password: '', confirm: '' })
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [bizForm, setBizForm]       = useState({ business_name: user?.business_name || '', business_type: user?.business_type || '' })
  const [bizError, setBizError]     = useState('')
  const [bizSuccess, setBizSuccess] = useState('')
  const [bizLoading, setBizLoading] = useState(false)

  const handleBizSave = async (e) => {
    e.preventDefault()
    setBizError('')
    setBizSuccess('')
    setBizLoading(true)
    try {
      const res = await usersApi.updateBusinessProfile({
        business_name: bizForm.business_name.trim() || null,
        business_type: bizForm.business_type || null,
      })
      setBizSuccess(t('profile.businessSaved'))
      if (setUser) setUser(u => ({ ...u, business_name: res.data.business_name, business_type: res.data.business_type, is_verified: res.data.is_verified }))
      setTimeout(() => setBizSuccess(''), 3000)
    } catch (err) {
      setBizError(err.response?.data?.detail || t('profile.businessFailed'))
    } finally {
      setBizLoading(false)
    }
  }

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

      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: '#333' }}>🏢 {t('profile.businessProfile')}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{t('profile.businessProfileHint')}</p>

      {bizError   && <div className="error-message"   style={{ marginBottom: '14px' }}>{bizError}</div>}
      {bizSuccess && <div className="success-message" style={{ marginBottom: '14px' }}>{bizSuccess}</div>}

      {user?.is_verified && (
        <div style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--primary-text)', fontSize: '13px' }}>{t('profile.isVerified')}</div>
      )}

      <form onSubmit={handleBizSave} style={{ marginBottom: '32px' }}>
        <div className="form-group">
          <label>{t('profile.businessNameLabel')}</label>
          <input
            type="text"
            value={bizForm.business_name}
            onChange={e => setBizForm(f => ({ ...f, business_name: e.target.value }))}
            placeholder={t('profile.businessNamePlaceholder')}
            maxLength={255}
          />
        </div>
        <div className="form-group">
          <label>{t('profile.businessTypeLabel')}</label>
          <select value={bizForm.business_type} onChange={e => setBizForm(f => ({ ...f, business_type: e.target.value }))}>
            <option value="">{t('profile.businessTypeNone')}</option>
            {BUSINESS_TYPES.map(type => (
              <option key={type} value={type}>{t(`profile.businessTypes.${type}`)}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={bizLoading}>
          {bizLoading ? t('common.saving') : t('profile.businessSaveBtn')}
        </button>
      </form>

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
