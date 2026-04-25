import { useState, useEffect } from 'react'
import { useAppContext } from '../AppContext'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

const EVENT_LABELS = {
  negotiation_started: (e) => `${e.actor_name} opened negotiation`,
  price_suggested:     (e) => `${e.actor_name} offered $${e.value}`,
  price_accepted:      (e) => `${e.actor_name} accepted price — $${e.value} agreed`,
  price_declined:      (e) => `${e.actor_name} declined $${e.value}`,
  pickup_suggested:    (e) => `${e.actor_name} proposed pickup: ${fmtTime(e.value)}`,
  pickup_accepted:     (e) => `${e.actor_name} accepted pickup: ${fmtTime(e.value)}`,
  contact_revealed:    (e) => `${e.actor_name} shared contact details`,
  cancelled:           (e) => e.value ? `Negotiation cancelled — ${e.value}` : `${e.actor_name} withdrew from negotiation`,
  reopened:            (e) => `${e.actor_name} reopened negotiation`,
}

function fmtTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function fmtEventTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function NextStep({ text }) {
  return (
    <div style={{ padding: '10px 14px', background: '#fff8e1', border: '1px solid #ffe082', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#795548' }}>
      💡 {text}
    </div>
  )
}

const MAX_VISIBLE_EVENTS = 10

function Timeline({ events }) {
  if (!events || events.length === 0) return null
  const sorted = [...events].reverse()
  return (
    <div style={{ marginTop: '20px', marginBottom: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        History
      </div>
      <div style={{
        maxHeight: '220px', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '6px',
        paddingRight: '4px',
      }}>
        {sorted.slice(0, MAX_VISIBLE_EVENTS).map((e, i) => {
          const label = EVENT_LABELS[e.event_type]?.(e) || `${e.event_type}${e.value ? ': ' + e.value : ''}`
          return (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px' }}>
              <span style={{ color: '#bbb', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '80px' }}>
                {fmtEventTime(e.created_at)}
              </span>
              <span style={{ color: '#555' }}>{label}</span>
            </div>
          )
        })}
        {sorted.length > MAX_VISIBLE_EVENTS && (
          <div style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', paddingTop: '4px' }}>
            + {sorted.length - MAX_VISIBLE_EVENTS} earlier events
          </div>
        )}
      </div>
    </div>
  )
}

function getValidPickupSlots(listing, daysAhead = 14) {
  const slots = listing?.listing_pickup_slots || listing?.pickup_slots
  if (!slots || slots.length === 0) return []
  const results = []
  const now = new Date()
  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now)
    date.setDate(now.getDate() + d + 1)
    const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]
    const matching = slots.filter(s => s.day === dayName)
    matching.forEach(slot => {
      const [sh, sm] = slot.start.split(':').map(Number)
      const dt = new Date(date)
      dt.setHours(sh, sm, 0, 0)
      results.push({ label: `${date.toDateString()} ${slot.start}–${slot.end}`, value: dt.toISOString() })
    })
  }
  return results
}

export default function ConversationView({ conversation, listing, contact, onStartWithPrice, onAction, onRevealContact, onBack, onMarkSeen }) {
  const { user, mode } = useAppContext()
  const [priceInput, setPriceInput]   = useState('')
  const [pickupInput, setPickupInput] = useState('')
  const [priceError, setPriceError]   = useState('')
  const [pickupError, setPickupError] = useState('')

  const isBuyer  = mode === 'buyer'
  const isSeller = mode === 'seller'
  const s        = conversation?.status

  // Mark seen only when the conversation is first opened (id changes), not on every SSE update
  useEffect(() => {
    if (conversation?.id) onMarkSeen?.(conversation.id)
  }, [conversation?.id])

  const act = (action, value) => {
    setPriceInput(''); setPickupInput('')
    setPriceError(''); setPickupError('')
    onAction(action, value ?? null)
  }

  const handleSendOffer = async () => {
    const price = parseFloat(priceInput)
    if (!price || price <= 0) { setPriceError('Please enter a valid price greater than 0'); return }
    setPriceError('')
    setPriceInput('')
    await onStartWithPrice(price)
  }

  const handleSuggestPickup = (value) => {
    if (!value) { setPickupError('Please select a date and time'); return }
    setPickupError('')
    act('suggest_pickup', value)
  }

  // ── No conversation yet: buyer enters first offer ──
  if (!conversation) {
    return (
      <div className="form-container" style={{ maxWidth: '560px' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>
        <h2>🤝 {listing?.title}</h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Seller: <strong>{listing?.seller_name || 'Loading…'}</strong></p>
        {listing?.estimated_price ? (
          <div style={{ padding: '14px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ margin: 0 }}>This listing has a fixed price of <strong>${listing.estimated_price}</strong>.</p>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={() => onStartWithPrice(listing.estimated_price)}>
              ✅ Accept price &amp; continue
            </button>
          </div>
        ) : (
          <div className="form-group">
            <label>Your price offer ($)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number" min="0.01" step="0.01"
                value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder="e.g. 25.00"
                style={{ flex: 1, borderColor: priceError ? '#c00' : '' }}
              />
              <button className="btn btn-primary" onClick={handleSendOffer}>Send offer</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}
      </div>
    )
  }

  const cancelled      = s === 'cancelled'
  const iCancelled     = cancelled && String(conversation.cancelled_by) === String(user?.id)
  const soldToOther    = cancelled && conversation.events?.some(e => e.value === 'Item sold to another buyer')
  const listingSold    = conversation.listing_status === 'sold'
  const validSlots  = getValidPickupSlots(conversation)

  // Who suggested the current price / pickup (for turn logic)
  const iMyPriceSuggestion  = String(conversation.price_suggested_by)  === String(user?.id)
  const iMyPickupSuggestion = String(conversation.pickup_suggested_by) === String(user?.id)

  return (
    <div className="form-container" style={{ maxWidth: '560px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>← Back</button>

      <h2>🤝 {conversation.listing_title}</h2>
      {isBuyer  && <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Seller: <strong>{conversation.seller_name || listing?.seller_name || '…'}</strong></p>}
      {isSeller && <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>Buyer: <strong>{conversation.buyer_name}</strong></p>}

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'price',   label: '1. Price',   done: ['price_agreed','pickup_suggested','pickup_agreed','contact_revealed'].includes(s) },
          { key: 'pickup',  label: '2. Pickup',  done: ['pickup_agreed','contact_revealed'].includes(s) },
          { key: 'contact', label: '3. Contact', done: s === 'contact_revealed' },
        ].map(step => (
          <span key={step.key} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
            background: step.done ? 'var(--primary)' : '#e0e0e0',
            color: step.done ? '#fff' : '#666',
          }}>{step.label}</span>
        ))}
      </div>

      {/* Sold to another buyer banner */}
      {soldToOther && (
        <div style={{ padding: '12px 14px', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#b71c1c' }}>
          🏷️ This item was <strong>sold to another buyer</strong>. Your negotiation has been cancelled.
        </div>
      )}

      {/* Active but listing sold banner */}
      {listingSold && !cancelled && s !== 'contact_revealed' && (
        <div style={{ padding: '12px 14px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#e65100' }}>
          ⚠️ This item has been marked as <strong>sold</strong>. The seller may have accepted another buyer's offer.
        </div>
      )}

      {/* Current status summary */}
      <div style={{ padding: '14px 16px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#555' }}>
        {cancelled ? (
          <>
            ❌ {soldToOther ? 'Cancelled — sold to another buyer' : 'Cancelled'}
            {!soldToOther && conversation.cancelled_by && (
              <div style={{ marginTop: '4px', fontSize: '13px' }}>
                {iCancelled ? 'You withdrew from this negotiation.' : `${isBuyer ? 'Seller' : 'Buyer'} withdrew from this negotiation.`}
              </div>
            )}
          </>
        ) : (
          <>
            {s === 'price_pending'    && 'Waiting for price offer'}
            {s === 'price_suggested'  && `💰 Price offered: $${conversation.suggested_price}`}
            {s === 'price_agreed'     && `✅ Price agreed: $${conversation.agreed_price}`}
            {s === 'pickup_suggested' && `📅 Pickup proposed: ${fmtTime(conversation.suggested_pickup)}`}
            {s === 'pickup_agreed'    && `✅ Pickup agreed: ${fmtTime(conversation.agreed_pickup)}`}
            {s === 'contact_revealed' && '📱 Contact shared — deal complete!'}
            {conversation.agreed_price && !['price_pending','price_suggested'].includes(s) && (
              <div style={{ marginTop: '4px', fontSize: '13px' }}>💰 Price: <strong>${conversation.agreed_price}</strong></div>
            )}
          </>
        )}
      </div>

      {/* ── REOPEN (only the canceller can undo) ── */}
      {iCancelled && conversation.listing_status === 'available' && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '8px' }}
          onClick={() => act('reopen')}
        >
          🔄 Reopen negotiation
        </button>
      )}

      {!cancelled && <>

        {/* ── NEXT STEP HINTS ── */}
        {isBuyer && s === 'price_suggested' && iMyPriceSuggestion && (
          <NextStep text="Your offer was sent — you can update it below while waiting for the seller." />
        )}
        {isSeller && s === 'price_suggested' && !iMyPriceSuggestion && (
          <NextStep text="A buyer made a price offer. Accept it or decline and counter." />
        )}
        {isSeller && s === 'price_suggested' && iMyPriceSuggestion && (
          <NextStep text="Your counter-offer was sent — you can update it below while waiting." />
        )}
        {isBuyer && s === 'price_agreed' && (
          <NextStep text="Price agreed! Suggest a pickup date and time to continue." />
        )}
        {isSeller && s === 'price_agreed' && (
          <NextStep text="Price agreed! You can suggest a pickup time, or wait for the buyer." />
        )}
        {isBuyer && s === 'pickup_suggested' && iMyPickupSuggestion && (
          <NextStep text="Pickup time proposed — you can update it below while waiting for the seller." />
        )}
        {isSeller && s === 'pickup_suggested' && !iMyPickupSuggestion && (
          <NextStep text="The buyer proposed a pickup time. Accept it or suggest a different one." />
        )}
        {isSeller && s === 'pickup_suggested' && iMyPickupSuggestion && (
          <NextStep text="Pickup time proposed — you can update it below while waiting for the buyer." />
        )}
        {isBuyer && s === 'pickup_agreed' && (
          <NextStep text="Pickup agreed! Waiting for the seller to share their contact details." />
        )}
        {isSeller && s === 'pickup_agreed' && (
          <NextStep text="Everything agreed. Share your contact details with the buyer to complete the deal." />
        )}
        {isBuyer && s === 'contact_revealed' && !contact && (
          <NextStep text="The seller has shared their contact details. Tap below to view them." />
        )}

        {/* ── PRICE PHASE ── */}
        {isBuyer && s === 'price_pending' && (
          <div className="form-group">
            <label>Suggest a price ($)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" min="0.01" step="0.01" value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder="e.g. 25.00" style={{ flex: 1, borderColor: priceError ? '#c00' : '' }} />
              <button className="btn btn-primary" onClick={() => {
                if (!priceInput || parseFloat(priceInput) <= 0) { setPriceError('Enter a valid price'); return }
                act('suggest_price', priceInput)
              }}>Send offer</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}

        {isSeller && s === 'price_suggested' && !iMyPriceSuggestion && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act('accept_price')}>✅ Accept ${conversation.suggested_price}</button>
            <button className="btn btn-ghost"   style={{ flex: 1 }} onClick={() => act('decline_price')}>❌ Decline &amp; counter</button>
          </div>
        )}

        {isSeller && (s === 'price_pending' || (s === 'price_suggested' && iMyPriceSuggestion)) && (
          <div className="form-group">
            <label>{s === 'price_pending' ? 'Counter with your price ($)' : 'Update your offer ($)'}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" min="0.01" step="0.01" value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder={s === 'price_pending' ? 'e.g. 30.00' : `Current: $${conversation.suggested_price}`}
                style={{ flex: 1, borderColor: priceError ? '#c00' : '' }} />
              <button className="btn btn-primary" onClick={() => {
                if (!priceInput || parseFloat(priceInput) <= 0) { setPriceError('Enter a valid price'); return }
                act('suggest_price', priceInput)
              }}>{s === 'price_pending' ? 'Send counter' : 'Update offer'}</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}

        {isBuyer && s === 'price_suggested' && !iMyPriceSuggestion && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act('accept_price')}>✅ Accept ${conversation.suggested_price}</button>
            <button className="btn btn-ghost"   style={{ flex: 1 }} onClick={() => act('decline_price')}>❌ Decline</button>
          </div>
        )}

        {isBuyer && s === 'price_suggested' && iMyPriceSuggestion && (
          <div className="form-group">
            <label>Update your offer ($)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" min="0.01" step="0.01" value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder={`Current: $${conversation.suggested_price}`}
                style={{ flex: 1, borderColor: priceError ? '#c00' : '' }} />
              <button className="btn btn-ghost" onClick={() => {
                if (!priceInput || parseFloat(priceInput) <= 0) { setPriceError('Enter a valid price'); return }
                act('suggest_price', priceInput)
              }}>Update offer</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}

        {/* ── PICKUP PHASE ── */}
        {(s === 'price_agreed') && (
          <PickupInput validSlots={validSlots} pickupInput={pickupInput} setPickupInput={setPickupInput}
            pickupError={pickupError} setPickupError={setPickupError} onPropose={handleSuggestPickup}
            label="Suggest a pickup date & time" />
        )}

        {s === 'pickup_suggested' && !iMyPickupSuggestion && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act('accept_pickup')}>✅ Accept</button>
            </div>
            <PickupInput validSlots={validSlots} pickupInput={pickupInput} setPickupInput={setPickupInput}
              pickupError={pickupError} setPickupError={setPickupError} onPropose={handleSuggestPickup}
              label="Or suggest a different time" btnLabel="Counter" btnClass="btn-ghost" />
          </>
        )}

        {s === 'pickup_suggested' && iMyPickupSuggestion && (
          <PickupInput validSlots={validSlots} pickupInput={pickupInput} setPickupInput={setPickupInput}
            pickupError={pickupError} setPickupError={setPickupError} onPropose={handleSuggestPickup}
            label="Update your pickup suggestion" btnLabel="Update" btnClass="btn-ghost" />
        )}

        {/* ── CONTACT PHASE ── */}
        {isSeller && s === 'pickup_agreed' && (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => act('reveal_contact')}>
            📱 Share my details with buyer
          </button>
        )}

        {isBuyer && s === 'contact_revealed' && !contact && (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onRevealContact}>
            📱 View seller contact details
          </button>
        )}

        {contact && (
          <div style={{ padding: '14px 16px', background: '#e8f5e9', borderRadius: '8px', marginTop: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>📱 Seller contact</div>
            <div style={{ marginBottom: '4px' }}>👤 {contact.name}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>📞 {contact.phone}</div>
            {contact.address && <div style={{ fontSize: '13px', color: '#555' }}>📍 {contact.address}</div>}
            {contact.latitude && contact.longitude && (
              <a
                href={`https://www.google.com/maps?q=${contact.latitude},${contact.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '8px', display: 'inline-block' }}
              >
                🗺 Open in Google Maps
              </a>
            )}
          </div>
        )}

        {/* ── WITHDRAW (both parties) ── */}
        {s !== 'contact_revealed' && (
          <button
            className="btn btn-ghost"
            style={{ color: '#c00', marginTop: '16px', width: '100%' }}
            onClick={() => {
              const msg = isBuyer
                ? 'Withdraw from this negotiation? This cannot be undone.'
                : 'Cancel this negotiation with the buyer? This cannot be undone.'
              if (window.confirm(msg)) act('cancel')
            }}
          >
            {isBuyer ? '🚪 Not interested — withdraw' : '🚫 Cancel negotiation'}
          </button>
        )}

      </>}

      {/* Info message for sold-to-other cancelled conversations */}
      {cancelled && soldToOther && isBuyer && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
          This negotiation was closed automatically when the seller accepted another offer.
        </div>
      )}

      {/* ── EVENT TIMELINE (bottom) ── */}
      <Timeline events={conversation.events} />
    </div>
  )
}

function PickupInput({ validSlots, pickupInput, setPickupInput, pickupError, setPickupError, onPropose, label, btnLabel = 'Propose', btnClass = 'btn-primary' }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {validSlots.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {validSlots.map(slot => (
            <button
              key={slot.value}
              className={`btn ${pickupInput === slot.value ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textAlign: 'left' }}
              onClick={() => { setPickupInput(slot.value); setPickupError('') }}
            >{slot.label}</button>
          ))}
          <button className={`btn ${btnClass}`} style={{ marginTop: '6px' }} onClick={() => onPropose(pickupInput)}>
            {btnLabel}
          </button>
          {pickupError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{pickupError}</p>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="datetime-local"
              value={pickupInput}
              onChange={e => { setPickupInput(e.target.value); setPickupError('') }}
              style={{ flex: 1, borderColor: pickupError ? '#c00' : '' }}
            />
            <button className={`btn ${btnClass}`} onClick={() => onPropose(pickupInput)}>{btnLabel}</button>
          </div>
          {pickupError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{pickupError}</p>}
        </>
      )}
    </div>
  )
}
