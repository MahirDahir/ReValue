import { useAppContext } from '../AppContext'

const STATUS_LABELS = {
  price_pending:    'Waiting for offer',
  price_suggested:  '💰 Price offered',
  price_agreed:     '✅ Price agreed',
  pickup_suggested: '📅 Pickup proposed',
  pickup_agreed:    '✅ Pickup agreed',
  contact_revealed: '📱 Contact shared',
  cancelled:        'Cancelled',
}

export default function NegotiationsListView({ listing, conversations, onSelect, onBack }) {
  const { user } = useAppContext()

  const needsAction = (conv) => {
    const s = conv.status
    if (s === 'cancelled' && !conv.seen_by_seller) return true
    if (s === 'price_suggested' && String(conv.price_suggested_by) !== String(user?.id)) return true
    if (s === 'pickup_suggested' && String(conv.pickup_suggested_by) !== String(user?.id)) return true
    return false
  }

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>🤝 Negotiations — {listing?.title}</h2>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Select a buyer to continue</p>
      {conversations.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>No buyers have started a negotiation yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {conversations.map(conv => {
            const cancelled = conv.status === 'cancelled'
            const urgent    = needsAction(conv)
            return (
              <div
                key={conv.id}
                className="conversation-row"
                onClick={() => onSelect(conv)}
                style={{ opacity: cancelled ? 0.7 : 1 }}
              >
                <div className="conversation-avatar" style={urgent ? { background: 'var(--primary)', color: '#fff' } : {}}>
                  {conv.buyer_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="conversation-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {conv.buyer_name}
                    {urgent && <span className="badge" style={{ background: cancelled ? '#b71c1c' : 'var(--primary)', color: '#fff', fontSize: '11px' }}>{cancelled ? 'Withdrew' : 'Action needed'}</span>}
                  </div>
                  <div className="conversation-phone">{STATUS_LABELS[conv.status] || conv.status}</div>
                </div>
                <span style={{ color: '#aaa', fontSize: '13px' }}>Open →</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
