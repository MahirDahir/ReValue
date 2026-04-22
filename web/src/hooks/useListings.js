import { useState, useRef } from 'react'
import { useAppContext } from '../AppContext'
import * as listingsApi from '../api/listings'
import * as convApi from '../api/conversations'

export function useListings() {
  const { setError, setSuccess } = useAppContext()
  const [allListings, setAllListings]                 = useState([])
  const [listings, setListings]                       = useState([])
  const [activeFilter, setActiveFilter]               = useState('')
  const [listingUnreadCounts, setListingUnreadCounts]   = useState({})
  const [buyerPendingCounts, setBuyerPendingCounts]     = useState({})
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
      if (isSeller) loadSellerUnreadCounts()
      else loadBuyerPendingCounts()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load listings')
    }
  }

  const loadSellerUnreadCounts = async () => {
    try {
      const res = await convApi.getPendingCounts()
      setListingUnreadCounts(res.data)
    } catch { /* non-fatal */ }
  }

  const loadBuyerPendingCounts = async () => {
    try {
      const res = await convApi.getBuyerPendingCounts()
      setBuyerPendingCounts(res.data)
    } catch { /* non-fatal */ }
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
    allListings, listings, activeFilter, listingUnreadCounts, buyerPendingCounts,
    allListingsRef,
    loadListings, loadSellerUnreadCounts, loadBuyerPendingCounts,
    handleFilter, applyFilter,
    removeListing, changeListingStatus,
  }
}
