import client from './client'

export function getListings(params = {}) {
  return client.get('/listings/', { params })
}

export function getMyListings() {
  return client.get('/listings/mine')
}

export function getListing(id) {
  return client.get(`/listings/${id}`)
}

export function createListing(formData) {
  return client.post('/listings/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function updateListing(id, body) {
  return client.put(`/listings/${id}`, body)
}

export function updateListingStatus(id, newStatus) {
  const formData = new FormData()
  formData.append('new_status', newStatus)
  return client.put(`/listings/${id}/status`, formData)
}

export function deleteListing(id) {
  return client.delete(`/listings/${id}`)
}
