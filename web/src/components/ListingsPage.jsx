import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'
import FilterDropdown from './FilterDropdown'
import ListingCard from './ListingCard'

const MATERIAL_OPTIONS = [
  { value: '',            label: 'All materials' },
  { value: 'plastic',     label: `${WASTE_ICONS.plastic} Plastic` },
  { value: 'glass',       label: `${WASTE_ICONS.glass} Glass` },
  { value: 'metal',       label: `${WASTE_ICONS.metal} Metal` },
  { value: 'electronics', label: `${WASTE_ICONS.electronics} Electronics` },
  { value: 'other',       label: `${WASTE_ICONS.other} Other` },
]

const STATUS_OPTIONS = [
  { value: '',                label: 'All statuses' },
  { value: 'available',       label: '🟢 Available' },
  { value: 'sold',            label: '🏷️ Sold' },
  { value: '__negotiating__', label: '🤝 Negotiating' },
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

        <div className="filter-row">
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
        </div>
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
