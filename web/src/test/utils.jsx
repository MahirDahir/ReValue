import { render } from '@testing-library/react'
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

export function renderWithContext(ui) {
  return render(
    <AppProvider>
      <GlobalMessages />
      {ui}
    </AppProvider>
  )
}
