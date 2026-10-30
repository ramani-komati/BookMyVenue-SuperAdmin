import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { stateBadges } from '../bookings/unifiedBookings.js'
import { displayRef } from '../../utils/format.js'

/**
 * EventOrdersModal — who bought tickets for one event, and whether the money
 * actually arrived.
 *
 * Loaded on demand rather than carried in /bootstrap: a popular event's order
 * list is unbounded, and the admin opens it for one event at a time.
 *
 * Unpaid holds ARE listed, with their real status. "Someone is mid-checkout"
 * is exactly what an admin chasing a payment needs to see — but the totals
 * count confirmed money only, so the revenue figure can never be inflated by
 * a hold that may never complete.
 */

const inr = (n) => Number(n || 0).toLocaleString('en-IN')


const dateLabel = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(`${iso}T00:00`).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return String(iso) }
}

export default function EventOrdersModal({ event, onClose }) {
  // Removal goes through the context so the main Bookings page drops the
  // same order too — both views must list the same orders.
  const { removeEventOrder } = useAdmin()
  const [state, setState] = useState('loading')   // loading | ready | error
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  // Remove flow: which row is asking "are you sure?", which is in flight,
  // and the last failure (shown above the table, not as a toast, so it sits
  // next to the row it is about).
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  // `quiet` refreshes after an action without blanking the table.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setState('loading')
    setError('')
    try {
      setData(await adminApi.getEventOrders(event.id))
      setState('ready')
    } catch (err) {
      setError(err.message || 'Could not load the bookings.')
      setState('error')
    }
  }, [event.id])

  const remove = async (order) => {
    setBusyId(order.id)
    setActionError('')
    try {
      await removeEventOrder({ ...order, eventId: event.id })
      setConfirmId(null)
      // Re-read rather than splice locally, so the list AND the totals are
      // the server's figures after the change.
      await load({ quiet: true })
    } catch (err) {
      setActionError(
        err.status === 401 || err.status === 403
          ? 'Your admin session has expired. Sign in again to remove bookings.'
          : `Could not remove ${displayRef(order)}: ${err.message || 'request failed.'}`,
      )
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const orders = data?.orders || []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bookings for ${event.name}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(8, 15, 30, .45)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        padding: 'max(12px, env(safe-area-inset-top)) 12px 12px',
        overflowY: 'auto', overscrollBehavior: 'contain',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#FBF6F4', borderRadius: 18, width: '100%', maxWidth: 900,
          boxShadow: 'var(--shadow-lg, 0 18px 50px rgba(8,15,30,.28))',
          marginBottom: 24, display: 'flex', flexDirection: 'column',
        }}
      >
        <div
          style={{
            position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface-card)',
            borderBottom: '1px solid var(--border-subtle)', borderRadius: '18px 18px 0 0',
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>
              Bookings
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
              {event.name}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {state === 'ready' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                ['Orders', orders.length],
                ['Tickets sold', data.ticketsSold],
                ['Revenue', `₹${inr(data.revenue)}`],
              ].map(([title, value]) => (
                <div
                  key={title}
                  className="card"
                  style={{ padding: '12px 16px', flex: '1 1 150px', minWidth: 0 }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-heading)' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {state === 'loading' && (
            <div className="card" style={{ padding: '44px 24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
              Loading bookings…
            </div>
          )}

          {state === 'error' && (
            <div
              className="card"
              style={{ padding: '36px 24px', textAlign: 'center', borderColor: 'var(--error-500)' }}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--error-600)' }}>
                Couldn&apos;t load the bookings
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 14px' }}>{error}</div>
              <Button variant="secondary" size="sm" onClick={() => load()}>Retry</Button>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="card"
              style={{
                padding: '12px 16px', borderColor: 'var(--error-500)',
                color: 'var(--error-600)', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
              }}
            >
              <span>{actionError}</span>
              <Button variant="ghost" size="sm" onClick={() => setActionError('')}>Dismiss</Button>
            </div>
          )}

          {state === 'ready' && orders.length === 0 && (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--neutral-100)',
                  color: 'var(--neutral-600)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 14px',
                }}
              >
                <Icon name="ticket" size={26} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-heading)' }}>
                No bookings yet
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 5 }}>
                Ticket purchases for this event will appear here.
              </div>
            </div>
          )}

          {state === 'ready' && orders.length > 0 && (
            // The table scrolls INSIDE this box on a narrow screen, so the
            // page itself never scrolls sideways.
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr style={{ background: 'var(--neutral-100)' }}>
                    {['Order', 'Customer', 'Event date', 'Tickets', 'Amount', 'Payment', 'Action'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left', fontSize: 13, fontWeight: 800,
                          color: 'var(--text-muted)', padding: '11px 14px', whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    // Shared with the main Bookings page (unifiedBookings.stateBadges):
                    // the ticket's status and its payment's status, separately.
                    const sb = stateBadges({ ...o, kind: 'event' })
                    const confirming = confirmId === o.id
                    const busy = busyId === o.id
                    return (
                      <tr key={o.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '11px 14px', fontSize: 13.5, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {displayRef(o)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 14.5 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>
                            {o.customer || '—'}
                          </div>
                          {o.phone && (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.phone}</div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 14, whiteSpace: 'nowrap' }}>
                          {dateLabel(o.date)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 14 }}>
                          {o.tickets}
                          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                            {(o.items || []).map((i) => `${i.qty}× ${i.label}`).join(', ')}
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ₹{inr(o.amount)}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                            <Badge status={sb.booking[0]} size="sm">{sb.booking[1]}</Badge>
                            <Badge status={sb.payment[0]} size="sm">{sb.payment[1]}</Badge>
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', width: 160 }}>
                          {!o.removable ? (
                            // Paid / refunded / mid-checkout — the server says why.
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 160, lineHeight: 1.4 }}>
                              {o.removeBlockedReason || 'Cannot be removed.'}
                            </div>
                          ) : confirming ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.4 }}>
                                Remove this booking?
                                <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                                  {displayRef(o)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmId(null)}>
                                  Keep
                                </Button>
                                <Button variant="danger" size="sm" disabled={busy} onClick={() => remove(o)}>
                                  {busy ? 'Removing…' : 'Remove'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId !== null}
                              onClick={() => { setActionError(''); setConfirmId(o.id) }}
                            >
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
