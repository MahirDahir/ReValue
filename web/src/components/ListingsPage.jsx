import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'
import FilterDropdown from './FilterDropdown'
import ListingCard from './ListingCard'

const MATERIAL_OPTIONS = [
  { value: '',            label: 'All materials' },
  { value: 'plastic',     label: 'Plastic' },
  { value: 'glass',       label: 'Glass' },
  { value: 'metal',       label: 'Metal' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other',       label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: '',                label: 'All statuses' },
  { value: 'available',       label: 'Available' },
  { value: 'sold',            label: 'Sold' },
  { value: '__negotiating__', label: 'Negotiating' },
]

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
        <div className="listings-controls-inner">
          <span className="listings-title">
            {mode === 'seller' ? 'My Listings' : 'Available Items'}
          </span>

          <div className="listings-filters">
            {(error || success) && (
              <div className={error ? 'error-message' : 'success-message'} style={{ fontSize: '12px', padding: '5px 10px' }}>
                {error || success}
              </div>
            )}

            <FilterDropdown
              label="Material"
              options={MATERIAL_OPTIONS}
              value={activeFilter}
              onChange={onFilter}
            />

            {mode === 'seller' && (
              <FilterDropdown
                label="Status"
                options={STATUS_OPTIONS}
                value={sellerStatusFilter}
                onChange={setSellerStatusFilter}
              />
            )}

            {mode === 'seller' && (
              <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>
                + Add Listing
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="listings-scroll">
        <div className="listings-scroll-inner">
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
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setView('create')}>
                  + Add Your First Listing
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
