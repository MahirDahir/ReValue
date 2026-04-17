import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [token, setToken]   = useState(localStorage.getItem('token'))
  const [user, setUser]     = useState(null)
  const [mode, setMode]     = useState(localStorage.getItem('mode') || 'buyer')
  const [view, setView]     = useState(localStorage.getItem('token') ? 'listings' : 'login')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  // Auto-dismiss error after 5 s
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 5000)
    return () => clearTimeout(t)
  }, [error])

  return (
    <AppContext.Provider value={{
      token, setToken,
      user, setUser,
      mode, setMode,
      view, setView,
      error, setError,
      success, setSuccess,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}
