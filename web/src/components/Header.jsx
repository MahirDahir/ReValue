import { useAppContext } from '../AppContext'

export default function Header({ toggleMode, logout }) {
  const { token, user, mode, setView } = useAppContext()

  return (
    <header className="header">
      <h1 className="logo">ReValue</h1>
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
}
