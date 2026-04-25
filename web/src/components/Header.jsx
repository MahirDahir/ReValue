import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../AppContext'

export default function Header({ toggleMode, logout, onNegotiations, buyerPendingTotal, sellerPendingTotal }) {
  const { token, user, mode, setView } = useAppContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const pendingTotal = mode === 'buyer' ? buyerPendingTotal : sellerPendingTotal

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    if (window.confirm('Are you sure you want to log out?')) logout()
  }

  const handleToggleMode = () => {
    setMenuOpen(false)
    toggleMode()
  }

  const handleProfile = () => {
    setMenuOpen(false)
    setView('profile')
  }

  return (
    <header className="header">
      <h1 className="logo" onClick={() => token && setView('listings')} style={{ cursor: token ? 'pointer' : 'default' }}>
        ♻️ ReValue
      </h1>

      <div className="nav-buttons">
        {token ? (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('listings')}>
              Listings
            </button>

            <button className="btn btn-ghost btn-sm btn-with-badge" onClick={onNegotiations}>
              🤝 Negotiations
              {pendingTotal > 0 && <span className="badge">{pendingTotal}</span>}
            </button>

            <div className="user-menu-wrap" ref={menuRef}>
              <button
                className={`user-menu-btn ${menuOpen ? 'open' : ''}`}
                onClick={() => setMenuOpen(v => !v)}
              >
                <span className="user-menu-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
                <span className="user-menu-name">{user?.name || '...'}</span>
                <span className="user-menu-caret">{menuOpen ? '▲' : '▼'}</span>
              </button>

              {menuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-menu-role">{mode === 'buyer' ? '🛒 Buyer mode' : '🏪 Seller mode'}</div>
                  </div>
                  <button className="user-menu-item" onClick={handleToggleMode}>
                    {mode === 'buyer' ? '🏪 Switch to Seller' : '🛒 Switch to Buyer'}
                  </button>
                  <button className="user-menu-item" onClick={handleProfile}>
                    👤 My Profile
                  </button>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item user-menu-item--danger" onClick={handleLogout}>
                    ⬅️ Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => setView('login')}>Login</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('register')}>Register</button>
          </>
        )}
      </div>
    </header>
  )
}
