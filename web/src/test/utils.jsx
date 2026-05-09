import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { AppProvider, useAppContext } from '../AppContext'

// Mirrors the error/success banner that App.jsx renders outside each view
function GlobalMessages() {
  const { error, success } = useAppContext()
  return (
    <>
      {error   && <div role="alert" className="error-message">{error}</div>}
      {success && <div role="status" className="success-message">{success}</div>}
    </>
  )
}

// Injects initial context values (user, mode) after mount so tests can control auth state
function ContextSeeder({ user, mode }) {
  const { setUser, setMode } = useAppContext()
  useEffect(() => {
    if (user) setUser(user)
    if (mode) setMode(mode)
  }, [])
  return null
}

export function renderWithContext(ui, { user, mode, token = 'mock-token' } = {}) {
  // token is read synchronously from localStorage during AppProvider init
  if (token) localStorage.setItem('token', token)
  return render(
    <AppProvider>
      <ContextSeeder user={user} mode={mode} />
      <GlobalMessages />
      {ui}
    </AppProvider>
  )
}
