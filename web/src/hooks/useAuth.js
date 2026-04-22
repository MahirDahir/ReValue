import { useAppContext } from '../AppContext'
import * as authApi from '../api/auth'

export function useAuth() {
  const { setToken, setUser, setMode, setView, setError } = useAppContext()

  const loadUser = async () => {
    try {
      const res = await authApi.getMe()
      setUser(res.data)
      return res.data
    } catch (err) {
      // Only force logout on 401 (invalid/expired token), not on transient errors
      if (err.response?.status === 401) logout()
      return null
    }
  }

  const login = async (phone, password) => {
    const res = await authApi.login(phone, password)
    const { access_token, user } = res.data
    const mode = localStorage.getItem('mode') || 'buyer'
    localStorage.setItem('token', access_token)
    setToken(access_token)
    setUser(user)
    setMode(mode)
    setView('listings')
  }

  const register = async (name, phone, password) => {
    setError('')
    const res = await authApi.register(name, phone, password)
    setToken(res.data.access_token)
    setUser(res.data.user)
    setMode('buyer')
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('mode', 'buyer')
    setView('listings')
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setMode('buyer')
    localStorage.removeItem('token')
    localStorage.removeItem('mode')
    setView('login')
  }

  return { loadUser, login, register, logout }
}
