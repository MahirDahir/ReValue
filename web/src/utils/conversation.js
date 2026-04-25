export function displayStatus(conv, userId) {
  if (conv.listing_removed) return 'listing_removed'
  if (
    conv.status === 'contact_revealed' &&
    conv.listing_status === 'sold' &&
    (String(conv.actual_buyer_id) === String(userId) || String(conv.seller_id) === String(userId))
  ) return 'sold'
  return conv.status
}
