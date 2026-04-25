import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'
import ListingCard from './ListingCard'

export default function ListingsPage({
  listings,
  activeFilter,
  sellerStatusFilter,
  setSellerStatusFilter,
  onFilter,
  listingUnreadCounts,
  buyerPendingCounts,
  getLocationDisplay,
  onNegotiate,
  onConversations,
  onEdit,
  onDelete,
  onForceDelete,
  onMarkSoldToBuyer,
}) {
  const { error, success, mode, setView } = useAppContext()

  return (
    <div className="listings-page">
      <div className="listings-controls">
        {(error || success) && (
          <div className={error ? 'error-message' : 'success-message'} style={{ marginBottom: '10px' }}>
            {error || success}
          </div>
        )}
        <div className="page-header">
          <h2>{mode === 'seller' ? 'My Listings' : 'Available Items'}</h2>
          {mode === 'seller' && (
            <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>+ Add Listing</button>
          )}
        </div>

        <div className="filters">
          {[
            { value: '', label: 'All' },
            { value: 'plastic',     label: `${WASTE_ICONS.plastic} Plastic` },
            { value: 'glass',       label: `${WASTE_ICONS.glass} Glass` },
            { value: 'metal',       label: `${WASTE_ICONS.metal} Metal` },
            { value: 'electronics', label: `${WASTE_ICONS.electronics} Electronics` },
            { value: 'other',       label: `${WASTE_ICONS.other} Other` },
          ].map(f => (
            <button
              key={f.value}
              className={`filter-btn ${activeFilter === f.value ? 'active' : ''}`}
              onClick={() => onFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {mode === 'seller' && (
          <div className="filters" style={{ marginTop: '8px', marginBottom: '4px' }}>
            {[
              { value: '',                 label: 'All' },
              { value: 'available',        label: '🟢 Available' },
              { value: 'sold',             label: '🏷️ Sold' },
              { value: '__negotiating__',  label: '🤝 Negotiating' },
            ].map(f => (
              <button
                key={f.value}
                className={`filter-btn ${sellerStatusFilter === f.value ? 'active' : ''}`}
                onClick={() => setSellerStatusFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="listings-scroll">
        <div className="listings-grid">
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              listingUnreadCount={listingUnreadCounts[listing.id] || 0}
              buyerPendingCount={buyerPendingCounts?.[listing.id] || 0}
              getLocationDisplay={getLocationDisplay}
              onNegotiate={onNegotiate}
              onConversations={onConversations}
              onEdit={onEdit}
              onDelete={onDelete}
              onForceDelete={onForceDelete}
              onMarkSoldToBuyer={onMarkSoldToBuyer}
            />
          ))}
        </div>

        {listings.length === 0 && (
          <div className="empty-state">
            <p>{mode === 'seller' ? 'No listings yet.' : 'No items available right now.'}</p>
            {mode === 'seller' && (
              <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setView('create')}>
                + Add Your First Listing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
