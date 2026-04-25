import { useState } from 'react'
import { motion } from 'motion/react'
import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'

const STATUS_LABEL = { available: 'Available', sold: 'Sold', pending: 'Pending' }

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
  onMarkSoldToBuyer,
}) {
  const { token, user, mode } = useAppContext()
  const isSold = listing.status === 'sold'
  const [showSoldPicker, setShowSoldPicker] = useState(false)
  const [soldBuyers, setSoldBuyers]         = useState(null)
  const [loadingBuyers, setLoadingBuyers]   = useState(false)
  const [activeNegCount, setActiveNegCount] = useState(null)
  const [lightbox, setLightbox]             = useState(false)

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

  return (
    <motion.div
      className="listing-card"
      style={{ opacity: mode === 'buyer' && isSold ? 0.65 : 1 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Image */}
      <div className="listing-image-wrap">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="listing-image"
            style={{ cursor: 'zoom-in' }}
            onClick={() => setLightbox(true)}
          />
        ) : (
          <div className="listing-image no-image">
            {WASTE_ICONS[listing.waste_category] || '📦'}
          </div>
        )}

        {listing.estimated_price && (
          <span className="listing-price-badge">${listing.estimated_price}</span>
        )}

        <div className="listing-status-badge">
          <span className={`status status-${listing.status}`}>
            {STATUS_LABEL[listing.status] || listing.status}
          </span>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out',
          }}
        >
          <img
            src={listing.images[0]}
            alt={listing.title}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '10px', objectFit: 'contain', cursor: 'default' }}
          />
        </div>
      )}

      {/* Info */}
      <div className="listing-info">
        <h3 className="listing-title">{listing.title}</h3>

        <div className="listing-meta-row">
          <span>{listing.waste_category.charAt(0).toUpperCase() + listing.waste_category.slice(1)}</span>
          <span className="meta-sep">·</span>
          <span>{listing.quantity} {listing.unit}</span>
        </div>

        {mode === 'buyer' && listing.seller_name && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{listing.seller_name}</p>
        )}

        <p className="listing-location">{getLocationDisplay(listing)}</p>

        {listing.latitude && listing.longitude && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}&zoom=15`}
            target="_blank"
            rel="noopener noreferrer"
            className="listing-map-link"
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

        {/* Buyer actions */}
        {mode === 'buyer' && token && listing.seller_id !== user?.id && !isSold && (
          <div className="listing-actions">
            <button className="btn btn-primary btn-sm btn-with-badge" style={{ flex: 1 }} onClick={() => onNegotiate(listing)}>
              Negotiate
              {buyerPendingCount > 0 && <span className="badge">{buyerPendingCount}</span>}
            </button>
          </div>
        )}

        {/* Seller actions */}
        {mode === 'seller' && listing.seller_id === user?.id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm btn-with-badge" style={{ flex: 1 }} onClick={() => onConversations(listing)}>
                Negotiations
                {listingUnreadCount?.your_turn > 0 && (
                  <span className="badge">{listingUnreadCount.your_turn}</span>
                )}
              </button>
              {listing.status === 'available' && (
                <button className="btn btn-ghost btn-sm" onClick={handleMarkSoldClick} disabled={loadingBuyers}>
                  {loadingBuyers ? '…' : 'Mark Sold'}
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(listing)} title="Edit" style={{ padding: '6px 10px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                </svg>
              </button>
              <button className="btn btn-delete btn-sm" title="Delete" onClick={async () => {
                setActiveNegCount(null)
                const result = await onDelete(listing.id)
                if (typeof result === 'string' && result.startsWith('active_negotiations:')) {
                  setActiveNegCount(parseInt(result.split(':')[1], 10))
                }
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>

            {activeNegCount !== null && (
              <div style={{ padding: '12px', background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--warning)' }}>
                  {activeNegCount} active negotiation{activeNegCount > 1 ? 's' : ''} in progress
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Deleting will cancel all open negotiations and notify buyers.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-danger btn-sm" onClick={async () => { setActiveNegCount(null); await onForceDelete(listing.id) }}>
                    Cancel all &amp; delete
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveNegCount(null)}>Keep</button>
                </div>
              </div>
            )}

            {showSoldPicker && (
              <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>Who bought this?</div>
                {soldBuyers && soldBuyers.length === 0 ? (
                  <>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      No buyers have reached the contact-sharing stage yet.
                    </p>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowSoldPicker(false); setSoldBuyers(null) }}>Close</button>
                  </>
                ) : (
                  <>
                    {soldBuyers?.map(b => (
                      <div key={b.conversation_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.buyer_name}</div>
                          {b.agreed_price && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>${b.agreed_price}</div>}
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => confirmSold(b.conversation_id)}>Select</button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: '10px' }} onClick={() => { setShowSoldPicker(false); setSoldBuyers(null) }}>Cancel</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
