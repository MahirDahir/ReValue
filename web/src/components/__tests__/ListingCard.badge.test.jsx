/**
 * Regression tests for listing card badge field mapping.
 *
 * The card badge must use the `unseen` field, not `your_turn`.
 * `unseen` drops to 0 when the user opens the conversation (mark_seen).
 * `your_turn` stays True while it's the user's turn to act, even after viewing.
 *
 * These tests prevent the bug: "badge stays on item after viewing conversation".
 */
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import ListingCard from '../ListingCard'
import { renderWithContext } from '../../test/utils'

const SELLER_ID = 'seller-1'

const buyerListing = {
  id: 'listing-1',
  title: 'Test Listing',
  waste_category: 'plastic',
  quantity: 10,
  unit: 'kg',
  status: 'available',
  seller_id: SELLER_ID,
  seller_name: 'Seller',
  latitude: 32.08,
  longitude: 34.78,
  images: [],
}

const sellerListing = { ...buyerListing }

const noop = () => {}
const noopAsync = async () => {}

const defaultProps = {
  getLocationDisplay: () => 'Tel Aviv',
  onNegotiate: noop,
  onConversations: noop,
  onEdit: noop,
  onDelete: noopAsync,
  onForceDelete: noopAsync,
  onMarkSoldToBuyer: { fetchBuyers: noopAsync, confirm: noopAsync },
}

const buyerUser  = { id: 'buyer-1',  name: 'Buyer' }
const sellerUser = { id: SELLER_ID,  name: 'Seller' }

// ── Buyer card badge ──────────────────────────────────────────────────────────

describe('ListingCard buyer badge', () => {
  it('shows badge count when buyerPendingCount > 0', () => {
    renderWithContext(
      <ListingCard {...defaultProps} listing={buyerListing} listingUnreadCount={0} buyerPendingCount={2} />,
      { user: buyerUser, mode: 'buyer' }
    )
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('hides badge when buyerPendingCount is 0', () => {
    const { container } = renderWithContext(
      <ListingCard {...defaultProps} listing={buyerListing} listingUnreadCount={0} buyerPendingCount={0} />,
      { user: buyerUser, mode: 'buyer' }
    )
    expect(container.querySelectorAll('.badge').length).toBe(0)
  })

  it('badge absent when unseen=0 even if your_turn would be >0', () => {
    // Regression: card receives buyerPendingCount derived from `unseen` (not `your_turn`).
    // Passing 0 means the buyer already viewed — no badge should appear.
    const { container } = renderWithContext(
      <ListingCard {...defaultProps} listing={buyerListing} listingUnreadCount={0} buyerPendingCount={0} />,
      { user: buyerUser, mode: 'buyer' }
    )
    expect(container.querySelectorAll('.badge').length).toBe(0)
  })
})

// ── Seller card badge ─────────────────────────────────────────────────────────

describe('ListingCard seller badge', () => {
  it('shows badge when listingUnreadCount.unseen > 0', () => {
    renderWithContext(
      <ListingCard {...defaultProps} listing={sellerListing} listingUnreadCount={{ unseen: 3, your_turn: 3 }} buyerPendingCount={0} />,
      { user: sellerUser, mode: 'seller' }
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides badge when unseen=0 even if your_turn > 0', () => {
    // Regression: seller opens negotiations (mark_seen fires) -> unseen drops to 0.
    // Badge must clear even though your_turn stays >0 (conversations still need action).
    renderWithContext(
      <ListingCard {...defaultProps} listing={sellerListing} listingUnreadCount={{ unseen: 0, your_turn: 5 }} buyerPendingCount={0} />,
      { user: sellerUser, mode: 'seller' }
    )
    const negButton = screen.getByRole('button', { name: /negotiations/i })
    expect(negButton.querySelector('.badge')).toBeNull()
  })

  it('hides badge when listingUnreadCount is falsy', () => {
    renderWithContext(
      <ListingCard {...defaultProps} listing={sellerListing} listingUnreadCount={0} buyerPendingCount={0} />,
      { user: sellerUser, mode: 'seller' }
    )
    const negButton = screen.getByRole('button', { name: /negotiations/i })
    expect(negButton.querySelector('.badge')).toBeNull()
  })
})
