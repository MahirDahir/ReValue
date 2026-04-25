import { screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ListingCard from './ListingCard'
import { renderWithContext } from '../test/utils'

const baseListing = {
  id: 1,
  title: '100 kg of Scrap Glass',
  waste_category: 'glass',
  unit: 'kg',
  quantity: 100,
  status: 'available',
  estimated_price: 25,
  latitude: 32.0853,
  longitude: 34.7818,
  seller_id: 99,
  images: [],
}

const defaultProps = {
  listing: baseListing,
  listingUnreadCount: 0,
  chatUnreadCount: 0,
  getLocationDisplay: () => 'Tel Aviv, Israel',
  suggestPrice: {},
  setSuggestPrice: vi.fn(),
  onChat: vi.fn(),
  onConversations: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onSendPriceSuggestion: vi.fn(),
}

describe('ListingCard', () => {
  it('renders listing title and price', () => {
    renderWithContext(<ListingCard {...defaultProps} />)
    expect(screen.getByText('100 kg of Scrap Glass')).toBeInTheDocument()
    expect(screen.getByText('$25')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderWithContext(<ListingCard {...defaultProps} />)
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('renders waste category and quantity/unit in meta row', () => {
    const { container } = renderWithContext(<ListingCard {...defaultProps} />)
    const metaRow = container.querySelector('.listing-meta-row')
    expect(metaRow).toHaveTextContent(/glass/i)
    expect(metaRow).toHaveTextContent('100 kg')
  })

  it('renders location', () => {
    renderWithContext(<ListingCard {...defaultProps} />)
    expect(screen.getByText(/tel aviv/i)).toBeInTheDocument()
  })

  it('does not show seller actions for buyer mode (default)', () => {
    renderWithContext(<ListingCard {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /chats/i })).not.toBeInTheDocument()
  })

  it('shows sold status when listing is sold', () => {
    const soldListing = { ...baseListing, status: 'sold' }
    renderWithContext(<ListingCard {...defaultProps} listing={soldListing} />)
    expect(screen.getByText('Sold')).toBeInTheDocument()
  })
})
