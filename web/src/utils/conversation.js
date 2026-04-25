export function displayStatus(conv, userId) {
  if (conv.listing_removed) return 'listing_removed'
  // Winning buyer's conversation (contact_revealed + listing sold)
  if (
    conv.status === 'contact_revealed' &&
    conv.listing_status === 'sold' &&
    (String(conv.actual_buyer_id) === String(userId) || String(conv.seller_id) === String(userId))
  ) return 'sold'
  // Seller-cancelled conversations due to item being sold (cancelled by seller when listing is sold)
  if (
    conv.status === 'cancelled' &&
    conv.listing_status === 'sold' &&
    conv.cancelled_by &&
    String(conv.cancelled_by) === String(conv.seller_id)
  ) return 'sold_to_another'
  return conv.status
}
