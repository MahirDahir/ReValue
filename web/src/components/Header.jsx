import { useAppContext } from '../AppContext'

export default function Header({ toggleMode, logout, onNegotiations, buyerPendingTotal, sellerPendingTotal }) {
  const { token, user, mode, setView } = useAppContext()
  const pendingTotal = mode === 'buyer' ? buyerPendingTotal : sellerPendingTotal

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) logout()
  }

  return (
    <header className="header">
      <h1 className="logo" onClick={() => token && setView('listings')} style={{ cursor: token ? 'pointer' : 'default' }}>
        ♻️ ReValue
      </h1>

      <div className="nav-buttons">
        {token ? (
          <>
            <button className="user-info" onClick={() => setView('profile')} title="My Profile">
              <span className="user-name">{user?.name || '...'}</span>
            </button>

            <button className="mode-toggle" onClick={toggleMode}>
              {mode === 'buyer' ? '🛒 Buy' : '🏪 Sell'}
            </button>

            <button className="btn btn-ghost btn-sm nav-browse" onClick={() => setView('listings')}>
              Browse
            </button>

            <button className="btn btn-ghost btn-sm btn-with-badge" onClick={onNegotiations} title="Negotiations">
              🤝
              {pendingTotal > 0 && <span className="badge">{pendingTotal}</span>}
            </button>

            <button className="btn btn-ghost btn-sm nav-logout" onClick={handleLogout}>
              Logout
            </button>
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
