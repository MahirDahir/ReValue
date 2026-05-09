import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'
import { WASTE_ICONS } from '../constants/categories'
import FilterDropdown from './FilterDropdown'
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
  const { t } = useTranslation()

  const materialOptions = [
    { value: '',            label: t('listings.allMaterials') },
    { value: 'plastic',     label: t('categories.plastic') },
    { value: 'glass',       label: t('categories.glass') },
    { value: 'metal',       label: t('categories.metal') },
    { value: 'electronics', label: t('categories.electronics') },
    { value: 'other',       label: t('categories.other') },
  ]

  const statusOptions = [
    { value: '',                label: t('listings.allStatuses') },
    { value: 'available',       label: t('filters.available') },
    { value: 'sold',            label: t('filters.sold') },
    { value: '__negotiating__', label: t('filters.negotiating') },
  ]

  return (
    <div className="listings-page">
      <div className="listings-controls">
        <div className="listings-controls-inner">
          <span className="listings-title">
            {mode === 'seller' ? t('listings.title_seller') : t('listings.title_buyer')}
          </span>

          <div className="listings-filters">
            {(error || success) && (
              <div className={error ? 'error-message' : 'success-message'} style={{ fontSize: '12px', padding: '5px 10px' }}>
                {error || success}
              </div>
            )}

            <FilterDropdown
              label={t('listings.material')}
              options={materialOptions}
              value={activeFilter}
              onChange={onFilter}
            />

            {mode === 'seller' && (
              <FilterDropdown
                label={t('listings.status')}
                options={statusOptions}
                value={sellerStatusFilter}
                onChange={setSellerStatusFilter}
              />
            )}

            {mode === 'seller' && (
              <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>
                {t('listings.addListing')}
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
                buyerPendingCount={buyerPendingCounts?.[listing.id]?.unseen ?? buyerPendingCounts?.[listing.id] ?? 0}
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
              <p>{mode === 'seller' ? t('listings.noListings_seller') : t('listings.noListings_buyer')}</p>
              {mode === 'seller' && (
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setView('create')}>
                  {t('listings.addFirst')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
