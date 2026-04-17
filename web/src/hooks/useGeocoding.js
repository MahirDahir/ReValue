import { useState, useRef } from 'react'

export function useGeocoding() {
  const [locationNames, setLocationNames] = useState({})
  const geocodingRef = useRef({}) // keys in-flight

  const fetchLocationName = async (lat, lng) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (geocodingRef.current[key]) return
    geocodingRef.current[key] = true
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const a = data.address || {}
      const parts = [
        a.road || a.neighbourhood || a.suburb || a.quarter,
        a.city || a.town || a.village || a.municipality,
      ].filter(Boolean)
      const name = parts.length
        ? parts.join(', ')
        : (data.display_name?.split(',').slice(0, 2).join(',').trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      setLocationNames(prev => ({ ...prev, [key]: name }))
    } catch {
      geocodingRef.current[key] = false // allow retry
    }
  }

  const getLocationDisplay = (listing) => {
    if (listing.address) return listing.address
    const key = `${listing.latitude?.toFixed(4)},${listing.longitude?.toFixed(4)}`
    return locationNames[key] || `${listing.latitude?.toFixed(4)}, ${listing.longitude?.toFixed(4)}`
  }

  return { locationNames, fetchLocationName, getLocationDisplay }
}
