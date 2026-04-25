import { useState } from 'react'
import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'

export default function ListingCard({
  listing,
  listingUnreadCount,
  buyerPendingCount,
  getLocationDisplay,
  onNegotiate,
  onConversations,
  onEdit,
  onDelete,
  onForceDelete,
  onStatusChange,
  onMarkSoldToBuyer,
}) {
  const { token, user, mode } = useAppContext()
  const isSold = listing.status === 'sold'
  const [showSoldPicker, setShowSoldPicker]         = useState(false)
  const [soldBuyers, setSoldBuyers]                 = useState(null)
  const [loadingBuyers, setLoadingBuyers]           = useState(false)
  const [activeNegCount, setActiveNegCount]         = useState(null)
  const [lightbox, setLightbox]                     = useState(false)

  const handleMarkSoldClick = async () => {
    setLoadingBuyers(true)
    const buyers = await onMarkSoldToBuyer.fetchBuyers(listing.id)
    setSoldBuyers(buyers)
    setLoadingBuyers(false)
    setShowSoldPicker(true)
  }

  const confirmSold = async (convId) => {
    await onMarkSoldToBuyer.confirm(listing.id, convId)
    setShowSoldPicker(false)
    setSoldBuyers(null)
  }

  const cancelSoldPicker = () => {
    setShowSoldPicker(false)
    setSoldBuyers(null)
  }

  return (
    <div
      className="listing-card"
      style={{
        ...(mode === 'buyer' && isSold ? { background: '#ececec', opacity: 0.82 } : {}),
        ...(lightbox ? { transform: 'none' } : {}),
      }}
    >
      {listing.images?.[0] ? (
        <>
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="listing-image"
            style={{ cursor: 'zoom-in' }}
            onClick={() => setLightbox(true)}
          />
          {lightbox && (
            <div
              onClick={() => setLightbox(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, cursor: 'zoom-out',
              }}
            >
              <img
                src={listing.images[0]}
                alt={listing.title}
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain', cursor: 'default' }}
              />
            </div>
          )}
        </>
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

        {mode === 'buyer' && listing.seller_name && (
          <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 4px' }}>🧑 {listing.seller_name}</p>
        )}
        <p className="listing-location">📍 {getLocationDisplay(listing)}</p>

        {listing.latitude && listing.longitude && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}&zoom=15`}
            target="_blank"
            rel="noopener noreferrer"
            className="listing-map-link"
            title="Open in OpenStreetMap"
          >
            <div className="listing-map">
              <iframe
                title={`map-${listing.id}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.01},${listing.latitude - 0.01},${listing.longitude + 0.01},${listing.latitude + 0.01}&layer=mapnik&marker=${listing.latitude},${listing.longitude}`}
                style={{ border: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                loading="lazy"
              />
            </div>
          </a>
        )}

        {/* Buyer: negotiate button */}
        {mode === 'buyer' && token && listing.seller_id !== user?.id && !isSold && (
          <div className="listing-actions" style={{ marginTop: '8px' }}>
            <button className="btn btn-primary btn-sm btn-with-badge" style={{ flex: 1 }} onClick={() => onNegotiate(listing)}>
              🤝 Negotiate
              {buyerPendingCount > 0 && <span className="badge">{buyerPendingCount}</span>}
            </button>
          </div>
        )}

        {/* Seller actions */}
        {mode === 'seller' && listing.seller_id === user?.id && (
          <div className="listing-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm btn-with-badge" onClick={() => onConversations(listing)}>
                💬 Negotiations
                {listingUnreadCount?.your_turn > 0 && (
                  <span className="badge">{listingUnreadCount.your_turn}</span>
                )}
              </button>
              {listing.status === 'available' && (
                <button className="btn btn-danger btn-sm" onClick={handleMarkSoldClick} disabled={loadingBuyers}>
                  {loadingBuyers ? '…' : 'Mark Sold'}
                </button>
              )}
              {isSold && (
                <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange(listing.id, 'available')}>
                  Reactivate
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(listing)} title="Edit listing">✏️</button>
              <button className="btn btn-delete btn-sm" title="Delete listing" onClick={async () => {
                setActiveNegCount(null)
                const result = await onDelete(listing.id)
                if (typeof result === 'string' && result.startsWith('active_negotiations:')) {
                  setActiveNegCount(parseInt(result.split(':')[1], 10))
                }
              }}>🗑️</button>
            </div>

            {/* Active negotiations warning */}
            {activeNegCount !== null && (
              <div style={{ marginTop: '10px', padding: '12px', background: '#fff3e0', borderRadius: '8px', border: '1px solid #ffb74d' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#e65100' }}>
                  ⚠️ {activeNegCount} active negotiation{activeNegCount > 1 ? 's' : ''} in progress
                </div>
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '10px' }}>
                  Deleting will cancel all open negotiations and notify the buyers.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-danger btn-sm" onClick={async () => {
                    setActiveNegCount(null)
                    await onForceDelete(listing.id)
                  }}>
                    Cancel all &amp; delete
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveNegCount(null)}>
                    Keep listing
                  </button>
                </div>
              </div>
            )}

            {/* Mark Sold — buyer picker */}
            {showSoldPicker && (
              <div style={{ marginTop: '10px', padding: '12px', background: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>Who bought this?</div>
                {soldBuyers && soldBuyers.length === 0 ? (
                  <>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      No buyers have reached the contact-sharing stage yet. You can still mark it sold without selecting a buyer.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => { onStatusChange(listing.id, 'sold'); cancelSoldPicker() }}>Mark Sold anyway</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelSoldPicker}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    {soldBuyers?.map(b => (
                      <div key={b.conversation_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.buyer_name}</div>
                          {b.agreed_price  && <div style={{ fontSize: '12px', color: '#666' }}>💰 ${b.agreed_price}</div>}
                          {b.agreed_pickup && <div style={{ fontSize: '12px', color: '#666' }}>📅 {b.agreed_pickup}</div>}
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => confirmSold(b.conversation_id)}>
                          ✅ This buyer
                        </button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }} onClick={cancelSoldPicker}>Cancel</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
