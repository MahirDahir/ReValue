import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'

export default function ListingCard({
  listing,
  listingUnreadCount,
  chatUnreadCount,
  getLocationDisplay,
  suggestPrice,
  setSuggestPrice,
  onChat,
  onConversations,
  onEdit,
  onDelete,
  onStatusChange,
  onSendPriceSuggestion,
}) {
  const { token, user, mode } = useAppContext()
  const isSold = listing.status === 'sold'

  return (
    <div
      className="listing-card"
      style={mode === 'buyer' && isSold ? { background: '#ececec', opacity: 0.82 } : {}}
    >
      {listing.images?.[0] ? (
        <img src={listing.images[0]} alt={listing.title} className="listing-image" />
      ) : (
        <div className="listing-image no-image">{WASTE_ICONS[listing.waste_category] || '📦'}</div>
      )}

      <div className="listing-info">
        <div className="listing-title-row">
          <h3 className="listing-title">{listing.title}</h3>
          {listing.estimated_price && <span className="price-inline">${listing.estimated_price}</span>}
        </div>

        <div className="listing-meta-row">
          <span>{WASTE_ICONS[listing.waste_category]} {listing.waste_category.charAt(0).toUpperCase() + listing.waste_category.slice(1)}</span>
          <span className="meta-sep">·</span>
          <span>{listing.quantity} {listing.unit}</span>
          <span className="meta-sep">·</span>
          <span className={`status status-${listing.status}`}>{listing.status}</span>
        </div>

        <p className="listing-location">📍 {getLocationDisplay(listing)}</p>

        {listing.latitude && listing.longitude && (
          <a
            href={`https://www.google.com/maps?q=${listing.latitude},${listing.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="listing-map-link"
            title="Open in Google Maps"
          >
            <div className="listing-map">
              <iframe
                title={`map-${listing.id}`}
                src={`https://maps.google.com/maps?q=${listing.latitude},${listing.longitude}&z=15&output=embed`}
                style={{ border: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </a>
        )}

        {/* Buyer actions */}
        {mode === 'buyer' && token && listing.seller_id !== user?.id && (
          <div style={{ marginTop: '8px' }}>
            <div className="listing-actions">
              <button
                className={`btn btn-sm btn-with-badge ${isSold ? 'btn-ghost' : 'btn-primary'}`}
                style={{ flex: 1 }}
                onClick={() => onChat(listing)}
              >
                {isSold ? '📋 View Chat' : '💬 Chat with Seller'}
                {chatUnreadCount > 0 && <span className="badge">{chatUnreadCount}</span>}
              </button>
            </div>
            {!listing.estimated_price && !isSold && (
              suggestPrice[listing.id] !== undefined ? (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Your price ($)"
                    value={suggestPrice[listing.id]}
                    onChange={e => setSuggestPrice(prev => ({ ...prev, [listing.id]: e.target.value }))}
                    style={{ flex: 1, padding: '6px 8px', border: '1.5px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => onSendPriceSuggestion(listing)}>Send</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSuggestPrice(prev => { const n = { ...prev }; delete n[listing.id]; return n })}>✕</button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '6px', width: '100%' }}
                  onClick={() => setSuggestPrice(prev => ({ ...prev, [listing.id]: '' }))}
                >
                  💰 Suggest Price
                </button>
              )
            )}
          </div>
        )}

        {/* Seller actions */}
        {mode === 'seller' && listing.seller_id === user?.id && (
          <div className="listing-actions">
            <button className="btn btn-primary btn-sm btn-with-badge" onClick={() => onConversations(listing)}>
              💬 Chats
              {listingUnreadCount > 0 && <span className="badge">{listingUnreadCount}</span>}
            </button>
            {listing.status === 'available' && (
              <button className="btn btn-danger btn-sm" onClick={() => onStatusChange(listing.id, 'sold')}>
                Mark Sold
              </button>
            )}
            {isSold && (
              <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange(listing.id, 'available')}>
                Reactivate
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(listing)} title="Edit listing">✏️</button>
            <button className="btn btn-delete btn-sm" onClick={() => onDelete(listing.id)} title="Delete listing">🗑️</button>
          </div>
        )}
      </div>
    </div>
  )
}
