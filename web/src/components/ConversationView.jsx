import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

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
  const { t } = useTranslation()
  if (!events || events.length === 0) return null
  const sorted = [...events].reverse()

  const getLabel = (e) => {
    switch (e.event_type) {
      case 'negotiation_started': return t('conversation.timeline.negotiation_started', { name: e.actor_name })
      case 'price_suggested':     return t('conversation.timeline.price_suggested',     { name: e.actor_name, value: e.value })
      case 'price_accepted':      return t('conversation.timeline.price_accepted',      { name: e.actor_name, value: e.value })
      case 'price_declined':      return t('conversation.timeline.price_declined',      { name: e.actor_name, value: e.value })
      case 'pickup_suggested':    return t('conversation.timeline.pickup_suggested',    { name: e.actor_name, value: fmtTime(e.value) })
      case 'pickup_accepted':     return t('conversation.timeline.pickup_accepted',     { name: e.actor_name, value: fmtTime(e.value) })
      case 'contact_revealed':    return t('conversation.timeline.contact_revealed',    { name: e.actor_name })
      case 'cancelled':           return e.value
                                    ? t('conversation.timeline.cancelled_reason', { reason: e.value })
                                    : t('conversation.timeline.cancelled',        { name: e.actor_name })
      case 'reopened':            return t('conversation.timeline.reopened',            { name: e.actor_name })
      case 'seen':                return t('conversation.timeline.seen',                { name: e.actor_name })
      default:                    return `${e.event_type}${e.value ? ': ' + e.value : ''}`
    }
  }

  return (
    <div style={{ marginTop: '20px', marginBottom: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        {t('conversation.historyTitle')}
      </div>
      <div style={{
        maxHeight: '220px', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '6px',
        paddingRight: '4px',
      }}>
        {sorted.slice(0, MAX_VISIBLE_EVENTS).map((e, i) => {
          const isSeen = e.event_type === 'seen'
          const label  = getLabel(e)
          return (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: isSeen ? '12px' : '13px', opacity: isSeen ? 0.6 : 1 }}>
              <span style={{ color: '#bbb', whiteSpace: 'nowrap', paddingTop: '1px', minWidth: '80px' }}>
                {fmtEventTime(e.created_at)}
              </span>
              <span style={{ color: isSeen ? '#999' : '#555', fontStyle: isSeen ? 'italic' : 'normal' }}>{label}</span>
            </div>
          )
        })}
        {sorted.length > MAX_VISIBLE_EVENTS && (
          <div style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', paddingTop: '4px' }}>
            {t('conversation.earlierEvents', { count: sorted.length - MAX_VISIBLE_EVENTS })}
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
  const { t } = useTranslation()
  const [priceInput, setPriceInput]   = useState('')
  const [pickupInput, setPickupInput] = useState('')
  const [priceError, setPriceError]   = useState('')
  const [pickupError, setPickupError] = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const isBuyer  = conversation ? String(user?.id) === String(conversation.buyer_id)  : mode === 'buyer'
  const isSeller = conversation ? String(user?.id) === String(conversation.seller_id) : mode === 'seller'
  const s        = conversation?.status

  useEffect(() => {
    if (conversation?.id) onMarkSeen?.(conversation.id)
  }, [conversation?.id, conversation?.status, conversation?.updated_at])

  const act = async (action, value) => {
    if (submitting) return
    setPriceInput(''); setPickupInput('')
    setPriceError(''); setPickupError('')
    setSubmitting(true)
    try { await onAction(action, value ?? null) }
    finally { setSubmitting(false) }
  }

  const handleSendOffer = async () => {
    const price = parseFloat(priceInput)
    if (!price || price <= 0) { setPriceError(t('conversation.priceErrorPositive')); return }
    if (submitting) return
    setPriceError('')
    setPriceInput('')
    setSubmitting(true)
    try { await onStartWithPrice(price) }
    finally { setSubmitting(false) }
  }

  const handleSuggestPickup = (value) => {
    if (!value) { setPickupError(t('conversation.pickupError')); return }
    setPickupError('')
    act('suggest_pickup', value)
  }

  // ── No conversation yet: buyer enters first offer ──
  if (!conversation) {
    return (
      <div className="form-container" style={{ maxWidth: '560px' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>{t('conversation.back')}</button>
        <h2>🤝 {listing?.title}</h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>{t('conversation.seller')}: <strong>{listing?.seller_name || t('common.loading')}</strong></p>
        {listing?.estimated_price ? (
          <div style={{ padding: '14px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ margin: 0 }}>{t('conversation.fixedPrice', { price: listing.estimated_price })}</p>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={() => onStartWithPrice(listing.estimated_price)}>
              {t('conversation.acceptFixed')}
            </button>
          </div>
        ) : (
          <div className="form-group">
            <label>{t('conversation.startOfferTitle')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number" min="0.01" step="0.01"
                value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder="e.g. 25.00"
                style={{ flex: 1, borderColor: priceError ? '#c00' : '' }}
              />
              <button className="btn btn-primary" onClick={handleSendOffer}>{t('conversation.sendOffer')}</button>
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
  const validSlots     = getValidPickupSlots(conversation)

  const iMyPriceSuggestion  = String(conversation.price_suggested_by)  === String(user?.id)
  const iMyPickupSuggestion = String(conversation.pickup_suggested_by) === String(user?.id)

  const cancelledOtherLabel = isBuyer
    ? t('conversation.cancelledOtherBuyer')
    : t('conversation.cancelledOtherSeller')

  return (
    <div className="form-container" style={{ maxWidth: '560px' }}>
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '16px' }}>{t('conversation.back')}</button>

      <h2>🤝 {conversation.listing_title}</h2>
      {isBuyer  && <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>{t('conversation.seller')}: <strong>{conversation.seller_name || listing?.seller_name || '…'}</strong></p>}
      {isSeller && <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>{t('conversation.buyer')}: <strong>{conversation.buyer_name}</strong></p>}

      {/* Progress steps */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'price',   label: t('conversation.step_price'),   done: ['price_agreed','pickup_suggested','pickup_agreed','contact_revealed'].includes(s) },
          { key: 'pickup',  label: t('conversation.step_pickup'),  done: ['pickup_agreed','contact_revealed'].includes(s) },
          { key: 'contact', label: t('conversation.step_contact'), done: s === 'contact_revealed' },
        ].map(step => (
          <span key={step.key} style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
            background: step.done ? 'var(--primary)' : '#e0e0e0',
            color: step.done ? '#fff' : '#666',
          }}>{step.label}</span>
        ))}
      </div>

      {/* Sold to another buyer banner */}
      {soldToOther && isBuyer && (
        <div style={{ padding: '12px 14px', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#b71c1c' }}>
          {t('conversation.soldToOtherBanner')}
        </div>
      )}

      {/* Active but listing sold banner */}
      {listingSold && !cancelled && s !== 'contact_revealed' && (
        <div style={{ padding: '12px 14px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#e65100' }}>
          {t('conversation.activeSoldBanner')}
        </div>
      )}

      {/* Current status summary */}
      <div style={{ padding: '14px 16px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#555' }}>
        {cancelled ? (
          <>
            ❌ {soldToOther ? t('conversation.statusCancelledSoldToOther') : t('conversation.statusCancelled')}
            {!soldToOther && conversation.cancelled_by && (
              <div style={{ marginTop: '4px', fontSize: '13px' }}>
                {iCancelled ? t('conversation.cancelledYou') : cancelledOtherLabel}
              </div>
            )}
          </>
        ) : (
          <>
            {s === 'price_pending'    && t('conversation.statusWaiting')}
            {s === 'price_suggested'  && t('conversation.statusPriceSuggested', { price: conversation.suggested_price })}
            {s === 'price_agreed'     && t('conversation.statusPriceAgreed',    { price: conversation.agreed_price })}
            {s === 'pickup_suggested' && t('conversation.statusPickupSuggested', { time: fmtTime(conversation.suggested_pickup) })}
            {s === 'pickup_agreed'    && t('conversation.statusPickupAgreed',    { time: fmtTime(conversation.agreed_pickup) })}
            {s === 'contact_revealed' && t('conversation.statusContactRevealed')}
            {conversation.agreed_price && !['price_pending','price_suggested'].includes(s) && (
              <div style={{ marginTop: '4px', fontSize: '13px' }}>{t('conversation.agreedPrice', { price: conversation.agreed_price })}</div>
            )}
          </>
        )}
      </div>

      {/* REOPEN */}
      {iCancelled && conversation.listing_status === 'available' && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '8px' }}
          disabled={submitting}
          onClick={() => act('reopen')}
        >
          {t('conversation.reopen')}
        </button>
      )}

      {!cancelled && <fieldset disabled={submitting} style={{ border: 'none', padding: 0, margin: 0 }}><>

        {/* NEXT STEP HINTS */}
        {isBuyer && s === 'price_suggested' && iMyPriceSuggestion && (
          <NextStep text={t('conversation.hintBuyerOffered')} />
        )}
        {isSeller && s === 'price_suggested' && !iMyPriceSuggestion && (
          <NextStep text={t('conversation.hintSellerReceived')} />
        )}
        {isSeller && s === 'price_suggested' && iMyPriceSuggestion && (
          <NextStep text={t('conversation.hintSellerOffered')} />
        )}
        {isBuyer && s === 'price_agreed' && (
          <NextStep text={t('conversation.hintBuyerPriceAgreed')} />
        )}
        {isSeller && s === 'price_agreed' && (
          <NextStep text={t('conversation.hintSellerPriceAgreed')} />
        )}
        {isBuyer && s === 'pickup_suggested' && iMyPickupSuggestion && (
          <NextStep text={t('conversation.hintBuyerPickupProposed')} />
        )}
        {isSeller && s === 'pickup_suggested' && !iMyPickupSuggestion && (
          <NextStep text={t('conversation.hintSellerPickupReceived')} />
        )}
        {isSeller && s === 'pickup_suggested' && iMyPickupSuggestion && (
          <NextStep text={t('conversation.hintSellerPickupProposed')} />
        )}
        {isBuyer && s === 'pickup_agreed' && (
          <NextStep text={t('conversation.hintBuyerPickupAgreed')} />
        )}
        {isSeller && s === 'pickup_agreed' && (
          <NextStep text={t('conversation.hintSellerPickupAgreed')} />
        )}
        {isBuyer && s === 'contact_revealed' && !contact && (
          <NextStep text={t('conversation.hintBuyerContactReady')} />
        )}

        {/* PRICE PHASE */}
        {isBuyer && s === 'price_pending' && (
          <div className="form-group">
            <label>{t('conversation.suggestPrice')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" min="0.01" step="0.01" value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder="e.g. 25.00" style={{ flex: 1, borderColor: priceError ? '#c00' : '' }} />
              <button className="btn btn-primary" onClick={() => {
                if (!priceInput || parseFloat(priceInput) <= 0) { setPriceError(t('conversation.priceError')); return }
                act('suggest_price', priceInput)
              }}>{t('conversation.sendOffer')}</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}

        {isSeller && s === 'price_suggested' && !iMyPriceSuggestion && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act('accept_price')}>{t('conversation.acceptPrice', { price: conversation.suggested_price })}</button>
            <button className="btn btn-ghost"   style={{ flex: 1 }} onClick={() => act('decline_price')}>{t('conversation.declinePrice')}</button>
          </div>
        )}

        {isSeller && (s === 'price_pending' || (s === 'price_suggested' && iMyPriceSuggestion)) && (
          <div className="form-group">
            <label>{s === 'price_pending' ? t('conversation.counterPrice') : t('conversation.updateOffer')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" min="0.01" step="0.01" value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder={s === 'price_pending' ? 'e.g. 30.00' : t('conversation.currentOffer', { price: conversation.suggested_price })}
                style={{ flex: 1, borderColor: priceError ? '#c00' : '' }} />
              <button className="btn btn-primary" onClick={() => {
                if (!priceInput || parseFloat(priceInput) <= 0) { setPriceError(t('conversation.priceError')); return }
                act('suggest_price', priceInput)
              }}>{s === 'price_pending' ? t('conversation.sendCounter') : t('conversation.updateOfferBtn')}</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}

        {isBuyer && s === 'price_suggested' && !iMyPriceSuggestion && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act('accept_price')}>{t('conversation.acceptPrice', { price: conversation.suggested_price })}</button>
            <button className="btn btn-ghost"   style={{ flex: 1 }} onClick={() => act('decline_price')}>{t('conversation.declinePriceBuyer')}</button>
          </div>
        )}

        {isBuyer && s === 'price_suggested' && iMyPriceSuggestion && (
          <div className="form-group">
            <label>{t('conversation.updateOffer')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" min="0.01" step="0.01" value={priceInput}
                onChange={e => { setPriceInput(e.target.value); setPriceError('') }}
                placeholder={t('conversation.currentOffer', { price: conversation.suggested_price })}
                style={{ flex: 1, borderColor: priceError ? '#c00' : '' }} />
              <button className="btn btn-ghost" onClick={() => {
                if (!priceInput || parseFloat(priceInput) <= 0) { setPriceError(t('conversation.priceError')); return }
                act('suggest_price', priceInput)
              }}>{t('conversation.updateOfferBtn')}</button>
            </div>
            {priceError && <p style={{ color: '#c00', fontSize: '13px', marginTop: '4px' }}>{priceError}</p>}
          </div>
        )}

        {/* PICKUP PHASE */}
        {s === 'price_agreed' && (
          <PickupInput validSlots={validSlots} pickupInput={pickupInput} setPickupInput={setPickupInput}
            pickupError={pickupError} setPickupError={setPickupError} onPropose={handleSuggestPickup}
            label={t('conversation.suggestPickup')} proposeLabel={t('conversation.proposeBtn')} btnClass="btn-primary" />
        )}

        {s === 'pickup_suggested' && !iMyPickupSuggestion && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act('accept_pickup')}>{t('conversation.acceptPickup')}</button>
            </div>
            <PickupInput validSlots={validSlots} pickupInput={pickupInput} setPickupInput={setPickupInput}
              pickupError={pickupError} setPickupError={setPickupError} onPropose={handleSuggestPickup}
              label={t('conversation.orSuggestDifferent')} proposeLabel={t('conversation.counterBtn')} btnClass="btn-ghost" />
          </>
        )}

        {s === 'pickup_suggested' && iMyPickupSuggestion && (
          <PickupInput validSlots={validSlots} pickupInput={pickupInput} setPickupInput={setPickupInput}
            pickupError={pickupError} setPickupError={setPickupError} onPropose={handleSuggestPickup}
            label={t('conversation.updatePickup')} proposeLabel={t('conversation.updateBtn')} btnClass="btn-ghost" />
        )}

        {/* CONTACT PHASE */}
        {isSeller && s === 'pickup_agreed' && (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => act('reveal_contact')}>
            {t('conversation.shareContact')}
          </button>
        )}

        {isBuyer && s === 'contact_revealed' && !contact && (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onRevealContact}>
            {t('conversation.viewContact')}
          </button>
        )}

        {contact && (
          <div style={{ padding: '14px 16px', background: '#e8f5e9', borderRadius: '8px', marginTop: '8px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>{t('conversation.contactTitle')}</div>
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
                {t('conversation.openMaps')}
              </a>
            )}
          </div>
        )}

        {/* WITHDRAW */}
        {s !== 'contact_revealed' && !listingSold && (
          <button
            className="btn btn-ghost"
            style={{ color: '#c00', marginTop: '16px', width: '100%' }}
            onClick={() => {
              const msg = isBuyer ? t('conversation.withdrawConfirm') : t('conversation.cancelConfirm')
              if (window.confirm(msg)) act('cancel')
            }}
          >
            {isBuyer ? t('conversation.withdraw') : t('conversation.cancelNeg')}
          </button>
        )}

      </></fieldset>}

      {cancelled && soldToOther && isBuyer && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
          {t('conversation.soldToOtherNote')}
        </div>
      )}

      <Timeline events={conversation.events} />
    </div>
  )
}

