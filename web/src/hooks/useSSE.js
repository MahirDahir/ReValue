import { useEffect, useRef } from 'react'

// Derive base URL from VITE_API_URL (strip trailing /api) so SSE works on PaaS
const _apiUrl = import.meta.env.VITE_API_URL || '/api'
const BACKEND_URL = _apiUrl.endsWith('/api') ? _apiUrl.slice(0, -4) : ''

export function useSSE({ token, onSellerCounts, onBuyerCounts, onConversation, onNotification }) {
  const esRef = useRef(null)

  useEffect(() => {
    if (!token) {
      esRef.current?.close()
      esRef.current = null
      return
    }

    const url = `${BACKEND_URL}/api/events/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }
      if (msg.kind === 'seller_counts')    onSellerCounts?.(msg.data)
      else if (msg.kind === 'buyer_counts') onBuyerCounts?.(msg.data)
      else if (msg.kind === 'conversation') onConversation?.(msg.data)
      else if (msg.kind === 'notification') onNotification?.(msg.message, msg.listing_id)
    }

    es.onerror = () => {
      // Browser auto-reconnects on error — nothing needed
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [token])
}
