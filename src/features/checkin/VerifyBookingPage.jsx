import { useRef, useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import { adminApi } from '../../services/adminApi.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

/**
 * Verify booking — look up ANY booking ID (venue booking or event ticket)
 * across every venue and event: does it exist, what is its payment /
 * confirmation / refund state, where is it for, and has it been checked in
 * (when, by whom).
 *
 * READ-ONLY. The super admin investigates; it never checks anyone in. Entry
 * is recorded only by the venue's own vendor in the vendor portal, and the
 * backend endpoint (POST /api/admin/check-ins/verify) has no write path at
 * all — this page could not admit a customer even if it tried.
 */

// Verdict code → badge tone + short label.
const VERDICT = {
  VALID: ['success', 'Valid for entry today'],
  ALREADY_CHECKED_IN: ['warning', 'Already checked in'],
  WRONG_DATE: ['warning', 'Not for today'],
  PAYMENT_INCOMPLETE: ['error', 'Payment incomplete'],
  CANCELLED: ['error', 'Cancelled'],
  REFUNDED: ['error', 'Refunded / refund pending'],
  INELIGIBLE: ['error', 'Not eligible'],
  INVALID_ID: ['neutral', 'Not found'],
  SHORT_REF: ['warning', 'Full ID needed'],
}

const STATUS_TONE = {
  confirmed: 'success', completed: 'success', payment_pending: 'pending', failed: 'error',
  cancelled: 'neutral', removed: 'neutral', refund_pending: 'warning', refunded: 'info',
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return iso }
}

function Row({ label, children }) {
  if (children == null || children === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderTop: '1px solid var(--neutral-100)', fontSize: 15 }}>
      <span style={{ color: 'var(--text-muted)', flex: '0 0 auto' }}>{label}</span>
      <span style={{ color: 'var(--text-heading)', fontWeight: 600, textAlign: 'right', overflowWrap: 'anywhere', minWidth: 0 }}>{children}</span>
    </div>
  )
}

function Group({ title, children }) {
  return (
    <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )
}