function groupSlotsByDay(slots) {
  const groups = {}
  slots.forEach(slot => {
    const date = new Date(slot.value)
    const dayKey = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    if (!groups[dayKey]) groups[dayKey] = []
    groups[dayKey].push(slot)
  })
  return Object.entries(groups)
}

function PickupInput({ validSlots, pickupInput, setPickupInput, pickupError, setPickupError, onPropose, label, proposeLabel, btnClass = 'btn-primary' }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {validSlots.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groupSlotsByDay(validSlots).map(([day, slots]) => (
            <div key={day}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {slots.map(slot => {
                  const time = new Date(slot.value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  const selected = pickupInput === slot.value
                  return (
                    <button
                      key={slot.value}
                      onClick={() => { setPickupInput(slot.value); setPickupError('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '8px', textAlign: 'left',
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        background: selected ? 'var(--primary-light)' : 'var(--surface)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{selected ? '🟢' : '⚪'}</span>
                      <span style={{ fontWeight: selected ? 700 : 500, fontSize: '14px', color: selected ? 'var(--primary-text)' : 'var(--text-primary)' }}>
                        {time}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <button className={`btn ${btnClass}`} style={{ marginTop: '4px' }} onClick={() => onPropose(pickupInput)}>
            {proposeLabel}
          </button>
          {pickupError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '4px' }}>{pickupError}</p>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="datetime-local"
              value={pickupInput}
              onChange={e => { setPickupInput(e.target.value); setPickupError('') }}
              style={{ flex: 1, borderColor: pickupError ? 'var(--danger)' : '' }}
            />
            <button className={`btn ${btnClass}`} onClick={() => onPropose(pickupInput)}>{proposeLabel}</button>
          </div>
          {pickupError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '4px' }}>{pickupError}</p>}
        </>
      )}
    </div>
  )
}
