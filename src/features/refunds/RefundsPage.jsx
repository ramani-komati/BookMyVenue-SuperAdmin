import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { bookingRef, fmt, statusMeta } from '../../utils/format.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

/**
 * RefundsPage — one place for every refund decision:
 *   • Requests   — bookings whose status is refund_pending
 *   • Paused venues — CONFIRMED bookings on venues the admin paused (e.g.
 *     rain / under surveillance): the customers already paid, the venue can't
 *     host them — refund from here
 *   • History    — everything already refunded
 */
const RF_META = { confirmed: ['warning', 'Awaiting refund'], refund_pending: ['warning', 'Refund pending'], refunded: ['success', 'Refunded'] }

export default function RefundsPage() {
  const { bookings, venues, updateBooking, openModal, logAudit, showToast } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const [tab, setTab] = useState('Requests')

  // Bookings on paused venues (base name or its "— Pitch/Screen" siblings)
  // that are still confirmed — paid ONLINE, but the venue can't host them.
  const pausedNames = venues.filter((v) => v.status === 'paused').map((v) => String(v.name))
  const onPausedVenue = (b) => {
    const name = String(b.venue || '')
    return pausedNames.some((p) => name === p || name.startsWith(p + ' — '))
  }
  // No online money was collected for these — there is NOTHING to refund:
  // pay-at-venue bookings, walk-ins, and cash payments.
  const paidOnline = (b) => !['venue', 'walk-in', 'cash'].includes(String(b.method || '').toLowerCase())

  const requests = bookings.filter((b) => b.status === 'refund_pending')
  const affected = bookings.filter((b) => b.status === 'confirmed' && paidOnline(b) && onPausedVenue(b))
  const history = bookings.filter((b) => b.status === 'refunded')

  const methodLabel = (m) => {
    const key = String(m || '').toLowerCase()
    return { upi: 'UPI', card: 'Card', netbanking: 'Net banking', online: 'Online', venue: 'Pay at venue', 'walk-in': 'Walk-in', cash: 'Cash' }[key] || m || '—'
  }

  const list = tab === 'Requests' ? requests : tab === 'Paused venues' ? affected : history
  const counts = { Requests: requests.length, 'Paused venues': affected.length, History: history.length }

  const refund = (b, why) => openModal({
    title: 'Refund ' + bookingRef(b.id) + '?',
    body: (b.customer || 'The customer') + ' paid ' + fmt(b.amountNum) + '. ' + (why || 'The refund goes back the same way in 5–7 days.') + ' Note: if this booking’s week already has a payout row, that payout does NOT auto-adjust — settle the difference with the vendor manually.',
    confirmLabel: 'Issue refund', danger: true, needsReason: true,
    amount: String(Number(b.amountNum) || 0), maxAmount: Number(b.amountNum) || 0,
    onConfirm: (reason, amount) => {
      updateBooking(b.id, { status: 'refunded' })
      const amt = fmt(Number(amount))
      logAudit('Issued refund', bookingRef(b.id) + ' · ' + amt, (b.status || 'confirmed') + ' → refunded (' + reason + ')')
      showToast('Refund of ' + amt + ' issued for ' + bookingRef(b.id))
    },
  })

  const card = (b) => {
    const [badge, label] = statusMeta(RF_META, b.status)
    const canRefund = b.status !== 'refunded'
    return (
      <div key={b.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: 15.5 }}>{bookingRef(b.id)}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 16 }}>{b.venue}</span>
          {tab === 'Paused venues' && (
            <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: 'var(--warning-50)', color: 'var(--warning-700)', border: '1px solid var(--warning-600)' }}>
              Venue paused
            </span>
          )}
          <span style={{ flex: 1 }} />
          <Badge status={badge} size="sm">{label}</Badge>
        </div>
        <div style={{ fontSize: 14.5, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>{b.customer}{b.phone ? ' · ' + b.phone : ''}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{b.slot}</span>
          <span>{methodLabel(b.method)}</span>
          <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(b.amountNum)}</span>
        </div>
        {canRefund && paidOnline(b) && (
          <div>
            <Button variant="secondary" size="sm" onClick={() => refund(b, tab === 'Paused venues' ? 'The venue was paused — the customer cannot be hosted.' : '')}>
              Issue refund
            </Button>
          </div>
        )}
        {canRefund && !paidOnline(b) && (
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--warning-600)' }}>
            No online payment was collected ({methodLabel(b.method)}) — nothing to refund from the platform.
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Requests', 'Paused venues', 'History'].map((label) => {
          const on = label === tab
          return (
            <button
              key={label}
              onClick={() => setTab(label)}
              style={{
                border: `1px solid ${on ? 'var(--navy-800)' : 'var(--border-default)'}`,
                background: on ? 'var(--navy-800)' : 'var(--surface-card)',
                color: on ? '#fff' : 'var(--text-heading)',
                fontFamily: 'var(--font-body)', fontSize: compact ? 14 : 15, fontWeight: 700,
                padding: '9px 16px', borderRadius: 999, cursor: 'pointer', transition: '.15s ease',
              }}
            >
              {label}{counts[label] > 0 ? ` · ${counts[label]}` : ''}
            </button>
          )
        })}
      </div>

      {tab === 'Paused venues' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'var(--warning-50)', border: '1px solid var(--warning-600)', fontSize: 14.5, color: 'var(--text-heading)', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', marginTop: 1, color: 'var(--warning-600)' }}><Icon name="clock" size={17} /></span>
          These customers paid ONLINE for venues you paused (e.g. rain / maintenance). Refund them here, or unpause the venue from the Venues panel if it can host them after all.
          {' '}<b>Check each booking&apos;s date &amp; slot first</b> — bookings that already took place were hosted and shouldn&apos;t be refunded.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(card)}
        {list.length === 0 && (
          <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>
            {tab === 'Requests' ? 'No refund requests right now.' : tab === 'Paused venues' ? 'No paid bookings on paused venues — all clear.' : 'No refunds issued yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
