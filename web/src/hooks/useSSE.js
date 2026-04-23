import { useEffect, useRef } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

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
