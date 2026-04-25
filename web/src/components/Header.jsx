import { useAppContext } from '../AppContext'

export default function Header({ toggleMode, logout, onNegotiations, buyerPendingTotal, sellerPendingTotal }) {
  const { token, user, mode, setView } = useAppContext()
  const pendingTotal = mode === 'buyer' ? buyerPendingTotal : sellerPendingTotal

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) logout()
  }

  return (
    <header className="header">
      <h1 className="logo">♻️ ReValue</h1>
      <div className="nav-buttons">
        {token ? (
          <>
            <button
              className="user-info"
              onClick={() => setView('profile')}
              style={{ cursor: 'pointer', border: '1.5px solid var(--primary)', background: 'var(--primary-light)', borderRadius: '20px', padding: '4px 10px' }}
              title="My Profile"
            >
              <span className="user-name">{user?.name || '...'}</span>
            </button>
            <button className={`mode-toggle mode-${mode}`} onClick={toggleMode}>
              {mode === 'buyer' ? '🛒 Buy' : '🏪 Sell'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('listings')}>Browse</button>
            <button className="btn btn-ghost btn-sm btn-with-badge" onClick={onNegotiations}>
              🤝
              {pendingTotal > 0 && <span className="badge">{pendingTotal}</span>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
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
