import client from './client'

export const startWithPrice = (listingId, price) =>
  client.post('/conversations/start', { listing_id: listingId, price })

export const getMyListingConversation = (listingId) =>
  client.get(`/conversations/my-for-listing/${listingId}`)

export const getConversation = (convId) =>
  client.get(`/conversations/${convId}`)

export const getMyConversations = () =>
  client.get('/conversations/mine')

export const getListingConversations = (listingId) =>
  client.get(`/conversations/listing/${listingId}`)

export const getContactsRevealed = (listingId) =>
  client.get(`/conversations/contacts-revealed/${listingId}`)

export const doAction = (convId, action, value = null) =>
  client.post(`/conversations/${convId}/action`, { action, value })

export const markSeen = (convId) =>
  client.post(`/conversations/${convId}/seen`)

export const getContact = (convId) =>
  client.get(`/conversations/${convId}/contact`)

export const getPendingCounts = () =>
  client.get('/conversations/pending-counts')

export const getBuyerPendingCounts = () =>
  client.get('/conversations/buyer-pending-counts')

export const markSoldToBuyer = (listingId, conversationId) =>
  client.post(`/conversations/listing/${listingId}/mark-sold`, { conversation_id: conversationId })
