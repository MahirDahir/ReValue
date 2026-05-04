import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ListingForm from './ListingForm'
import { renderWithContext } from '../test/utils'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}))

vi.mock('./MapPicker', () => ({
  LocationPicker: () => null,
  MapRecenter: () => null,
}))

vi.mock('../api/listings', () => ({
  createListing: vi.fn(),
  updateListing: vi.fn(),
}))

import * as listingsApi from '../api/listings'

const defaultProps = {
  listing: null,
  onDone: vi.fn(),
  onCancel: vi.fn(),
}

function uploadFiles(input, files) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

describe('ListingForm image validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an error for an unsupported file type', async () => {
    renderWithContext(<ListingForm {...defaultProps} />)

    const input = document.querySelector('input[type="file"]')
    uploadFiles(input, [new File(['data'], 'photo.jijf', { type: 'application/octet-stream' })])

    await waitFor(() =>
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/photo\.jijf/)).toBeInTheDocument()
  })

  it('clears the error when a valid file is selected after a bad one', async () => {
    renderWithContext(<ListingForm {...defaultProps} />)

    const input = document.querySelector('input[type="file"]')

    uploadFiles(input, [new File(['data'], 'photo.jijf', { type: 'application/octet-stream' })])
    await waitFor(() => expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument())

    uploadFiles(input, [new File(['data'], 'photo.jpg', { type: 'image/jpeg' })])
    await waitFor(() => expect(screen.queryByText(/unsupported file type/i)).not.toBeInTheDocument())
  })

  it('does not show an error for allowed file types', async () => {
    renderWithContext(<ListingForm {...defaultProps} />)

    const input = document.querySelector('input[type="file"]')
    for (const name of ['img.jpg', 'img.jpeg', 'img.png', 'img.webp']) {
      uploadFiles(input, [new File(['data'], name, { type: 'image/jpeg' })])
      expect(screen.queryByText(/unsupported file type/i)).not.toBeInTheDocument()
    }
  })

  it('does not submit the form when an image error is present', async () => {
    renderWithContext(<ListingForm {...defaultProps} />)
    const user = userEvent.setup()

    const input = document.querySelector('input[type="file"]')
    uploadFiles(input, [new File(['data'], 'photo.jijf', { type: 'application/octet-stream' })])
    await waitFor(() => expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText(/scrap metal/i), 'Old pipes')
    await user.click(screen.getByRole('button', { name: /create listing/i }))

    expect(listingsApi.createListing).not.toHaveBeenCalled()
  })
})
