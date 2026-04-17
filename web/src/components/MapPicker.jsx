import { useEffect } from 'react'
import { useMapEvents, useMap } from 'react-leaflet'

export function LocationPicker({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export function MapRecenter({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (lat && lng) map.setView([lat, lng], map.getZoom()) }, [lat, lng])
  return null
}
