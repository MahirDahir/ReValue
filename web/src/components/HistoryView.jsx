import { useAppContext } from '../AppContext'

const STATUS_LABELS = {
  price_pending:    { label: 'Waiting for offer',    color: '#888',    bg: '#f5f5f5' },
  price_suggested:  { label: '💰 Price offered',     color: '#e65100', bg: '#fff3e0' },
  price_agreed:     { label: '✅ Price agreed',       color: '#2e7d32', bg: '#e8f5e9' },
  pickup_suggested: { label: '📅 Pickup proposed',   color: '#1565c0', bg: '#e3f2fd' },
  pickup_agreed:    { label: '✅ Pickup agreed',      color: '#2e7d32', bg: '#e8f5e9' },
  contact_revealed: { label: '📱 Contact shared',    color: '#6a1b9a', bg: '#f3e5f5' },
  sold:             { label: '🏷️ Sold',              color: '#1b5e20', bg: '#e8f5e9' },
  cancelled:        { label: '❌ Cancelled',          color: '#b71c1c', bg: '#ffebee' },
}

const NEGOTIATED_STATUSES  = ['contact_revealed']
const SOLD_STATUSES        = ['sold']
const DEAD_STATUSES        = ['cancelled']

// Derive a display status for a conversation — sold overrides contact_revealed for the confirmed buyer/seller
function displayStatus(conv, userId) {
  if (
    conv.status === 'contact_revealed' &&
    conv.listing_status === 'sold' &&
    (conv.actual_buyer_id === userId || conv.seller_id === userId)
  ) return 'sold'
  return conv.status
}

function fmtTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function ConvRow({ conv, userId, onOpen }) {
  const ds   = displayStatus(conv, userId)
  const meta = STATUS_LABELS[ds] || { label: ds, color: '#888', bg: '#f5f5f5' }
  return (
    <div
      onClick={() => onOpen?.(conv)}
      style={{
        padding: '14px 16px', background: 'white', borderRadius: '8px',
        border: '1px solid #e0e0e0', marginBottom: '8px',
        cursor: 'pointer',
        opacity: conv.status === 'cancelled' ? 0.7 : 1,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{conv.listing_title || 'Listing'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: meta.color, background: meta.bg, whiteSpace: 'nowrap' }}>
            {meta.label}
          </span>
          {conv.updated_at && (
            <span style={{ fontSize: '10px', color: '#aaa', whiteSpace: 'nowrap' }}>{fmtTime(conv.updated_at)}</span>
          )}
        </div>
      </div>
      {conv.buyer_name && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Buyer: <strong>{conv.buyer_name}</strong></div>}
      {conv.agreed_price  && <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>💰 ${conv.agreed_price}</div>}
      {conv.agreed_pickup && <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>📅 {fmtTime(conv.agreed_pickup)}</div>}
    </div>
  )
}

export default function HistoryView({ conversations, tab, setTab, onBack, onOpen }) {
  const { mode, user } = useAppContext()

  // Only show conversations relevant to the current mode
  const modeConvs = conversations.filter(c =>
    mode === 'buyer' ? c.buyer_id === user?.id : c.seller_id === user?.id
  )

  const negotiated  = modeConvs.filter(c => NEGOTIATED_STATUSES.includes(displayStatus(c, user?.id)))
  const sold        = modeConvs.filter(c => SOLD_STATUSES.includes(displayStatus(c, user?.id)))
  const cancelled   = modeConvs.filter(c => DEAD_STATUSES.includes(c.status))

  const tabs = [
    { key: 'all',        label: `All (${modeConvs.length})` },
    { key: 'negotiated', label: `Negotiated (${negotiated.length})` },
    { key: 'sold',       label: `Sold (${sold.length})` },
    { key: 'cancelled',  label: `Cancelled (${cancelled.length})` },
  ]

  const current = tab === 'all' ? modeConvs : tab === 'negotiated' ? negotiated : tab === 'sold' ? sold : cancelled

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>📋 {mode === 'seller' ? 'Selling' : 'Buying'}</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`filter-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {current.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>Nothing here yet.</p>
      ) : (
        current.map(conv => (
          <ConvRow key={conv.id} conv={conv} userId={user?.id} onOpen={onOpen} />
        ))
      )}
    </div>
  )
}
