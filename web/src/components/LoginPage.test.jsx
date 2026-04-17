import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginPage from './LoginPage'
import { renderWithContext } from '../test/utils'

const mockLogin = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockResolvedValue(undefined)
  })

  it('renders phone input, password input, and login button', () => {
    const { container } = renderWithContext(<LoginPage />)
    expect(container.querySelector('input[type="tel"]')).toBeInTheDocument()
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('calls login with phone and password on submit', async () => {
    const { container } = renderWithContext(<LoginPage />)
    const user = userEvent.setup()

    await user.type(container.querySelector('input[type="tel"]'), '+1234567890')
    await user.type(container.querySelector('input[type="password"]'), 'mypassword')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('+1234567890', 'mypassword')
    )
  })

  it('shows error message when login fails', async () => {
    mockLogin.mockRejectedValue({ response: { data: { detail: 'Invalid credentials' } } })
    const { container } = renderWithContext(<LoginPage />)
    const user = userEvent.setup()

    await user.type(container.querySelector('input[type="tel"]'), '+1234567890')
    await user.type(container.querySelector('input[type="password"]'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() =>
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    )
  })
})
