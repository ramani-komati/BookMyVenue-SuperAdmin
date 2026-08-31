import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { bookingRef, fmt, statusMeta } from '../../utils/format.js'
import { displayInclusiveEnd } from '../../utils/slots.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'

const BK_META = {
  confirmed: ['success', 'Confirmed'],
  completed: ['neutral', 'Completed'],
  cancelled: ['error', 'Cancelled'],
  refund_pending: ['warning', 'Refund pending'],
  refunded: ['info', 'Refunded'],
}

const TODAY = 15

const selectStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)',
  minHeight: 40, padding: '0 12px', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', borderRadius: 10, cursor: 'pointer',
}

const GRID = { display: 'grid', gridTemplateColumns: '120px 1.5fr 1.1fr 1.3fr 110px 95px 150px', minWidth: 1040, gap: 10 }

export default function BookingsPage() {
  const { bookings, updateBooking, openModal, logAudit, showToast, settings } = useAdmin()
  // Per-row: the booking's own frozen fee (what was actually charged) wins;
  // the current platform fee is only the fallback for older records.
  const rowFee = (b) => '₹' + (b.fee != null && Number.isFinite(Number(b.fee)) ? Number(b.fee) : Number(settings?.fee) || 20)
  // Friendly payment-method label. "venue" = customer pays the FULL amount at
  // the venue (its platform fee is recovered from the vendor's weekly payout).
  const METHOD_LABELS = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', venue: 'Pay at venue', 'walk-in': 'Walk-in' }
  const methodLabel = (m) => METHOD_LABELS[String(m || '').toLowerCase()] || m || '—'
  const atVenue = (b) => String(b.method || '').toLowerCase() === 'venue'
  const { width } = useViewport()
  const compact = width < 768

  const location = useLocation()
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterDate, setFilterDate] = useState('All')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState(location.state?.expandId || null)

  // Deep links from activity feed / user drawer expand the target booking
  useEffect(() => {
    if (location.state?.expandId) setExpandedId(location.state.expandId)
  }, [location.state])

  const q = query.trim().toLowerCase()
  const day = (b) => parseInt(b.slot, 10) || 0
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
  const filtered = bookings.filter((b) =>
    (filterStatus === 'All' || b.status === filterStatus) &&
    (filterDate === 'All' || (filterDate === 'today' ? day(b) === TODAY : filterDate === 'upcoming' ? day(b) > TODAY : day(b) < TODAY)) &&
    (!q || (b.id + ' ' + bookingRef(b.id) + ' ' + b.venue + ' ' + b.customer + ' ' + (b.phone || '')).toLowerCase().includes(q)))

  const refund = (b) => openModal({
    title: 'Refund ' + bookingRef(b.id) + '?',
    body: b.customer + ' paid ' + fmt(b.amountNum) + ' by ' + b.method + '. The refund goes back the same way in 5–7 days. Note: if this booking’s week already has a payout row, that payout does NOT auto-adjust — settle the difference with the vendor manually.',
    confirmLabel: 'Issue refund', danger: true, needsReason: true,
    amount: String(b.amountNum), maxAmount: b.amountNum,
    onConfirm: (reason, amount) => {
      updateBooking(b.id, { status: 'refunded' })
      const amt = fmt(Number(amount))
      logAudit('Issued refund', bookingRef(b.id) + ' · ' + amt, b.status + ' → refunded (' + reason + ')')
      showToast('Refund of ' + amt + ' issued for ' + bookingRef(b.id))
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="All">Status: All</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refund_pending">Refund pending</option>
          <option value="refunded">Refunded</option>
        </select>
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={selectStyle}>
          <option value="All">Dates: All</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Earlier</option>
        </select>
        <input
          className="bmva" type="text" placeholder="Filter by venue, customer or ID…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, color: 'var(--text-heading)', minHeight: 40, padding: '0 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 10, width: compact ? '100%' : 280 }}
        />
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
          {filtered.length} booking{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((b) => {
            const [badge, label] = statusMeta(BK_META, b.status)
            const expanded = expandedId === b.id
            const canRefund = b.status === 'confirmed' || b.status === 'refund_pending'
            return (
              <div key={b.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div onClick={() => setExpandedId(expanded ? null : b.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: 15.5 }}>{bookingRef(b.id)}</span>
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
          <div>Booking</div><div>Venue</div><div>Customer</div><div>Date &amp; slot</div><div>Amount</div><div>Method</div><div>Status</div>
        </div>

        {filtered.map((b) => {
          const [badge, label] = statusMeta(BK_META, b.status)
          const expanded = expandedId === b.id
          const canRefund = b.status === 'confirmed' || b.status === 'refund_pending'
          return (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--neutral-100)', minWidth: 1040 }}>
              <div
                onClick={() => setExpandedId(expanded ? null : b.id)}
                className="hover-row"
                style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{bookingRef(b.id)}</div>
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
