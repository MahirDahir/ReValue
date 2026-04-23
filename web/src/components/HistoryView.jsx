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

const ACTIVE_STATUSES     = ['price_pending', 'price_suggested', 'price_agreed', 'pickup_suggested', 'pickup_agreed']
const NEGOTIATED_STATUSES = ['contact_revealed']
const SOLD_STATUSES       = ['sold']
const DEAD_STATUSES       = ['cancelled']

STATUS_LABELS['listing_removed'] = { label: '🗑️ Listing removed', color: '#b71c1c', bg: '#ffebee' }

function displayStatus(conv, userId) {
  if (conv.listing_removed) return 'listing_removed'
  if (
    conv.status === 'contact_revealed' &&
    conv.listing_status === 'sold' &&
    (conv.actual_buyer_id === userId || conv.seller_id === userId)
  ) return 'sold'
  return conv.status
}

// Is it this user's turn to act?
function isYourTurn(conv, userId, mode) {
  const s = conv.status
  if (mode === 'buyer') {
    if (s === 'price_pending') return true  // seller reopened, buyer needs to offer
    if (s === 'price_agreed') return true   // price agreed, buyer should suggest pickup
    if (s === 'price_suggested' && conv.price_suggested_by && String(conv.price_suggested_by) !== String(userId)) return true
    if (s === 'pickup_suggested' && conv.pickup_suggested_by && String(conv.pickup_suggested_by) !== String(userId)) return true
  } else {
    if (s === 'price_pending') return true  // buyer reopened or just started
    if (s === 'price_suggested' && conv.price_suggested_by && String(conv.price_suggested_by) !== String(userId)) return true
    if (s === 'pickup_suggested' && conv.pickup_suggested_by && String(conv.pickup_suggested_by) !== String(userId)) return true
    if (s === 'pickup_agreed') return true  // seller should reveal contact
    if (s === 'cancelled' && conv.cancelled_by && String(conv.cancelled_by) !== String(userId)) return true
  }
  return false
}

function fmtTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function ConvRow({ conv, userId, mode, onOpen }) {
  const ds       = displayStatus(conv, userId)
  const meta     = { ...(STATUS_LABELS[ds] || { label: ds, color: '#888', bg: '#f5f5f5' }) }
  if (ds === 'sold' && mode === 'buyer') meta.label = '🛒 Purchased'
  const yourTurn = ACTIVE_STATUSES.includes(conv.status) && isYourTurn(conv, userId, mode)
  const unseen   = mode === 'buyer' ? !conv.seen_by_buyer : !conv.seen_by_seller

  return (
    <div
      onClick={() => onOpen?.(conv)}
      style={{
        padding: '14px 16px', background: 'white', borderRadius: '8px',
        border: `1px solid ${unseen ? 'var(--primary)' : yourTurn ? '#ffcc80' : '#e0e0e0'}`,
        marginBottom: '8px', cursor: 'pointer',
        opacity: conv.status === 'cancelled' ? 0.7 : 1,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{conv.listing_title || 'Listing'}</span>
          {unseen && (
            <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: 'var(--primary)', color: '#fff' }}>New</span>
          )}
          {!unseen && yourTurn && (
            <span style={{ padding: '1px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' }}>Your turn</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
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

  const byNewest = (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)

  const modeConvs  = conversations
    .filter(c => mode === 'buyer' ? c.buyer_id === user?.id : c.seller_id === user?.id)
    .sort(byNewest)

  const active     = modeConvs.filter(c => !c.listing_removed && ACTIVE_STATUSES.includes(c.status))
  const yourTurn   = active.filter(c => isYourTurn(c, user?.id, mode))
  const waiting    = active.filter(c => !isYourTurn(c, user?.id, mode))
  const negotiated = modeConvs.filter(c => !c.listing_removed && NEGOTIATED_STATUSES.includes(displayStatus(c, user?.id)))
  const sold       = modeConvs.filter(c => !c.listing_removed && SOLD_STATUSES.includes(displayStatus(c, user?.id)))
  const cancelled  = modeConvs.filter(c => !c.listing_removed && DEAD_STATUSES.includes(c.status))
  const removed    = modeConvs.filter(c => c.listing_removed)

  const tabs = [
    { key: 'all',        label: `All (${modeConvs.length})` },
    { key: 'yourTurn',   label: `Your turn (${yourTurn.length})`,   highlight: yourTurn.length > 0 },
    { key: 'waiting',    label: `Waiting (${waiting.length})` },
    { key: 'negotiated', label: `Negotiated (${negotiated.length})` },
    { key: 'sold',       label: `${mode === 'buyer' ? 'Purchased' : 'Sold'} (${sold.length})` },
    { key: 'cancelled',  label: `Cancelled (${cancelled.length})` },
    ...(removed.length > 0 ? [{ key: 'removed', label: `🗑️ Removed (${removed.length})`, highlight: removed.some(c => !c.seen_by_buyer) }] : []),
  ]

  const current =
    tab === 'all'        ? modeConvs  :
    tab === 'yourTurn'   ? yourTurn   :
    tab === 'waiting'    ? waiting    :
    tab === 'negotiated' ? negotiated :
    tab === 'sold'       ? sold       :
    tab === 'removed'    ? removed    :
    cancelled

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>📋 {mode === 'seller' ? 'Selling' : 'Buying'}</h2>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`filter-btn ${tab === t.key ? 'active' : ''}`}
            style={t.highlight && tab !== t.key ? { borderColor: '#e65100', color: '#e65100' } : {}}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {current.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>Nothing here yet.</p>
      ) : (
        current.map(conv => (
          <ConvRow key={conv.id} conv={conv} userId={user?.id} mode={mode} onOpen={onOpen} />
        ))
      )}
    </div>
  )
}
