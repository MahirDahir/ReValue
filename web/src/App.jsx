import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

axios.defaults.baseURL = 'http://localhost:8000/api'

const BOTTLE_ICONS = {
  plastic: '🧴',
  glass: '🍾',
  aluminum: '🥫',
  mixed: '♻️',
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState(localStorage.getItem('mode') || 'buyer') // 'buyer' | 'seller'
  const [view, setView] = useState(localStorage.getItem('token') ? 'listings' : 'login')

  // Listings
  const [allListings, setAllListings] = useState([])
  const [listings, setListings] = useState([])
  const [activeFilter, setActiveFilter] = useState('')

  // Seller status filter (All / available / sold / pending)
  const [sellerStatusFilter, setSellerStatusFilter] = useState('')

  // Chat
  const [selectedListing, setSelectedListing] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [conversations, setConversations] = useState([]) // seller: list of buyers
  const [chatBuyer, setChatBuyer] = useState(null)       // seller: selected buyer

  // Forms
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', password: '' })
  const [listingForm, setListingForm] = useState({
    title: '', description: '', bottle_type: 'plastic',
    quantity: 1, latitude: 40.7128, longitude: -74.0060,
    address: '', estimated_price: '',
  })
  const [images, setImages] = useState([])

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Always keep fresh references so intervals never use stale closures
  const loadListingsRef = useRef(null)
  const loadMessagesRef = useRef(null)

  useEffect(() => {
    if (token) {
      const savedMode = localStorage.getItem('mode') || 'buyer'
      loadUser().then(() => {
        loadListings(savedMode === 'seller')
      })
    }
  }, [token])

  // Buyer: auto-refresh every 5 s so new listings and status changes appear promptly
  useEffect(() => {
    if (!token || mode !== 'buyer') return
    const interval = setInterval(() => {
      if (loadListingsRef.current) loadListingsRef.current(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [token, mode])

  // Chat: poll every 3 s while chat is open to show incoming messages from the other party
  useEffect(() => {
    if (view !== 'chat' || !selectedListing) return
    const buyer = mode === 'seller' ? chatBuyer : null
    const interval = setInterval(() => {
      if (loadMessagesRef.current) loadMessagesRef.current(selectedListing, buyer)
    }, 3000)
    return () => clearInterval(interval)
  }, [view, selectedListing?.id, chatBuyer?.buyer_id, mode])

  // ── Data loaders ────────────────────────────────────────────────

  const loadUser = async () => {
    try {
      const res = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      setUser(res.data)
      return res.data
    } catch {
      logout()
      return null
    }
  }

  const loadListings = async (isSeller = false) => {
    try {
      const res = isSeller
        ? await axios.get('/listings/mine', { headers: { Authorization: `Bearer ${token}` } })
        : await axios.get('/listings/')
      setAllListings(res.data)
      applyFilter(res.data, activeFilter)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load listings')
    }
  }
  // Keep ref in sync so the buyer interval never calls a stale version
  loadListingsRef.current = loadListings

  const loadMessages = async (listing, buyer = null) => {
    if (!listing) return
    try {
      const params = buyer ? `?buyer_id=${buyer.buyer_id}` : ''
      const res = await axios.get(`/messages/listing/${listing.id}${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMessages(res.data)
    } catch {
      console.error('Failed to load messages')
    }
  }
  // Keep ref in sync so the chat poll never calls a stale version
  loadMessagesRef.current = loadMessages

  const loadConversations = async (listing) => {
    try {
      const res = await axios.get(`/messages/listing/${listing.id}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConversations(res.data)
    } catch {
      console.error('Failed to load conversations')
    }
  }

  // ── Filter ──────────────────────────────────────────────────────

  const applyFilter = (source, filterType) => {
    setListings(filterType ? source.filter(l => l.bottle_type === filterType) : source)
  }

  const handleFilter = (type) => {
    setActiveFilter(type)
    applyFilter(allListings, type)
  }

  // ── Mode toggle ─────────────────────────────────────────────────

  const toggleMode = () => {
    const next = mode === 'buyer' ? 'seller' : 'buyer'
    setMode(next)
    localStorage.setItem('mode', next)
    setActiveFilter('')
    setSellerStatusFilter('')
    loadListings(next === 'seller')
    setView('listings')
  }

  // ── Auth ────────────────────────────────────────────────────────

  const logout = () => {
    setToken(null)
    setUser(null)
    setMode('buyer')
    setAllListings([])
    setListings([])
    localStorage.removeItem('token')
    localStorage.removeItem('mode')
    setView('login')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const formData = new FormData()
      formData.append('username', loginForm.phone)
      formData.append('password', loginForm.password)
      const res = await axios.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      const savedMode = localStorage.getItem('mode') || 'buyer'
      setToken(res.data.access_token)
      setUser(res.data.user)
      setMode(savedMode)
      localStorage.setItem('token', res.data.access_token)
      setView('listings')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post('/auth/register', registerForm)
      setToken(res.data.access_token)
      setUser(res.data.user)
      setMode('buyer')
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('mode', 'buyer')
      setView('listings')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  // ── Listings ────────────────────────────────────────────────────

  const handleCreateListing = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      Object.entries(listingForm).forEach(([k, v]) => { if (v !== '') formData.append(k, v) })
      images.forEach(img => formData.append('images', img))
      await axios.post('/listings/', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      })
      setSuccess('Listing created!')
      setListingForm({ title: '', description: '', bottle_type: 'plastic', quantity: 1, latitude: 40.7128, longitude: -74.0060, address: '', estimated_price: '' })
      setImages([])
      loadListings(true)
      setTimeout(() => { setView('listings'); setSuccess('') }, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create listing')
    }
  }

  const updateListingStatus = async (listingId, newStatus) => {
    try {
      const formData = new FormData()
      formData.append('status', newStatus)
      await axios.put(`/listings/${listingId}/status`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // Optimistic update — reflect the new status immediately without a re-fetch
      const updated = allListings.map(l => l.id === listingId ? { ...l, status: newStatus } : l)
      setAllListings(updated)
      applyFilter(updated, activeFilter)
      setSuccess(`Marked as ${newStatus}`)
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update status')
    }
  }

  // ── Chat ────────────────────────────────────────────────────────

  // Buyer opens chat with seller
  const openChat = (listing) => {
    setSelectedListing(listing)
    setMessages([])
    loadMessages(listing)
    setView('chat')
  }

  // Seller views list of buyers who messaged about a listing
  const openConversations = (listing) => {
    setSelectedListing(listing)
    setConversations([])
    loadConversations(listing)
    setView('conversations')
  }

  // Seller opens specific chat with a buyer
  const openSellerChat = (buyer) => {
    setChatBuyer(buyer)
    setMessages([])
    loadMessages(selectedListing, buyer)
    setView('chat')
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    const content = messageInput.trim()
    if (!content || !selectedListing) return
    const receiver_id = mode === 'seller'
      ? chatBuyer?.buyer_id
      : selectedListing.seller_id
    setMessageInput('')
    try {
      const res = await axios.post('/messages/', {
        listing_id: selectedListing.id,
        receiver_id,
        content,
      }, { headers: { Authorization: `Bearer ${token}` } })
      // Append the saved message directly from the POST response — no re-fetch needed
      setMessages(prev => [...prev, res.data])
    } catch (err) {
      setMessageInput(content) // restore input on failure
      setError('Failed to send message')
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  const displayListings = mode === 'seller'
    ? listings.filter(l => sellerStatusFilter ? l.status === sellerStatusFilter : true)
    : listings.filter(l => l.status === 'available')

  const renderHeader = () => (
    <header className="header">
      <h1 className="logo">RecycleBottles</h1>
      <div className="nav-buttons">
        {token ? (
          <>
            <div className="user-info">
              <span className="user-name">{user?.name || '...'}</span>
            </div>
            <button className={`mode-toggle mode-${mode}`} onClick={toggleMode}>
              {mode === 'buyer' ? '🛒 Buyer' : '🏪 Seller'}
            </button>
            <button className="btn btn-ghost" onClick={() => setView('listings')}>Browse</button>
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => setView('login')}>Login</button>
            <button className="btn btn-ghost" onClick={() => setView('register')}>Register</button>
          </>
        )}
      </div>
    </header>
  )

  const renderListings = () => (
    <div>
      <div className="page-header">
        <h2>{mode === 'seller' ? 'My Listings' : 'Available Bottles'}</h2>
        {mode === 'seller' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>+ Add Listing</button>
        )}
      </div>

      <div className="filters">
        {[
          { value: '', label: 'All Types' },
          { value: 'plastic', label: `${BOTTLE_ICONS.plastic} Plastic` },
          { value: 'glass', label: `${BOTTLE_ICONS.glass} Glass` },
          { value: 'aluminum', label: `${BOTTLE_ICONS.aluminum} Aluminum` },
          { value: 'mixed', label: `${BOTTLE_ICONS.mixed} Mixed` },
        ].map(f => (
          <button
            key={f.value}
            className={`filter-btn ${activeFilter === f.value ? 'active' : ''}`}
            onClick={() => handleFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {mode === 'seller' && (
        <div className="filters" style={{ marginBottom: '16px' }}>
          {[
            { value: '', label: 'All Status' },
            { value: 'available', label: 'Available' },
            { value: 'sold', label: 'Sold' },
            { value: 'pending', label: 'Pending' },
          ].map(f => (
            <button
              key={f.value}
              className={`filter-btn ${sellerStatusFilter === f.value ? 'active' : ''}`}
              onClick={() => setSellerStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="listings-grid">
        {displayListings.map(listing => (
          <div key={listing.id} className="listing-card">
            {listing.images?.[0] ? (
              <img src={`http://localhost:8000${listing.images[0]}`} alt={listing.title} className="listing-image" />
            ) : (
              <div className="listing-image no-image">
                {BOTTLE_ICONS[listing.bottle_type] || '📦'}
              </div>
            )}
            <div className="listing-info">
              <h3>{listing.title}</h3>
              {listing.description && <p className="listing-desc">{listing.description}</p>}
              <p className="listing-meta">
                {BOTTLE_ICONS[listing.bottle_type]} {listing.bottle_type.charAt(0).toUpperCase() + listing.bottle_type.slice(1)} &bull; Qty: {listing.quantity}
              </p>
              <p className="listing-meta">📍 {listing.address || `${listing.latitude?.toFixed(4)}, ${listing.longitude?.toFixed(4)}`}</p>
              {listing.estimated_price && <p className="price">${listing.estimated_price}</p>}
              <span className={`status status-${listing.status}`}>{listing.status}</span>

              {/* Buyer actions */}
              {mode === 'buyer' && token && listing.seller_id !== user?.id && (
                <div style={{ marginTop: '12px' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => openChat(listing)}>
                    💬 Chat with Seller
                  </button>
                </div>
              )}

              {/* Seller actions */}
              {mode === 'seller' && listing.seller_id === user?.id && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => openConversations(listing)}>
                    💬 View Chats
                  </button>
                  {listing.status === 'available' && (
                    <button className="btn btn-danger" onClick={() => updateListingStatus(listing.id, 'sold')}>
                      Mark Sold
                    </button>
                  )}
                  {listing.status === 'sold' && (
                    <button className="btn btn-ghost" onClick={() => updateListingStatus(listing.id, 'available')}>
                      Reactivate
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayListings.length === 0 && (
        <div className="empty-state">
          <p>{mode === 'seller' ? 'No listings yet.' : 'No bottles available right now.'}</p>
          {mode === 'seller' && (
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setView('create')}>
              + Add Your First Listing
            </button>
          )}
        </div>
      )}
    </div>
  )

  const renderCreateListing = () => (
    <div className="form-container">
      <button className="btn btn-ghost" onClick={() => setView('listings')} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>Add Listing</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleCreateListing}>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={listingForm.title} onChange={e => setListingForm({ ...listingForm, title: e.target.value })} required placeholder="e.g., 50 Plastic Water Bottles" />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={listingForm.description} onChange={e => setListingForm({ ...listingForm, description: e.target.value })} placeholder="Describe condition, size, etc." />
        </div>
        <div className="form-group">
          <label>Bottle Type</label>
          <select value={listingForm.bottle_type} onChange={e => setListingForm({ ...listingForm, bottle_type: e.target.value })}>
            {Object.entries(BOTTLE_ICONS).map(([type, icon]) => (
              <option key={type} value={type}>{icon} {type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Quantity</label>
          <input type="number" value={listingForm.quantity} onChange={e => setListingForm({ ...listingForm, quantity: parseInt(e.target.value) })} min="1" required />
        </div>
        <div className="form-group">
          <label>Estimated Price ($)</label>
          <input type="number" step="0.01" value={listingForm.estimated_price} onChange={e => setListingForm({ ...listingForm, estimated_price: e.target.value })} placeholder="Optional" />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" value={listingForm.address} onChange={e => setListingForm({ ...listingForm, address: e.target.value })} placeholder="Street address for pickup" />
        </div>
        <div className="form-group">
          <label>Coordinates (Lat / Lng)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" step="0.000001" value={listingForm.latitude} onChange={e => setListingForm({ ...listingForm, latitude: parseFloat(e.target.value) })} placeholder="Latitude" required />
            <input type="number" step="0.000001" value={listingForm.longitude} onChange={e => setListingForm({ ...listingForm, longitude: parseFloat(e.target.value) })} placeholder="Longitude" required />
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

  const renderLogin = () => (
    <div className="auth-page">
      <div className="form-container auth-container">
        <div className="auth-logo">
          <h1>♻️</h1>
          <h2>RecycleBottles</h2>
          <p>Buy and sell bottles near you</p>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={loginForm.phone} onChange={e => setLoginForm({ ...loginForm, phone: e.target.value })} required placeholder="+1234567890" autoFocus />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#888' }}>
          Don&apos;t have an account?{' '}
          <button className="btn-link" onClick={() => { setError(''); setView('register') }}>Register</button>
        </p>
      </div>
    </div>
  )

  const renderRegister = () => (
    <div className="auth-page">
      <div className="form-container auth-container">
        <div className="auth-logo">
          <h1>♻️</h1>
          <h2>Create Account</h2>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} required placeholder="Your name" autoFocus />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} required placeholder="+1234567890" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} required minLength="6" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Account</button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#888' }}>
          Already have an account?{' '}
          <button className="btn-link" onClick={() => { setError(''); setView('login') }}>Login</button>
        </p>
      </div>
    </div>
  )

  const renderConversations = () => (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost" onClick={() => { setView('listings'); setSelectedListing(null) }} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>💬 Chats — {selectedListing?.title}</h2>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Select a buyer to view their messages</p>
      {conversations.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No buyers have messaged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {conversations.map(buyer => (
            <div
              key={buyer.buyer_id}
              className="conversation-row"
              onClick={() => openSellerChat(buyer)}
            >
              <div className="conversation-avatar">{buyer.buyer_name.charAt(0).toUpperCase()}</div>
              <div>
                <div className="conversation-name">{buyer.buyer_name}</div>
                <div className="conversation-phone">{buyer.buyer_phone}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: '#aaa', fontSize: '13px' }}>Open →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderChat = () => {
    const backToConversations = mode === 'seller'
    return (
    <div className="form-container" style={{ maxWidth: '700px' }}>
      <button
        className="btn btn-ghost"
        onClick={() => {
          if (backToConversations) { setChatBuyer(null); setView('conversations') }
          else { setView('listings'); setSelectedListing(null) }
        }}
        style={{ marginBottom: '15px' }}
      >← Back</button>
      <h2>💬 {selectedListing?.title}</h2>
      <p style={{ marginBottom: '15px', color: '#888', fontSize: '14px' }}>
        {mode === 'seller'
          ? <>Buyer: <strong>{chatBuyer?.buyer_name}</strong></>
          : <>Seller: <strong>{selectedListing?.seller_name}</strong></>
        }
      </p>
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No messages yet. Say hi!</p>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}>
              <p>{msg.content}</p>
              <small>{new Date(msg.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="chat-input">
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            required
          />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
    )
  }

  return (
    <div className={`app mode-${mode}`}>
      {renderHeader()}
      <main className="main-content">
        {error && view !== 'login' && view !== 'register' && (
          <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>
        )}
        {success && <div className="success-message" style={{ marginBottom: '16px' }}>{success}</div>}

        {view === 'listings' && token && renderListings()}
        {view === 'create' && token && renderCreateListing()}
        {view === 'conversations' && selectedListing && renderConversations()}
        {view === 'chat' && selectedListing && renderChat()}
        {view === 'login' && renderLogin()}
        {view === 'register' && renderRegister()}
      </main>
    </div>
  )
}

export default App
