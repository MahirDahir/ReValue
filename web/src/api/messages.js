import client from './client'

export function getChatList() {
  return client.get('/messages/chat-list')
}

export function getListingMessages(listingId, buyerId = null) {
  const params = buyerId ? { buyer_id: buyerId } : {}
  return client.get(`/messages/listing/${listingId}`, { params })
}

export function getListingConversations(listingId) {
  return client.get(`/messages/listing/${listingId}/conversations`)
}

export function getListingUnreadCount(listingId) {
  return client.get(`/messages/listing/${listingId}/unread-count`)
}

export function sendMessage(listingId, receiverId, content) {
  return client.post('/messages/', { listing_id: listingId, receiver_id: receiverId, content })
}
