import { useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { useAppContext } from '../AppContext'
import { LocationPicker, MapRecenter } from './MapPicker'
import { WASTE_ICONS, WASTE_CATEGORIES, WASTE_UNITS } from '../constants/categories'
import * as listingsApi from '../api/listings'

const DEFAULT_COORDS = { latitude: 32.0853, longitude: 34.7818 }
const ALL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

function PickupSlotEditor({ slots, onChange }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ALL_DAYS.map(day => {
        const active = activeSet.has(day)
        const slot   = slots.find(s => s.day === day) || {}
        return (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px', cursor: 'pointer' }}>
              <input type="checkbox" checked={active} onChange={() => toggleDay(day)} />
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </label>
            {active && (
              <>
                <input type="time" value={slot.start} onChange={e => updateTime(day, 'start', e.target.value)} style={{ width: '110px' }} />
                <span style={{ color: '#888' }}>to</span>
                <input type="time" value={slot.end} onChange={e => updateTime(day, 'end', e.target.value)} style={{ width: '110px' }} />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function initialForm(listing) {
  if (!listing) {
    return { title: '', description: '', waste_category: 'plastic', quantity: 1, unit: 'pieces', ...DEFAULT_COORDS, address: '', estimated_price: '', pickup_slots: [] }
  }
  return {
    title: listing.title,
    description: listing.description || '',
    waste_category: listing.waste_category,
    quantity: listing.quantity,
    unit: listing.unit || 'pieces',
    estimated_price: listing.estimated_price ?? '',
    address: listing.address || '',
    latitude: listing.latitude,
    longitude: listing.longitude,
    pickup_slots: listing.pickup_slots || [],
  }
}

export default function ListingForm({ listing, onDone, onCancel }) {
  const isEdit = Boolean(listing)
  const { setView, setError, setSuccess } = useAppContext()
  const [form, setForm] = useState(() => initialForm(listing))
  const [images, setImages] = useState([])

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
          address: form.address || null,
          latitude: form.latitude,
          longitude: form.longitude,
          pickup_slots: form.pickup_slots,
        })
        setSuccess('Listing updated!')
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
        images.forEach(img => formData.append('images', img))
        await listingsApi.createListing(formData)
        setSuccess('Listing created!')
        setForm(initialForm(null))
        setImages([])
        onDone()
        setTimeout(() => { setView('listings'); setSuccess('') }, 1500)
      }
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} listing`)
    }
  }

  const handleBack = () => (isEdit ? onCancel() : setView('listings'))

  return (
    <div className="form-container">
      <button className="btn btn-ghost" onClick={handleBack} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>{isEdit ? 'Edit Listing' : 'Add Listing'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={form.title} onChange={set('title')} required placeholder="e.g., 50 kg of scrap metal" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={set('description')} placeholder="Describe the material, condition, etc." />
        </div>
        <div className="form-group">
          <label>Waste Category</label>
          <select value={form.waste_category} onChange={set('waste_category')}>
            {WASTE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{WASTE_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 2 }}>
            <label>Quantity</label>
            <input type="number" min="1" value={form.quantity} onChange={set('quantity')} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Unit</label>
            <select value={form.unit} onChange={set('unit')}>
              {WASTE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Estimated Price ($)</label>
          <input type="number" step="0.01" value={form.estimated_price} onChange={set('estimated_price')} placeholder="Optional" />
        </div>
        <div className="form-group">
          <label>Pickup Availability</label>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            Select days and hours when buyers can pick up. Leave empty to allow any time.
          </p>
          <PickupSlotEditor
            slots={form.pickup_slots}
            onChange={slots => setForm(f => ({ ...f, pickup_slots: slots }))}
          />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" value={form.address} onChange={set('address')} placeholder="Street address for pickup" />
        </div>
        <div className="form-group">
          <label>Location — click the map to {isEdit ? 'update' : 'set'} pickup point</label>
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
            <label>Images</label>
            <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files))} />
          </div>
        )}
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: isEdit ? '8px' : '0' }}>
          {isEdit ? 'Save Changes' : 'Create Listing'}
        </button>
      </form>
    </div>
  )
}
