import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { useAppContext } from './AppContext'
import { useAuth } from './hooks/useAuth'
import { useListings } from './hooks/useListings'
import { useMessages } from './hooks/useMessages'
import { useGeocoding } from './hooks/useGeocoding'
import * as messagesApi from './api/messages'

import Header from './components/Header'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import ListingsPage from './components/ListingsPage'
import CreateListingForm from './components/CreateListingForm'
import EditListingForm from './components/EditListingForm'
import ConversationsView from './components/ConversationsView'
import ChatView from './components/ChatView'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

function App() {
  const { token, mode, setMode, view, setView, error, success, setError, setSuccess } = useAppContext()
  const { loadUser, logout } = useAuth()
  const {
    listings, activeFilter, listingUnreadCounts,
    allListingsRef, setListingUnreadCounts,
    loadListings, loadSellerUnreadCounts,
    handleFilter, applyFilter,
    removeListing, changeListingStatus,
  } = useListings()
  const {
    messages, messageInput, setMessageInput,
    conversations, setConversations, chatBuyer, setChatBuyer,
    chatListUnreadCounts, setChatListUnreadCounts,
    chatMessagesRef, isAtBottom, hasNewMessages,
    isAtBottomRef,
    loadMessages, loadConversations, loadBuyerUnreadCounts,
    send, notifyBuyersOfSale,
    scrollToBottom, handleChatScroll, resetChat,
  } = useMessages()
  const { fetchLocationName, getLocationDisplay } = useGeocoding()

  const [selectedListing, setSelectedListing]       = useState(null)
  const [sellerStatusFilter, setSellerStatusFilter] = useState('')
  const [suggestPrice, setSuggestPrice]             = useState({})

  // Stale-closure-safe refs for interval callbacks
  const loadListingsRef    = useRef(null)
  const loadMessagesRef    = useRef(null)
  const loadBuyerUnreadRef = useRef(null)
  loadListingsRef.current    = loadListings
  loadBuyerUnreadRef.current = loadBuyerUnreadCounts
  loadMessagesRef.current    = loadMessages

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      const savedMode = localStorage.getItem('mode') || 'buyer'
      loadUser().then(() => loadListings(savedMode === 'seller'))
    }
  }, [token])

  // Buyer: refresh listings + unread every 5 s
  useEffect(() => {
    if (!token || mode !== 'buyer') return
    loadBuyerUnreadCounts(token)
    const id = setInterval(() => {
      loadListingsRef.current?.(false)
      loadBuyerUnreadRef.current?.(token)
    }, 5000)
    return () => clearInterval(id)
  }, [token, mode])

  // Seller: refresh unread counts every 3 s while on listings view
  useEffect(() => {
    if (!token || mode !== 'seller' || view !== 'listings') return
    const id = setInterval(() => {
      if (allListingsRef.current.length) loadSellerUnreadCounts(allListingsRef.current)
    }, 3000)
    return () => clearInterval(id)
  }, [token, mode, view])

  // Chat: poll messages every 3 s
  useEffect(() => {
    if (view !== 'chat' || !selectedListing) return
    const buyer = mode === 'seller' ? chatBuyer : null
    const id = setInterval(() => loadMessagesRef.current?.(selectedListing, buyer), 3000)
    return () => clearInterval(id)
  }, [view, selectedListing?.id, chatBuyer?.buyer_id, mode])

  // Geocode listings when the list changes
  useEffect(() => {
    allListingsRef.current.forEach(l => {
      if (l.latitude && l.longitude && !l.address) fetchLocationName(l.latitude, l.longitude)
    })
  }, [listings])

  // ── Handlers ──────────────────────────────────────────────────────
  const toggleMode = () => {
    const next = mode === 'buyer' ? 'seller' : 'buyer'
    setMode(next)
    localStorage.setItem('mode', next)
    setSellerStatusFilter('')
    handleFilter('')
    loadListings(next === 'seller')
    setView('listings')
  }

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    try {
      await removeListing(listingId)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to delete listing') }
  }

  const handleStatusChange = async (listingId, newStatus) => {
    try {
      await changeListingStatus(listingId, newStatus)
      if (newStatus === 'sold') await notifyBuyersOfSale(listingId)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to update status') }
  }

  const openChat = (listing) => {
    setSelectedListing(listing)
    resetChat()
    loadMessages(listing)
    setChatListUnreadCounts(prev => ({ ...prev, [listing.id]: 0 }))
    setView('chat')
  }

  const openConversations = (listing) => {
    setSelectedListing(listing)
    setConversations([])
    loadConversations(listing)
    setView('conversations')
  }

  const openSellerChat = (buyer) => {
    setChatBuyer(buyer)
    resetChat()
    loadMessages(selectedListing, buyer)
    setConversations(prev => prev.map(c => c.buyer_id === buyer.buyer_id ? { ...c, unread_count: 0 } : c))
    setListingUnreadCounts(prev => ({
      ...prev,
      [selectedListing.id]: Math.max(0, (prev[selectedListing.id] || 0) - (buyer.unread_count || 0)),
    }))
    setView('chat')
  }

  const handleChatSend = async (content) => {
    try {
      await send(selectedListing, mode, content)
    } catch {
      setError('Failed to send message')
      throw new Error('send failed')
    }
  }

  const handleChatBack = () => {
    if (mode === 'seller') { setChatBuyer(null); setView('conversations') }
    else { setView('listings'); setSelectedListing(null) }
  }

  const sendPriceSuggestion = async (listing) => {
    const price = suggestPrice[listing.id]
    if (!price) return
    try {
      await messagesApi.sendMessage(listing.id, listing.seller_id, `💰 Price suggestion: $${price}`)
      setSuggestPrice(prev => { const n = { ...prev }; delete n[listing.id]; return n })
      setSuccess('Price suggestion sent!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to send price suggestion') }
  }

  // ── Derived ───────────────────────────────────────────────────────
  const displayListings = mode === 'seller'
    ? listings.filter(l => sellerStatusFilter ? l.status === sellerStatusFilter : true)
    : listings.filter(l => l.status === 'available' || l.status === 'sold')

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className={`app mode-${mode}`}>
      <Header toggleMode={toggleMode} logout={logout} />
      <main className="main-content">

        {view === 'listings' && token && (
          <ListingsPage
            listings={displayListings}
            activeFilter={activeFilter}
            sellerStatusFilter={sellerStatusFilter}
            setSellerStatusFilter={setSellerStatusFilter}
            onFilter={handleFilter}
            listingUnreadCounts={listingUnreadCounts}
            chatListUnreadCounts={chatListUnreadCounts}
            getLocationDisplay={getLocationDisplay}
            suggestPrice={suggestPrice}
            setSuggestPrice={setSuggestPrice}
            onSendPriceSuggestion={sendPriceSuggestion}
            onChat={openChat}
            onConversations={openConversations}
            onEdit={(listing) => setSelectedListing(listing) || setView('edit')}
            onDelete={handleDeleteListing}
            onStatusChange={handleStatusChange}
          />
        )}

        {view !== 'listings' && (
          <div className="view-scroll">
            {error   && <div className="error-message"   style={{ marginBottom: '14px' }}>{error}</div>}
            {success && <div className="success-message" style={{ marginBottom: '14px' }}>{success}</div>}

            {view === 'login'    && <LoginPage />}
            {view === 'register' && <RegisterPage />}

            {view === 'create' && token && (
              <CreateListingForm onCreated={() => loadListings(true)} />
            )}

            {view === 'edit' && selectedListing && (
              <EditListingForm
                listing={selectedListing}
                onSaved={() => { loadListings(true); setTimeout(() => { setView('listings'); setSelectedListing(null) }, 1500) }}
                onCancel={() => { setView('listings'); setSelectedListing(null) }}
              />
            )}

            {view === 'conversations' && selectedListing && (
              <ConversationsView
                listing={selectedListing}
                conversations={conversations}
                onSelectBuyer={openSellerChat}
                onBack={() => { setView('listings'); setSelectedListing(null) }}
              />
            )}

            {view === 'chat' && selectedListing && (
              <ChatView
                listing={selectedListing}
                chatBuyer={chatBuyer}
                messages={messages}
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                chatMessagesRef={chatMessagesRef}
                isAtBottom={isAtBottom}
                hasNewMessages={hasNewMessages}
                scrollToBottom={scrollToBottom}
                handleChatScroll={handleChatScroll}
                onSend={handleChatSend}
                onBack={handleChatBack}
              />
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default App