function Result({ data }) {
  const [tone, label] = VERDICT[data.code] || ['neutral', data.code]
  const b = data.booking
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" role="status" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Badge status={tone} size="md">{label}</Badge>
          {data.title !== label && (
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>{data.title}</span>
          )}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-body)' }}>{data.message}</div>
        {data.found && (
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Verification only — this page never checks a customer in. Entry is recorded by the venue&apos;s vendor.
          </div>
        )}
      </div>

      {b && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <Group title="Booking">
            <Row label="Booking ID"><code style={{ fontFamily: 'var(--font-mono)' }}>{b.id}</code></Row>
            <Row label="Type">{b.kind === 'event' ? 'Event ticket order' : 'Venue booking'}</Row>
            <Row label="Status">
              <Badge status={STATUS_TONE[b.status] || 'neutral'}>{b.status}</Badge>
            </Row>
            {b.displayStatus && b.displayStatus !== b.status && <Row label="Shown to customer as">{b.displayStatus}</Row>}
            <Row label="Booked on">{fmtDateTime(b.createdAt)}</Row>
          </Group>

          <Group title={b.kind === 'event' ? 'Event' : 'Venue'}>
            <Row label={b.kind === 'event' ? 'Event' : 'Venue'}>{(b.kind === 'event' ? b.eventName : b.venueName) || '—'}</Row>
            {b.unitLabel && <Row label="Unit">{b.unitLabel}</Row>}
            {b.kind === 'event' && b.venueName && <Row label="Held at">{b.venueName}</Row>}
            {b.kind === 'event' && b.eventStatus && <Row label="Event status">{b.eventStatus}</Row>}
            {b.vendor && <Row label="Vendor">{[b.vendor.name, b.vendor.phone].filter(Boolean).join(' · ')}</Row>}
            {b.organizer && <Row label="Organiser">{b.organizer}</Row>}
            <Row label="Date">{fmtDate(b.date)}</Row>
            {b.kind === 'event'
              ? <Row label="Time">{b.startTime && b.endTime ? `${b.startTime} – ${b.endTime}` : null}</Row>
              : <Row label="Slots">{(b.slots || []).join(', ') || null}</Row>}
            {b.kind === 'event' && (
              <Row label="Tickets">
                {`${b.tickets} (admits ${b.admits})`}
                {Array.isArray(b.items) && b.items.length > 0 && (
                  <span style={{ display: 'block', fontWeight: 500, color: 'var(--text-muted)', fontSize: 13.5 }}>
                    {b.items.map((i) => `${i.qty} × ${i.label}`).join(', ')}
                  </span>
                )}
              </Row>
            )}
          </Group>

          <Group title="Customer & payment">
            <Row label="Customer">{b.customerName || '—'}</Row>
            <Row label="Phone">{b.phone || '—'}</Row>
            <Row label="Amount">{inr(b.amount)}</Row>
            <Row label="Paid online">{b.paidOnline != null ? inr(b.paidOnline) : null}</Row>
            {b.dueAtVenue > 0 && <Row label="Due at venue">{inr(b.dueAtVenue)}</Row>}
            {b.method && <Row label="Method">{b.method}{b.walkIn ? ' (walk-in)' : ''}</Row>}
            <Row label="Payment ID">{b.paymentId ? <code style={{ fontFamily: 'var(--font-mono)' }}>{b.paymentId}</code> : null}</Row>
            {b.refundAmount != null && <Row label="Refund">{inr(b.refundAmount)}{b.refundReason ? ` · ${b.refundReason}` : ''}</Row>}
          </Group>

          <Group title="Check-in">
            <Row label="Checked in">{b.checkedInAt ? fmtDateTime(b.checkedInAt) : 'Not checked in'}</Row>
            {b.checkedInBy && (
              <Row label="By">{[b.checkedInBy.name, b.checkedInBy.phone].filter(Boolean).join(' · ')}</Row>
            )}
            <Row label="Eligible today">{data.eligibleToday ? 'Yes — at its own venue/event' : 'No'}</Row>
          </Group>
        </div>
      )}
    </div>
  )
}

export default function VerifyBookingPage() {
  const { setAuthed } = useAdmin()
  const [input, setInput] = useState('')
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const busy = useRef(false)

  const verify = async (e) => {
    e.preventDefault()
    const id = input.trim()
    if (!id || busy.current) return
    busy.current = true
    setState('loading')
    setError('')
    try {
      setData(await adminApi.verifyBooking(id))
      setState('ready')
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setAuthed(false)   // session lapsed → back to sign-in, like every admin call
        return
      }
      setData(null)
      setError(
        err.status === 429 ? 'Too many lookups — please wait a minute and try again.'
          : err.status === 0 || !err.status ? 'Couldn’t reach the server. Check your connection and try again.'
            : err.message || 'Verification failed. Please try again.',
      )
      setState('error')
    } finally {
      busy.current = false
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>
      <form className="card" onSubmit={verify} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--brand-accent)', display: 'inline-flex' }}><Icon name="shield-check" size={22} /></span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>Look up a booking ID</div>
            <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>
              The 6-character Booking ID of any venue booking or event ticket, across all venues. Read-only.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. K7M2QX"
            aria-label="Booking ID"
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: '1 1 260px', minWidth: 0, height: 46, padding: '0 14px', borderRadius: 12,
              border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', fontSize: 16,
              color: 'var(--text-heading)', background: 'var(--surface-card)',
            }}
          />
          <Button disabled={!input.trim() || state === 'loading'}>
            <Icon name="search" size={18} />
            {state === 'loading' ? 'Verifying…' : 'Verify'}
          </Button>
        </div>
      </form>

      {state === 'error' && (
        <div className="card" role="alert" style={{ padding: 16, display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--status-error-fg)', background: 'var(--status-error-bg)' }}>
          <Icon name="alert-triangle" size={20} />
          <span style={{ fontSize: 15 }}>{error}</span>
        </div>
      )}
      {state === 'ready' && data && <Result data={data} />}
    </div>
  )
}
