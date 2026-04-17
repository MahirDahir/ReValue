import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from './useAuth'
import { AppProvider } from '../AppContext'

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
}))

import * as authApi from '../api/auth'

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('login stores token in localStorage', async () => {
    authApi.login.mockResolvedValue({
      data: { access_token: 'tok-abc', token_type: 'bearer' },
    })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(() => result.current.login('+1234567890', 'secret'))
    expect(localStorage.getItem('token')).toBe('tok-abc')
  })

  it('logout removes token from localStorage', () => {
    localStorage.setItem('token', 'existing-token')
    const { result } = renderHook(() => useAuth(), { wrapper })
    act(() => result.current.logout())
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('register stores token in localStorage', async () => {
    authApi.register.mockResolvedValue({
      data: { access_token: 'reg-tok', token_type: 'bearer' },
    })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(() => result.current.register('Alice', '+1234567890', 'pass'))
    expect(localStorage.getItem('token')).toBe('reg-tok')
  })
})
