import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { bookingRef, fmt, statusMeta } from '../../utils/format.js'
import { displayInclusiveEnd, localTodayISO } from '../../utils/slots.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { orderBadge } from '../events/orderStatus.js'
import { KIND_LABEL, STATUS_OPTIONS, countByKind, filterBookings, unifyBookings } from './unifiedBookings.js'

const BK_META = {
  confirmed: ['success', 'Confirmed'],
  completed: ['neutral', 'Completed'],
  cancelled: ['error', 'Cancelled'],
  refund_pending: ['warning', 'Refund pending'],
  refunded: ['info', 'Refunded'],
}

const selectStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)',
  minHeight: 40, padding: '0 12px', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', borderRadius: 10, cursor: 'pointer',
}

// "12 Oct 2026" for an event order's ISO date.
const dateLabel = (iso) => {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00`)
  return Number.isNaN(d.getTime()) ? String(iso)
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
const eventWhen = (o) => dateLabel(o.date) + (o.startTime ? ` · ${o.startTime}${o.endTime ? ` – ${o.endTime}` : ''}` : '')
const ticketSummary = (o) => (o.items || []).map((i) => `${i.qty}× ${i.label}`).join(', ')

// Small "Venue booking" / "Event ticket" chip under the reference.
function KindChip({ kind }) {
  const event = kind === 'event'
  return (
    <span style={{
      display: 'inline-block', marginTop: 4, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
      padding: '2px 8px', borderRadius: 999,
      color: event ? 'var(--status-info-fg)' : 'var(--navy-600)',
      background: event ? 'var(--status-info-bg)' : 'var(--navy-50)',
    }}>{KIND_LABEL[kind]}</span>
  )
}

// Expanded panel for an event ticket order: tickets, fee, payment record and
// the (server-guarded) remove action.
function EventOrderDetails({ o, compact, onRemove }) {
  const line = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: compact ? 15 : 16 }
  const strong = { fontWeight: 700, color: 'var(--text-heading)' }
  const canRemove = o.removable && !!o.eventId
  return (
    <div style={{ display: 'flex', flexDirection: compact ? 'column' : 'row', gap: compact ? 10 : 24, alignItems: compact ? 'stretch' : 'flex-start', background: '#F4EAE5', borderRadius: 12, padding: compact ? 14 : 18, margin: compact ? 0 : '0 12px 12px' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Tickets</div>
        {(o.items || []).map((i) => (
          <div key={i.key || i.label} style={line}>
            <span>{i.qty}× {i.label}{i.price != null ? ` @ ${fmt(i.price)}` : ''}</span>
            <span style={strong}>{fmt(i.subtotal != null ? i.subtotal : (Number(i.qty) || 0) * (Number(i.price) || 0))}</span>
          </div>
        ))}
        <div style={line}><span>Platform fee</span><span style={strong}>{fmt(o.fee)}</span></div>
        <div style={{ ...line, borderTop: '1px solid var(--border-subtle)', paddingTop: 7 }}>
          <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>Total</span>
          <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(o.amount)}</span>
        </div>
        {!o.paid && (
          <div style={{ fontSize: 13.5, color: 'var(--warning-600)', fontWeight: 700 }}>
            No captured payment is recorded for this order — it is not counted as revenue.
          </div>
        )}
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
          Order ID <span style={{ fontFamily: 'monospace' }}>{o.id}</span>
          {o.razorpayOrderId && <> · Gateway order <span style={{ fontFamily: 'monospace' }}>{o.razorpayOrderId}</span></>}
          {o.razorpayPaymentId && <> · Payment <span style={{ fontFamily: 'monospace' }}>{o.razorpayPaymentId}</span></>}
          {o.refundReason && <> · Refund reason: {o.refundReason}</>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: compact ? 'none' : 220 }}>
        {canRemove ? (
          <Button variant="secondary" size="sm" block={compact} onClick={() => onRemove(o)}>Remove order</Button>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {o.removable ? 'This order is no longer linked to an event, so it cannot be removed here.' : (o.removeBlockedReason || 'Cannot be removed.')}
          </div>
        )}
      </div>
    </div>
  )
}

const GRID = { display: 'grid', gridTemplateColumns: '120px 1.5fr 1.1fr 1.3fr 110px 95px 150px', minWidth: 1040, gap: 10 }

export default function BookingsPage() {
  const { bookings, updateBooking, eventOrders, removeEventOrder, openModal, logAudit, showToast, settings } = useAdmin()
  // Per-row: the booking's own frozen fee (what was actually charged) wins;
  // the current platform fee is only the fallback for older records.
  const rowFee = (b) => '₹' + (b.fee != null && Number.isFinite(Number(b.fee)) ? Number(b.fee) : Number(settings?.fee) || 20)
  // Friendly payment-method label. "venue" = customer pays the FULL amount at
  // the venue (its platform fee is recovered from the vendor's weekly payout).
  const METHOD_LABELS = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', venue: 'Pay at venue', 'walk-in': 'Walk-in', online: 'Online' }
  const methodLabel = (m) => METHOD_LABELS[String(m || '').toLowerCase()] || m || '—'
  const atVenue = (b) => String(b.method || '').toLowerCase() === 'venue'
  // Part payment: only `payNow` was captured online; the rest is due at the venue.
  const partPaid = (b) => !atVenue(b) && b.payNow != null && Number(b.payNow) < (Number(b.amountNum) || 0)
  const onlinePaid = (b) => Number(b.payNow) || 0
  const venueDue = (b) => b.atVenue != null ? Number(b.atVenue) : Math.max(0, (Number(b.amountNum) || 0) - onlinePaid(b))
  const { width } = useViewport()
  const compact = width < 768

  const location = useLocation()
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterDate, setFilterDate] = useState('All')
  const [query, setQuery] = useState('')
  // Rows are keyed "venue:<id>" / "event:<id>" — the two tables have separate
  // id spaces. Deep links (activity feed / user drawer) carry a VENUE id.
  const [expandedId, setExpandedId] = useState(location.state?.expandId ? `venue:${location.state.expandId}` : null)

  // Deep links from activity feed / user drawer expand the target booking
  useEffect(() => {
    if (location.state?.expandId) setExpandedId(`venue:${location.state.expandId}`)
  }, [location.state])

  const today = localTodayISO()
  const rows = useMemo(() => unifyBookings(bookings, eventOrders), [bookings, eventOrders])
  // Only offer statuses the selected booking type can actually have.
  const statusOptions = STATUS_OPTIONS.filter((o) => filterType === 'All' || o.kinds.includes(filterType))
  const changeType = (type) => {
    setFilterType(type)
    if (filterStatus !== 'All' && !STATUS_OPTIONS.some((o) => o.value === filterStatus && (type === 'All' || o.kinds.includes(type)))) {
      setFilterStatus('All')
    }
  }
  // Which screen/pitch was booked: unit bookings target the unit's own
  // listing ("RK PARTY HOUSE — Screen 2"), so the unit is recoverable from
  // the name; an explicit unitLabel from the API wins when present.
  const splitUnit = (b) => {
    const full = String(b.venue || '')
    const hasSep = full.includes(' — ')
    return {
      base: hasSep ? full.split(' — ')[0] : full,
      unit: b.unitLabel || (hasSep ? full.split(' — ').slice(1).join(' — ') : ''),
    }
  }
  const filtered = filterBookings(rows, { type: filterType, status: filterStatus, date: filterDate, query }, today)
  const counts = countByKind(filtered)

  // Remove an UNPAID event order. The server re-checks everything (paid,
  // refunded and mid-checkout orders are refused; the order must belong to
  // its event), so this confirmation is a guard against slips, not the rule.
  const removeOrder = (o) => openModal({
    title: `Remove order ${o.id}?`,
    body: `${o.customer || 'This customer'}'s ${o.tickets} ticket${o.tickets === 1 ? '' : 's'} for ${o.eventName || 'this event'} (${fmt(o.amount)}, no payment captured) will be removed from the Bookings lists. The record is kept on the server for the audit trail; nothing is refunded or charged.`,
    confirmLabel: 'Remove order', danger: true, needsReason: true,
    onConfirm: (reason) => {
      removeEventOrder(o, reason)
        .then(() => {
          setExpandedId((k) => (k === o.key ? null : k))
          showToast(`Order ${o.id} removed`)
        })
        .catch((err) => showToast(
          err.status === 401 || err.status === 403
            ? 'Your admin session has expired. Sign in again to remove orders.'
            : `Could not remove ${o.id}: ${err.message || 'request failed'}`,
        ))
    },
  })

  const refund = (b) => {
    // Only the amount actually captured ONLINE can be refunded — part-payment
    // bookings collect the rest as cash at the venue (never received here).
    const captured = b.payNow != null ? Number(b.payNow) : Number(b.amountNum) || 0
    const partPaid = b.payNow != null && Number(b.payNow) < (Number(b.amountNum) || 0)
    return openModal({
    title: 'Refund ' + bookingRef(b.id) + '?',
    body: b.customer + ' paid ' + fmt(captured) + ' online' + (partPaid ? ` (₹${Number(b.atVenue) || (Number(b.amountNum) || 0) - captured} was collected at the venue, not refundable here)` : ' by ' + b.method) + '. The refund goes back the same way in 5–7 days. Note: if this booking’s week already has a payout row, that payout does NOT auto-adjust — settle the difference with the vendor manually.',
    confirmLabel: 'Issue refund', danger: true, needsReason: true,
    amount: String(captured), maxAmount: captured,
    onConfirm: (reason, amount) => {
      updateBooking(b.id, { status: 'refunded' })
      const amt = fmt(Number(amount))
      logAudit('Issued refund', bookingRef(b.id) + ' · ' + amt, b.status + ' → refunded (' + reason + ')')
      showToast('Refund of ' + amt + ' issued for ' + bookingRef(b.id))
    },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterType} onChange={(e) => changeType(e.target.value)} style={selectStyle} aria-label="Booking type">
          <option value="All">Type: All</option>
          <option value="venue">Venue bookings</option>
          <option value="event">Event tickets</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle} aria-label="Status">
          <option value="All">Status: All</option>
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={selectStyle}>
          <option value="All">Dates: All</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Earlier</option>
        </select>
        <input
          className="bmva" type="text" placeholder="Search ID, venue, event or customer…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: 'var(--text-heading)', minHeight: 40, padding: '0 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 10, width: compact ? '100%' : 280 }}
        />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
          {filtered.length} booking{filtered.length === 1 ? '' : 's'}
          {filterType === 'All' && filtered.length > 0 && ` · ${counts.venue} venue · ${counts.event} event`}
        </div>
      </div>

      {compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((b) => {
            if (b.kind === 'event') {
              const [tone, text] = orderBadge(b)
              const expanded = expandedId === b.key
              return (
                <div key={b.key} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div onClick={() => setExpandedId(expanded ? null : b.key)} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: 14, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{b.id}</span>
                      <KindChip kind="event" />
                      <span style={{ flex: 1 }} />
                      <Badge status={tone} size="sm">{text}</Badge>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{b.eventName || '—'}</div>
                    <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>{b.customer || '—'}{b.phone ? ` · ${b.phone}` : ''} · {eventWhen(b)}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{ticketSummary(b) || `${b.tickets || 0} tickets`}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(b.amount)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{methodLabel(b.method)}</span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)' }}>{expanded ? 'Hide details ▲' : 'View details ▼'}</span>
                    </div>
                  </div>
                  {expanded && <EventOrderDetails o={b} compact onRemove={removeOrder} />}
                </div>
              )
            }
            const [badge, label] = statusMeta(BK_META, b.status)
            const expanded = expandedId === b.key
            const canRefund = b.status === 'confirmed' || b.status === 'refund_pending'
            return (
              <div key={b.key} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div onClick={() => setExpandedId(expanded ? null : b.key)} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: 15.5 }}>{bookingRef(b.id)}</span>
                    <KindChip kind="venue" />
                    <span style={{ flex: 1 }} />
                    <Badge status={badge} size="sm">{label}</Badge>
                  </div>
                  {(() => { const u = splitUnit(b); return (
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {u.base}
                      {u.unit && <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '3px 9px', borderRadius: 999 }}>{u.unit}</span>}
                    </div>
                  ) })()}
                  <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>{b.customer}{b.phone ? ` · ${b.phone}` : ''} · {displayInclusiveEnd(b.slot)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(b.amountNum)}</span>
                    <span style={{ color: atVenue(b) ? 'var(--warning-600)' : 'var(--text-muted)', fontWeight: atVenue(b) ? 700 : 400 }}>{methodLabel(b.method)}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)' }}>{expanded ? 'Hide bill ▲' : 'View bill ▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F4EAE5', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Bill breakdown</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}><span>{displayInclusiveEnd(b.slotsDesc)}</span><span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{b.slotsAmt}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}><span>Add-ons</span><span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{b.addons}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}><span>Platform fee</span><span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{rowFee(b)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 7, fontSize: 15 }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>Total</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(b.amountNum)}</span>
                    </div>
                    {partPaid(b) && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}><span style={{ color: 'var(--success-700)', fontWeight: 700 }}>Paid online</span><span style={{ fontWeight: 800, color: 'var(--success-700)' }}>{fmt(onlinePaid(b))}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 15 }}><span style={{ color: 'var(--warning-600)', fontWeight: 700 }}>Collected at venue</span><span style={{ fontWeight: 800, color: 'var(--warning-600)' }}>{fmt(venueDue(b))}</span></div>
                      </>
                    )}
                    {atVenue(b) && (
                      <div style={{ fontSize: 13.5, color: 'var(--warning-600)', fontWeight: 700 }}>
                        Paid at the venue — the {rowFee(b)} platform fee is deducted from the vendor&apos;s weekly payout.
                      </div>
                    )}
                    {canRefund && (
                      <Button variant="secondary" size="sm" block onClick={() => refund(b)}>Issue refund</Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>No bookings match these filters.</div>
          )}
        </div>
      ) : (
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Booking</div><div>Venue / event</div><div>Customer</div><div>Date &amp; slot</div><div>Amount</div><div>Method</div><div>Status</div>
        </div>

        {filtered.map((b) => {
          if (b.kind === 'event') {
            const [tone, text] = orderBadge(b)
            const expanded = expandedId === b.key
            return (
              <div key={b.key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--neutral-100)', minWidth: 1040 }}>
                <div
                  onClick={() => setExpandedId(expanded ? null : b.key)}
                  className="hover-row"
                  style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'monospace', fontSize: 13, overflowWrap: 'anywhere' }}>{b.id}</div>
                    <KindChip kind="event" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.eventName || '—'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticketSummary(b) || `${b.tickets || 0} tickets`}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer || '—'}</div>
                    {b.phone && <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{b.phone}</div>}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>{eventWhen(b)}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(b.amount)}</div>
                  <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{methodLabel(b.method)}</div>
                  <div><Badge status={tone} size="sm">{text}</Badge></div>
                </div>
                {expanded && <EventOrderDetails o={b} onRemove={removeOrder} />}
              </div>
            )
          }
          const [badge, label] = statusMeta(BK_META, b.status)
          const expanded = expandedId === b.key
          const canRefund = b.status === 'confirmed' || b.status === 'refund_pending'
          return (
            <div key={b.key} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--neutral-100)', minWidth: 1040 }}>
              <div
                onClick={() => setExpandedId(expanded ? null : b.key)}
                className="hover-row"
                style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{bookingRef(b.id)}</div>
                  <KindChip kind="venue" />
                </div>
                {(() => { const u = splitUnit(b); return (
                  <div style={{ minWidth: 0 }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.base}</div>
                    {u.unit && <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy-600)' }}>{u.unit}</div>}
                  </div>
                ) })()}
                <div style={{ minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer}</div>
                  {b.phone && <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{b.phone}</div>}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>{displayInclusiveEnd(b.slot)}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(b.amountNum)}</div>
                <div style={{ fontSize: 15, color: atVenue(b) ? 'var(--warning-600)' : 'var(--text-muted)', fontWeight: atVenue(b) ? 700 : 400 }}>{methodLabel(b.method)}</div>
                <div><Badge status={badge} size="sm">{label}</Badge></div>
              </div>

              {expanded && (
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', background: '#F4EAE5', borderRadius: 12, padding: 18, margin: '0 12px 12px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 16 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Bill breakdown</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{displayInclusiveEnd(b.slotsDesc)}</span><span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{b.slotsAmt}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Add-ons</span><span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{b.addons}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform fee</span><span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{rowFee(b)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 7 }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>Total</span>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(b.amountNum)}</span>
                    </div>
                    {partPaid(b) && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--success-700)', fontWeight: 700 }}>Paid online</span><span style={{ fontWeight: 800, color: 'var(--success-700)' }}>{fmt(onlinePaid(b))}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--warning-600)', fontWeight: 700 }}>Collected at venue</span><span style={{ fontWeight: 800, color: 'var(--warning-600)' }}>{fmt(venueDue(b))}</span></div>
                      </>
                    )}
                    {atVenue(b) && (
                      <div style={{ fontSize: 13.5, color: 'var(--warning-600)', fontWeight: 700 }}>
                        Paid at the venue — the {rowFee(b)} platform fee is deducted from the vendor&apos;s weekly payout.
                      </div>
                    )}
                  </div>
                  {canRefund && (
                    <Button variant="secondary" size="sm" onClick={() => refund(b)}>Issue refund</Button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>No bookings match these filters.</div>
        )}
      </div>
      )}
    </div>
  )
}
