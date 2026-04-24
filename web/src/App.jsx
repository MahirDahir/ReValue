import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { useAppContext } from './AppContext'
import { useAuth } from './hooks/useAuth'
import { useListings } from './hooks/useListings'
import { useConversation } from './hooks/useConversation'
import { useGeocoding } from './hooks/useGeocoding'
import { useSSE } from './hooks/useSSE'
import * as convApi from './api/conversations'

import Header from './components/Header'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ListingsPage from './components/ListingsPage'
import ListingForm from './components/ListingForm'
import ConversationView from './components/ConversationView'
import NegotiationsListView from './components/NegotiationsListView'
import HistoryView from './components/HistoryView'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

function App() {
  const { token, user, mode, setMode, view, setView, setError, setSuccess } = useAppContext()
  const { loadUser, logout } = useAuth()
  const {
    listings, activeFilter, listingUnreadCounts, buyerPendingCounts,
    allListingsRef,
    loadListings, loadSellerUnreadCounts, loadBuyerPendingCounts,
    setSellerCounts, setBuyerPendingCounts,
    handleFilter,
    removeListing, changeListingStatus, patchListingStatus,
  } = useListings()
  const {
    conversation, contact, listingConversations, myConversations, contactsRevealed,
    startWithPrice, loadConversation, loadMyListingConversation, doAction,
    markSeen, revealContact, loadListingConversations, loadMyConversations,
    loadContactsRevealed, resetConversation, resetListingConversations, resetMyConversations,
    setConversation,
  } = useConversation()
  const { fetchLocationName, getLocationDisplay } = useGeocoding()

  const [selectedListing, setSelectedListing]       = useState(null)
  const [sellerStatusFilter, setSellerStatusFilter] = useState('')
  const [prevView, setPrevView]                     = useState('listings')
  const [historyTab, setHistoryTab]                 = useState('all')

  // Init
  useEffect(() => {
    if (token) {
      const savedMode = localStorage.getItem('mode') || 'buyer'
      loadUser().then(() => loadListings(savedMode === 'seller'))
    }
  }, [token])

  const selectedListingRef = useRef(null)
  selectedListingRef.current = selectedListing
  const conversationRef = useRef(null)
  conversationRef.current = conversation

  // Buyer: refresh listings every 30s so new/reactivated items appear
  const loadListingsRef   = useRef(null)
  const modeRef           = useRef(null)
  loadListingsRef.current = loadListings
  modeRef.current         = mode
  useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      if (modeRef.current === 'buyer') loadListingsRef.current(false)
    }, 30000)
    return () => clearInterval(id)
  }, [token])

  // SSE: real-time updates replace all polling
  useSSE({
    token,
    onSellerCounts: setSellerCounts,
    onBuyerCounts:  setBuyerPendingCounts,
    onConversation: (data) => {
      if (conversationRef.current?.id === data.id) setConversation(data)
      if (data.listing_status === 'sold' && data.listing_id) {
        patchListingStatus(data.listing_id, 'sold')
      }
    },
    onNotification: (message, listingId) => {
      if (listingId) patchListingStatus(listingId, '_removed')
      setSuccess(message)
      setTimeout(() => setSuccess(''), 5000)
    },
  })

  // Geocode listings
  useEffect(() => {
    allListingsRef.current.forEach(l => {
      if (l.latitude && l.longitude && !l.address) fetchLocationName(l.latitude, l.longitude)
    })
  }, [listings])

  const toggleMode = () => {
    const next = mode === 'buyer' ? 'seller' : 'buyer'
    setMode(next)
    localStorage.setItem('mode', next)
    setSellerStatusFilter('')
    handleFilter('')
    loadListings(next === 'seller', true)
    setView('listings')
  }

  const handleDeleteListing = async (listingId) => {
    try { await removeListing(listingId) }
    catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.startsWith('active_negotiations:')) return detail  // card handles it
      setError(detail || 'Failed to delete listing')
    }
  }

  const handleForceDeleteListing = async (listingId) => {
    try { await removeListing(listingId, true) }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete listing') }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try { await changeListingStatus(listingId, newStatus) }
    catch (err) { setError(err.response?.data?.detail || 'Failed to update status') }
  }

  // Buyer: open a negotiation for a listing
  const openNegotiate = (listing) => {
    setPrevView('listings')
    setSelectedListing(listing)
    resetConversation()
    loadMyListingConversation(listing.id)
    setView('conversation')
  }

  const handleStartWithPrice = async (price) => {
    try {
      await startWithPrice(selectedListing.id, price)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start negotiation')
    }
  }

  // Seller: view all negotiations for a listing
  const openNegotiationsList = async (listing) => {
    setSelectedListing(listing)
    await loadListingConversations(listing.id)
    setView('negotiations')
  }

  const openSellerConversation = async (conv) => {
    setPrevView('negotiations')
    await loadConversation(conv.id)
    setView('conversation')
  }

  const openNegotiations = async () => {
    await loadMyConversations()
    setView('history')
  }

  // Re-open a conversation from history
  const openConversationFromHistory = async (conv) => {
    setPrevView('history')
    setSelectedListing({ id: conv.listing_id, title: conv.listing_title, seller_name: conv.seller_name })
    await loadConversation(conv.id)
    setView('conversation')
  }

  // Mark Sold flow
  const markSoldToBuyer = {
    fetchBuyers: async (listingId) => {
      try {
        const res = await convApi.getContactsRevealed(listingId)
        return res.data
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load buyers')
        return []
      }
    },
    confirm: async (listingId, conversationId) => {
      try {
        await convApi.markSoldToBuyer(listingId, conversationId)
        setSuccess('Listing marked as sold!')
        loadListings(true)
        setTimeout(() => setSuccess(''), 2500)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to mark sold')
      }
    },
  }

  const buyerPendingTotal  = Object.values(buyerPendingCounts).reduce((a, b) => a + b, 0)
  // Header badge = unseen only (notification), not "your turn"
  const sellerPendingTotal = Object.values(listingUnreadCounts).reduce((a, b) => a + (b.unseen ?? b), 0)

  const displayListings = mode === 'seller'
    ? listings.filter(l => {
        if (sellerStatusFilter === '__negotiating__') return listingUnreadCounts[l.id]?.your_turn > 0
        return sellerStatusFilter ? l.status === sellerStatusFilter : true
      })
    : listings.filter(l => l.status === 'available' && l.status !== '_removed' && l.seller_id !== user?.id)

  return (
    <div className={`app mode-${mode}`}>
      <Header
        toggleMode={toggleMode}
        logout={logout}
        onNegotiations={openNegotiations}
        buyerPendingTotal={buyerPendingTotal}
        sellerPendingTotal={sellerPendingTotal}
      />
      <main className="main-content">

        {view === 'listings' && token && (
          <ListingsPage
            listings={displayListings}
            activeFilter={activeFilter}
            sellerStatusFilter={sellerStatusFilter}
            setSellerStatusFilter={setSellerStatusFilter}
            onFilter={handleFilter}
            listingUnreadCounts={listingUnreadCounts}
            buyerPendingCounts={buyerPendingCounts}
            getLocationDisplay={getLocationDisplay}
            onNegotiate={openNegotiate}
            onConversations={openNegotiationsList}
            onEdit={(listing) => { setSelectedListing(listing); setView('edit') }}
            onDelete={handleDeleteListing}
            onForceDelete={handleForceDeleteListing}
            onStatusChange={handleStatusChange}
            onMarkSoldToBuyer={markSoldToBuyer}
          />
        )}

        {view !== 'listings' && (
          <div className="view-scroll">
            {view === 'login'    && <LoginPage />}
            {view === 'register' && <RegisterPage />}

            {view === 'create' && token && (
              <ListingForm onDone={() => loadListings(true)} />
            )}

            {view === 'edit' && selectedListing && (
              <ListingForm
                listing={selectedListing}
                onDone={() => { loadListings(true); setTimeout(() => { setView('listings'); setSelectedListing(null) }, 1500) }}
                onCancel={() => { setView('listings'); setSelectedListing(null) }}
              />
            )}

            {view === 'conversation' && (
              <ConversationView
                conversation={conversation}
                listing={selectedListing}
                contact={contact}
                onStartWithPrice={handleStartWithPrice}
                onAction={doAction}
                onRevealContact={revealContact}
                onMarkSeen={async (convId) => {
                  await markSeen(convId)
                }}
                onBack={() => {
                  if (prevView === 'history') {
                    loadMyConversations()
                    setView('history')
                    resetConversation()
                  } else if (prevView === 'negotiations') {
                    setView('negotiations')
                  } else {
                    setView('listings')
                    setSelectedListing(null)
                    resetConversation()
                  }
                }}
              />
            )}

            {view === 'negotiations' && selectedListing && (
              <NegotiationsListView
                listing={selectedListing}
                conversations={listingConversations}
                onSelect={openSellerConversation}
                onBack={() => { setView('listings'); setSelectedListing(null) }}
              />
            )}

            {view === 'history' && (
              <HistoryView
                conversations={myConversations}
                tab={historyTab}
                setTab={setHistoryTab}
                onBack={() => setView('listings')}
                onOpen={openConversationFromHistory}
              />
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default App
