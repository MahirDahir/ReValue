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
