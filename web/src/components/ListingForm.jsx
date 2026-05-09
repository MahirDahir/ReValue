import { useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'
import { LocationPicker, MapRecenter } from './MapPicker'
import { WASTE_ICONS, WASTE_CATEGORIES, WASTE_UNITS } from '../constants/categories'
import * as listingsApi from '../api/listings'

const DEFAULT_COORDS = { latitude: 32.0853, longitude: 34.7818 }
const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

function PickupSlotEditor({ slots, onChange }) {
  const { t } = useTranslation()
  const activeSet = new Set(slots.map(s => s.day))

  const toggleDay = (day) => {
    if (activeSet.has(day)) {
      onChange(slots.filter(s => s.day !== day))
    } else {
      onChange([...slots, { day, start: '09:00', end: '17:00' }])
    }
  }

  const updateTime = (day, field, value) => {
    onChange(slots.map(s => s.day === day ? { ...s, [field]: value } : s))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {ALL_DAYS.map(day => {
        const active = activeSet.has(day)
        const slot   = slots.find(s => s.day === day) || {}
        return (
          <div
            key={day}
            onClick={() => !active && toggleDay(day)}
            style={{
              border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--primary-light)' : 'var(--surface)',
              padding: '10px 14px',
              cursor: active ? 'default' : 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: active ? 'var(--primary-text)' : 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleDay(day)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                />
                {t(`listingForm.days.${day}`)}
              </label>
              {active && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {slot.start} – {slot.end}
                </span>
              )}
            </div>

            {active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('listingForm.from')}</div>
                  <input
                    type="time"
                    value={slot.start}
                    onChange={e => updateTime(day, 'start', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: 'var(--surface)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('listingForm.to')}</div>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={e => updateTime(day, 'end', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '14px', background: 'var(--surface)' }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function initialForm(listing) {
  if (!listing) {
    return { title: '', description: '', waste_category: 'plastic', quantity: 1, unit: 'pieces', ...DEFAULT_COORDS, address: '', estimated_price: '', quantity_kg: '', price_per_kg: '', pickup_slots: [] }
  }
  return {
    title: listing.title,
    description: listing.description || '',
    waste_category: listing.waste_category,
    quantity: listing.quantity,
    unit: listing.unit || 'pieces',
    estimated_price: listing.estimated_price ?? '',
    quantity_kg: listing.quantity_kg ?? '',
    price_per_kg: listing.price_per_kg ?? '',
    address: listing.address || '',
    latitude: listing.latitude,
    longitude: listing.longitude,
    pickup_slots: listing.pickup_slots || [],
  }
}

export default function ListingForm({ listing, onDone, onCancel }) {
  const isEdit = Boolean(listing)
  const { setView, setError, setSuccess } = useAppContext()
  const { t } = useTranslation()
  const [form, setForm] = useState(() => initialForm(listing))
  const [images, setImages] = useState([])
  const [imageError, setImageError] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEdit) {
        await listingsApi.updateListing(listing.id, {
          title: form.title,
          description: form.description || null,
          waste_category: form.waste_category,
          quantity: parseInt(form.quantity, 10),
          unit: form.unit,
          estimated_price: form.estimated_price !== '' ? parseFloat(form.estimated_price) : null,
          quantity_kg: form.quantity_kg !== '' ? parseFloat(form.quantity_kg) : null,
          price_per_kg: form.price_per_kg !== '' ? parseFloat(form.price_per_kg) : null,
          address: form.address || null,
          latitude: form.latitude,
          longitude: form.longitude,
          pickup_slots: form.pickup_slots,
        })
        setSuccess(t('listingForm.updatedSuccess'))
        onDone()
        setTimeout(() => setSuccess(''), 1500)
      } else {
        const formData = new FormData()
        Object.entries(form).forEach(([k, v]) => {
          if (v === '' || v === null || v === undefined) return
          if (k === 'pickup_slots') {
            formData.append(k, JSON.stringify(v))
          } else {
            formData.append(k, v)
          }
        })
        if (imageError) return
        images.forEach(img => formData.append('images', img))
        await listingsApi.createListing(formData)
        setSuccess(t('listingForm.createdSuccess'))
        setForm(initialForm(null))
        setImages([])
        onDone()
        setTimeout(() => { setView('listings'); setSuccess('') }, 1500)
      }
    } catch (err) {
      setError(err.response?.data?.detail || t(isEdit ? 'listingForm.updateError' : 'listingForm.createError'))
    }
  }

  const handleBack = () => (isEdit ? onCancel() : setView('listings'))

  return (
    <div className="form-container">
      <button className="btn btn-ghost" onClick={handleBack} style={{ marginBottom: '16px' }}>{t('common.back')}</button>
      <h2>{isEdit ? t('listingForm.editTitle') : t('listingForm.addTitle')}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t('listingForm.titleLabel')}</label>
          <input type="text" value={form.title} onChange={set('title')} required placeholder={t('listingForm.titlePlaceholder')} />
        </div>
        <div className="form-group">
          <label>{t('listingForm.descriptionLabel')}</label>
          <textarea value={form.description} onChange={set('description')} placeholder={t('listingForm.descriptionPlaceholder')} />
        </div>
        <div className="form-group">
          <label>{t('listingForm.categoryLabel')}</label>
          <select value={form.waste_category} onChange={set('waste_category')}>
            {WASTE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{WASTE_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 2 }}>
            <label>{t('listingForm.quantityLabel')}</label>
            <input type="number" min="1" value={form.quantity} onChange={set('quantity')} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>{t('listingForm.unitLabel')}</label>
            <select value={form.unit} onChange={set('unit')}>
              {WASTE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>{t('listingForm.priceLabel')}</label>
          <input type="number" step="0.01" min="0" value={form.estimated_price} onChange={set('estimated_price')} placeholder={t('listingForm.pricePlaceholder')} />
        </div>
        <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label>{t('listingForm.weightLabel')}</label>
            <input type="number" step="0.01" min="0" value={form.quantity_kg} onChange={set('quantity_kg')} placeholder={t('listingForm.weightPlaceholder')} />
          </div>
          <div style={{ flex: 1 }}>
            <label>{t('listingForm.pricePerKgLabel')}</label>
            <input type="number" step="0.01" min="0" value={form.price_per_kg} onChange={set('price_per_kg')} placeholder={t('listingForm.pricePerKgPlaceholder')} />
          </div>
        </div>
        {form.quantity_kg !== '' && form.price_per_kg !== '' && parseFloat(form.quantity_kg) > 0 && parseFloat(form.price_per_kg) > 0 && (
          <p style={{ fontSize: '13px', color: 'var(--primary-text)', fontWeight: 600, marginTop: '-8px', marginBottom: '8px' }}>
            {t('listingForm.totalEstimate', { total: (parseFloat(form.quantity_kg) * parseFloat(form.price_per_kg)).toFixed(0) })}
          </p>
        )}
        <div className="form-group">
          <label>{t('listingForm.pickupLabel')}</label>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>{t('listingForm.pickupHint')}</p>
          <PickupSlotEditor
            slots={form.pickup_slots}
            onChange={slots => setForm(f => ({ ...f, pickup_slots: slots }))}
          />
        </div>
        <div className="form-group">
          <label>{t('listingForm.addressLabel')}</label>
          <input type="text" value={form.address} onChange={set('address')} placeholder={t('listingForm.addressPlaceholder')} />
        </div>
        <div className="form-group">
          <label>{isEdit ? t('listingForm.locationLabel_edit') : t('listingForm.locationLabel_create')}</label>
          <div className="create-map">
            <MapContainer center={[form.latitude || DEFAULT_COORDS.latitude, form.longitude || DEFAULT_COORDS.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {form.latitude && form.longitude && <Marker position={[form.latitude, form.longitude]} />}
              <LocationPicker onPick={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
              <MapRecenter lat={form.latitude} lng={form.longitude} />
            </MapContainer>
          </div>
        </div>
        {!isEdit && (
          <div className="form-group">
            <label>{t('listingForm.imagesLabel')}</label>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={e => {
                const ALLOWED = ['jpg', 'jpeg', 'png', 'webp']
                const files = Array.from(e.target.files)
                const bad = files.filter(f => {
                  const ext = f.name.split('.').pop()
                  return !ALLOWED.includes(ext.toLowerCase())
                })
                if (bad.length > 0) {
                  setImageError(t('listingForm.imageError', { files: bad.map(f => f.name).join(', ') }))
                  setImages([])
                  e.target.value = ''
                } else {
                  setImageError('')
                  setImages(files)
                }
              }}
            />
            {imageError && <p style={{ color: 'var(--error, #e53935)', fontSize: '13px', marginTop: '4px' }}>{imageError}</p>}
          </div>
        )}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: isEdit ? '8px' : '0' }}>
          {isEdit ? t('listingForm.saveBtn') : t('listingForm.createBtn')}
        </button>
      </form>
    </div>
  )
}
