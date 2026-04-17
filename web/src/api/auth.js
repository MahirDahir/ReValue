import client from './client'

export function getMe() {
  return client.get('/auth/me')
}

export function login(phone, password) {
  const formData = new FormData()
  formData.append('username', phone)
  formData.append('password', password)
  return client.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export function register(name, phone, password) {
  return client.post('/auth/register', { name, phone, password })
}
