import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppContext } from '../AppContext'
import { displayStatus } from '../utils/conversation'
import FilterDropdown from './FilterDropdown'

function cancelLabel(conv, userId, t) {
  return t('negotiations.withdrew')
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
const DONE_STATUSES   = ['contact_revealed', 'sold']

export default function NegotiationsListView({ listing, conversations, onSelect, onBack }) {
  const { user } = useAppContext()
  const { t } = useTranslation()
  const [tab, setTab] = useState('all')

  const byNewest = (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)

  const active    = conversations.filter(c => ACTIVE_STATUSES.includes(c.status)).sort(byNewest)
  const done      = conversations.filter(c => DONE_STATUSES.includes(displayStatus(c, user?.id))).sort(byNewest)
  const cancelled = conversations.filter(c => c.status === 'cancelled' && !DONE_STATUSES.includes(displayStatus(c, user?.id))).sort(byNewest)
  const all       = conversations.slice().sort(byNewest)

  const showOptions = [
    { value: 'all',       label: t('negotiations.all',       { count: all.length }) },
    { value: 'active',    label: t('negotiations.active',    { count: active.length }) },
    { value: 'done',      label: t('negotiations.done',      { count: done.length }) },
    { value: 'cancelled', label: t('negotiations.cancelled', { count: cancelled.length }) },
  ]

  const statusLabels = {
    price_pending:     t('history.statusLabels.price_pending'),
    price_suggested:   t('history.statusLabels.price_suggested'),
    price_agreed:      t('history.statusLabels.price_agreed'),
    pickup_suggested:  t('history.statusLabels.pickup_suggested'),
    pickup_agreed:     t('history.statusLabels.pickup_agreed'),
    contact_revealed:  t('history.statusLabels.contact_revealed'),
    sold:              t('history.statusLabels.sold'),
    cancelled:         t('history.statusLabels.cancelled'),
  }

  const current = tab === 'all' ? all : tab === 'active' ? active : tab === 'done' ? done : cancelled

  const emptyMsg = tab === 'active'    ? t('negotiations.emptyActive')
                 : tab === 'done'      ? t('negotiations.emptyDone')
                 : tab === 'cancelled' ? t('negotiations.emptyCancelled')
                 : t('negotiations.emptyAll')

  return (
    <div className="form-container" style={{ maxWidth: '600px' }}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '20px' }}>{t('common.back')}</button>
      <h2>{t('negotiations.title', { listing: listing?.title })}</h2>

      <div className="filter-row" style={{ marginBottom: '20px' }}>
        <FilterDropdown
          label={t('negotiations.show')}
          options={showOptions}
          value={tab}
          onChange={setTab}
        />
      </div>

      {current.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: '30px 0' }}>{emptyMsg}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {current.map(conv => {
            const ds          = displayStatus(conv, user?.id)
            const unseen      = !conv.seen_by_seller
            const yourTurn    = isYourTurn(conv, user?.id)
            const isCancelled = conv.status === 'cancelled'
            const isSold      = ds === 'sold'

            return (
              <div
                key={conv.id}
                className="conversation-row"
                onClick={() => onSelect(conv)}
                style={{ opacity: isCancelled && !isSold ? 0.7 : 1 }}
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
                      <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: '11px' }}>{t('negotiations.new')}</span>
                    )}
                    {!unseen && yourTurn && !isCancelled && (
                      <span style={{ padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' }}>
                        {t('negotiations.yourTurn')}
                      </span>
                    )}
                    {isCancelled && (
                      <span style={{ fontSize: '11px', color: unseen ? '#b71c1c' : '#999', fontWeight: unseen ? 600 : 400 }}>
                        {unseen ? `⚠ ${cancelLabel(conv, user?.id, t)}` : cancelLabel(conv, user?.id, t)}
                      </span>
                    )}
                  </div>
                  <div className="conversation-phone">{statusLabels[ds] || ds}</div>
                  {conv.agreed_price && <div style={{ fontSize: '12px', color: '#666' }}>💰 ${conv.agreed_price}</div>}
                </div>

                <span style={{ color: '#aaa', fontSize: '13px', flexShrink: 0 }}>{t('common.open')}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
