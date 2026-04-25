import client from './client'

export function getUserProfile(id) {
  return client.get(`/users/${id}`)
}

export function getUserStats(id) {
  return client.get(`/users/${id}/stats`)
}

export function updateProfile(data) {
  return client.put('/users/me', data)
}

export function changePassword(old_password, new_password) {
  return client.post('/users/me/change-password', { old_password, new_password })
}
