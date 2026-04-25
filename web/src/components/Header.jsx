import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAppContext } from '../AppContext'

function IconRecycle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
      <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
      <path d="m14 16-3 3 3 3"/>
      <path d="M8.293 13.596 7.196 9.5 3.1 10.598"/>
      <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/>
      <path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>
    </svg>
  )
}

function IconHandshake() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17 2 2a1 1 0 1 0 3-3"/>
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l1.71 1.71"/>
      <path d="m14 14-2 2"/>
      <path d="M9 9 5.17 5.17a5.79 5.79 0 0 0-.87 7.06l1.71 1.71"/>
      <path d="m9 9 2 2"/>
    </svg>
  )
}

function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/>
      <line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" x2="9" y1="12" y2="12"/>
    </svg>
  )
}

function IconSwitch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 12 5-5-5-5"/><path d="M22 7H9a4 4 0 0 0-4 4v1"/>
      <path d="m7 12-5 5 5 5"/><path d="M2 17h13a4 4 0 0 0 4-4v-1"/>
    </svg>
  )
}

export default function Header({ toggleMode, logout, onNegotiations, buyerPendingTotal, sellerPendingTotal }) {
  const { token, user, mode, setView, view } = useAppContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const pendingTotal = mode === 'buyer' ? buyerPendingTotal : sellerPendingTotal

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

  return (
    <header className="header">
      <div className="header-inner">
        <div
          className="logo"
          onClick={() => token && setView('listings')}
          style={{ cursor: token ? 'pointer' : 'default' }}
        >
          <div className="logo-icon"><IconRecycle /></div>
          ReValue
        </div>

        <div className="nav-buttons">
          {token ? (
            <>
              <button
                className={`btn btn-ghost btn-sm${view === 'listings' ? ' nav-btn-active' : ''}`}
                onClick={() => setView('listings')}
              >
                <IconList />
                <span className="nav-listings-text">Listings</span>
              </button>

              <button
                className="btn btn-ghost btn-sm btn-with-badge"
                onClick={onNegotiations}
              >
                <IconHandshake />
                <span className="nav-listings-text">Negotiations</span>
                {pendingTotal > 0 && <span className="badge">{pendingTotal}</span>}
              </button>

              <div className="user-menu-wrap" ref={menuRef}>
                <button
                  className={`user-menu-btn${menuOpen ? ' open' : ''}`}
                  onClick={() => setMenuOpen(v => !v)}
                >
                  <span className="user-menu-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
                  <span className="user-menu-name">{user?.name || '...'}</span>
                  <span className="user-menu-caret">▼</span>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      className="user-menu-dropdown"
                      initial={{ opacity: 0, scale: 0.96, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -6 }}
                      transition={{ duration: 0.13, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div className="user-menu-header">
                        <div className="user-menu-email">{user?.name}</div>
                        <div className="user-menu-role">{mode === 'buyer' ? 'Buyer mode' : 'Seller mode'}</div>
                      </div>
                      <button className="user-menu-item" onClick={() => { setMenuOpen(false); toggleMode() }}>
                        <IconSwitch />
                        {mode === 'buyer' ? 'Switch to Seller' : 'Switch to Buyer'}
                      </button>
                      <button className="user-menu-item" onClick={() => { setMenuOpen(false); setView('profile') }}>
                        <IconUser />
                        My Profile
                      </button>
                      <div className="user-menu-divider" />
                      <button className="user-menu-item user-menu-item--danger" onClick={handleLogout}>
                        <IconLogout />
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setView('login')}>Sign in</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setView('register')}>Register</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
