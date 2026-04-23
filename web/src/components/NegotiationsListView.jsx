import { useState } from 'react'
import { useAppContext } from '../AppContext'

const STATUS_LABELS = {
  price_pending:    'Waiting for offer',
  price_suggested:  '💰 Price offered',
  price_agreed:     '✅ Price agreed',
  pickup_suggested: '📅 Pickup proposed',
  pickup_agreed:    '✅ Pickup agreed',
  contact_revealed: '📱 Contact shared',
  cancelled:        'Withdrew',
}

function isYourTurn(conv, userId) {
  const s = conv.status
  if (s === 'price_suggested'  && conv.price_suggested_by  && String(conv.price_suggested_by)  !== String(userId)) return true
  if (s === 'pickup_suggested' && conv.pickup_suggested_by && String(conv.pickup_suggested_by) !== String(userId)) return true
  if (s === 'pickup_agreed') return true
  if (s === 'cancelled' && conv.cancelled_by && String(conv.cancelled_by) !== String(userId)) return true
  return false
}

const ACTIVE_STATUSES = ['price_pending', 'price_suggested', 'price_agreed', 'pickup_suggested', 'pickup_agreed']
const DONE_STATUSES   = ['contact_revealed']

export default function NegotiationsListView({ listing, conversations, onSelect, onBack }) {
  const { user } = useAppContext()
  const [tab, setTab] = useState('active')

  const byNewest = (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)

  const active    = conversations.filter(c => ACTIVE_STATUSES.includes(c.status)).sort(byNewest)
  const done      = conversations.filter(c => DONE_STATUSES.includes(c.status)).sort(byNewest)
  const cancelled = conversations.filter(c => c.status === 'cancelled').sort(byNewest)

  const tabs = [
    { key: 'active',    label: `Active (${active.length})` },
    { key: 'done',      label: `Deal done (${done.length})` },
    { key: 'cancelled', label: `Cancelled (${cancelled.length})` },
  ]

  const current = tab === 'active' ? active : tab === 'done' ? done : cancelled

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>
      <h2>🤝 Negotiations — {listing?.title}</h2>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`filter-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {current.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>
          {tab === 'active' ? 'No active negotiations.' : tab === 'done' ? 'No completed deals yet.' : 'No cancelled negotiations.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {current.map(conv => {
            const unseen      = !conv.seen_by_seller
            const yourTurn    = isYourTurn(conv, user?.id)
            const isCancelled = conv.status === 'cancelled'

            return (
              <div
                key={conv.id}
                className="conversation-row"
                onClick={() => onSelect(conv)}
                style={{ opacity: isCancelled ? 0.7 : 1 }}
              >
                <div
                  className="conversation-avatar"
                  style={unseen ? { background: 'var(--primary)', color: '#fff' } : {}}
                >
                  {conv.buyer_name?.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="conversation-name">{conv.buyer_name}</span>

                    {unseen && (
                      <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: '11px' }}>New</span>
                    )}
                    {!unseen && yourTurn && !isCancelled && (
                      <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' }}>
                        Your turn
                      </span>
                    )}
                    {isCancelled && (
                      <span style={{ fontSize: '11px', color: unseen ? '#b71c1c' : '#999', fontWeight: unseen ? 600 : 400 }}>
                        {unseen ? '⚠ Withdrew' : 'Withdrew'}
                      </span>
                    )}
                  </div>
                  <div className="conversation-phone">{STATUS_LABELS[conv.status] || conv.status}</div>
                  {conv.agreed_price && <div style={{ fontSize: '12px', color: '#666' }}>💰 ${conv.agreed_price}</div>}
                </div>

                <span style={{ color: '#aaa', fontSize: '13px', flexShrink: 0 }}>Open →</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
