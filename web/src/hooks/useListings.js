import { useState, useRef } from 'react'
import { useAppContext } from '../AppContext'
import * as listingsApi from '../api/listings'
import * as convApi from '../api/conversations'

export function useListings() {
  const { setError, setSuccess } = useAppContext()
  const [allListings, setAllListings]   = useState([])
  const [listings, setListings]         = useState([])
  const [activeFilter, setActiveFilter] = useState('')

  // Seller: { listing_id: { unseen: N, your_turn: N } }
  const [sellerCounts, setSellerCounts]         = useState({})
  // Buyer: { listing_id: N }
  const [buyerPendingCounts, setBuyerPendingCounts] = useState({})

  const allListingsRef = useRef([])
  allListingsRef.current = allListings
  const buyerPendingCountsRef = useRef({})
  buyerPendingCountsRef.current = buyerPendingCounts
  const sellerCountsRef = useRef({})
  sellerCountsRef.current = sellerCounts

  const applyFilter = (source, filterType) => {
    if (filterType === '__negotiating__') {
      setListings(source.filter(l =>
        buyerPendingCountsRef.current[l.id] > 0 ||
        sellerCountsRef.current[l.id] !== undefined
      ))
    } else {
      setListings(filterType ? source.filter(l => l.waste_category === filterType) : source)
    }
  }

  const handleFilter = (type) => {
    setActiveFilter(type)
    applyFilter(allListings, type)
  }

  const loadListings = async (isSeller = false, clearFirst = false) => {
    const cacheKey = isSeller ? 'listings_seller' : 'listings_buyer'
    if (clearFirst) {
      setAllListings([])
      setListings([])
    } else {
      // Show cached data instantly while fresh data loads
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          setAllListings(parsed)
          applyFilter(parsed, activeFilter)
        }
      } catch { /* ignore parse errors */ }
    }
    try {
      const res = isSeller
        ? await listingsApi.getMyListings()
        : await listingsApi.getListings()
      localStorage.setItem(cacheKey, JSON.stringify(res.data))
      setAllListings(res.data)
      applyFilter(res.data, activeFilter)
      if (isSeller) loadSellerCounts()
      else loadBuyerPendingCounts()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load listings')
    }
  }

  const loadSellerCounts = async () => {
    try {
      const res = await convApi.getPendingCounts()
      setSellerCounts(res.data)
    } catch { /* non-fatal */ }
  }

  // Keep old name as alias so App.jsx callers don't need to change
  const loadSellerUnreadCounts = loadSellerCounts

  const loadBuyerPendingCounts = async () => {
    try {
      const res = await convApi.getBuyerPendingCounts()
      setBuyerPendingCounts(res.data)
    } catch { /* non-fatal */ }
  }

  const removeListing = async (listingId, force = false) => {
    await listingsApi.deleteListing(listingId, force)
    const updated = allListings.filter(l => l.id !== listingId)
    setAllListings(updated)
    applyFilter(updated, activeFilter)
    setSellerCounts(prev => { const n = { ...prev }; delete n[listingId]; return n })
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

  const patchListingStatus = (listingId, newStatus) => {
    setAllListings(prev => {
      const updated = prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l)
      return updated
    })
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l))
  }

  return {
    allListings, listings, activeFilter,
    sellerCounts, buyerPendingCounts,
    // legacy alias still used in App.jsx
    listingUnreadCounts: sellerCounts,
    allListingsRef,
    loadListings, loadSellerCounts, loadSellerUnreadCounts, loadBuyerPendingCounts,
    setSellerCounts, setBuyerPendingCounts,
    handleFilter, applyFilter,
    removeListing, changeListingStatus, patchListingStatus,
  }
}
