import { useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { useAppContext } from '../AppContext'
import { LocationPicker, MapRecenter } from './MapPicker'
import { WASTE_ICONS, WASTE_CATEGORIES, WASTE_UNITS } from '../constants/categories'
import * as listingsApi from '../api/listings'

const DEFAULT_FORM = {
  title: '', description: '', waste_category: 'plastic',
  quantity: 1, unit: 'pieces', latitude: 32.0853, longitude: 34.7818,
  address: '', estimated_price: '',
}

export default function CreateListingForm({ onCreated }) {
  const { setView, setError, setSuccess } = useAppContext()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [images, setImages] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '') formData.append(k, v) })
      images.forEach(img => formData.append('images', img))
      await listingsApi.createListing(formData)
      setSuccess('Listing created!')
      setForm(DEFAULT_FORM)
      setImages([])
      onCreated()
      setTimeout(() => { setView('listings'); setSuccess('') }, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create listing')
    }
  }

  return (
    <div className="form-container">
      <button className="btn btn-ghost" onClick={() => setView('listings')} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>Add Listing</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g., 50 kg of scrap metal — include quantity in title" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the material, condition, preparation, etc." />
        </div>
        <div className="form-group">
          <label>Waste Category</label>
          <select value={form.waste_category} onChange={e => setForm({ ...form, waste_category: e.target.value })}>
            {WASTE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{WASTE_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 2 }}>
            <label>Quantity</label>
            <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          <div style={{ flex: 1 }}>
            <label>Unit</label>
            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              {WASTE_UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Estimated Price ($)</label>
          <input type="number" step="0.01" value={form.estimated_price} onChange={e => setForm({ ...form, estimated_price: e.target.value })} placeholder="Optional" />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address for pickup" />
        </div>
        <div className="form-group">
          <label>Location — click the map to set pickup point</label>
          <div className="create-map">
            <MapContainer center={[form.latitude || 32.0853, form.longitude || 34.7818]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {form.latitude && form.longitude && <Marker position={[form.latitude, form.longitude]} />}
              <LocationPicker onPick={(lat, lng) => setForm(f => ({ ...f, latitude: lat, longitude: lng }))} />
              <MapRecenter lat={form.latitude} lng={form.longitude} />
            </MapContainer>
          </div>
        </div>
        <div className="form-group">
          <label>Images</label>
          <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files))} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Listing</button>
      </form>
    </div>
  )
}
