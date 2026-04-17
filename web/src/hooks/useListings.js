import { useState, useRef } from 'react'
import { useAppContext } from '../AppContext'
import * as listingsApi from '../api/listings'
import * as messagesApi from '../api/messages'

export function useListings() {
  const { setError, setSuccess } = useAppContext()
  const [allListings, setAllListings]         = useState([])
  const [listings, setListings]               = useState([])
  const [activeFilter, setActiveFilter]       = useState('')
  const [listingUnreadCounts, setListingUnreadCounts] = useState({})
  const allListingsRef = useRef([])
  allListingsRef.current = allListings

  const applyFilter = (source, filterType) =>
    setListings(filterType ? source.filter(l => l.waste_category === filterType) : source)

  const handleFilter = (type) => {
    setActiveFilter(type)
    applyFilter(allListings, type)
  }

  const loadListings = async (isSeller = false) => {
    try {
      const res = isSeller
        ? await listingsApi.getMyListings()
        : await listingsApi.getListings()
      setAllListings(res.data)
      applyFilter(res.data, activeFilter)
      if (isSeller) loadSellerUnreadCounts(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load listings')
    }
  }

  const loadSellerUnreadCounts = async (listingsArray) => {
    if (!listingsArray?.length) return
    const entries = await Promise.all(
      listingsArray.map(async (l) => {
        try {
          const res = await messagesApi.getListingUnreadCount(l.id)
          return [l.id, res.data.count]
        } catch { return [l.id, 0] }
      })
    )
    setListingUnreadCounts(Object.fromEntries(entries))
  }

  const createListing = async (listingForm, images) => {
    const formData = new FormData()
    Object.entries(listingForm).forEach(([k, v]) => { if (v !== '') formData.append(k, v) })
    images.forEach(img => formData.append('images', img))
    await listingsApi.createListing(formData)
    setSuccess('Listing created!')
    loadListings(true)
  }

  const editListing = async (listingId, editForm) => {
    const body = {
      title: editForm.title,
      description: editForm.description || null,
      waste_category: editForm.waste_category,
      quantity: editForm.quantity,
      unit: editForm.unit,
      estimated_price: editForm.estimated_price !== '' ? parseFloat(editForm.estimated_price) : null,
      address: editForm.address || null,
      latitude: editForm.latitude,
      longitude: editForm.longitude,
    }
    await listingsApi.updateListing(listingId, body)
    setSuccess('Listing updated!')
    loadListings(true)
  }

  const removeListing = async (listingId) => {
    await listingsApi.deleteListing(listingId)
    const updated = allListings.filter(l => l.id !== listingId)
    setAllListings(updated)
    applyFilter(updated, activeFilter)
    setListingUnreadCounts(prev => { const n = { ...prev }; delete n[listingId]; return n })
    setSuccess('Listing deleted')
    setTimeout(() => setSuccess(''), 2000)
  }

  const changeListingStatus = async (listingId, newStatus) => {
    await listingsApi.updateListingStatus(listingId, newStatus)
    const updated = allListings.map(l => l.id === listingId ? { ...l, status: newStatus } : l)
    setAllListings(updated)
    applyFilter(updated, activeFilter)
    setSuccess(`Marked as ${newStatus}`)
    setTimeout(() => setSuccess(''), 2000)
  }

  return {
    allListings, listings, activeFilter, listingUnreadCounts,
    allListingsRef, setListingUnreadCounts,
    loadListings, loadSellerUnreadCounts,
    handleFilter, applyFilter,
    createListing, editListing, removeListing, changeListingStatus,
  }
}
