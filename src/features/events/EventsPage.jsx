import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { adminApi } from '../../services/adminApi.js'
import { exportFileName } from '../../utils/exports.js'
import { localTodayISO } from '../../utils/slots.js'
import EventFormModal from './EventFormModal.jsx'
import EventOrdersModal from './EventOrdersModal.jsx'
import { MAX_PROMOTED } from './eventForm.js'

/**
 * EventsPage — the super admin's event management.
 *
 * The admin creates events here, edits them, publishes and unpublishes them,
 * and retires them. VENDORS also submit events from their portal: those
 * arrive as "pending" in the Pending tab, marked "Vendor-submitted" with the
 * vendor's name and phone, and go live only when an admin approves them
 * (Approve) — or are rejected with a reason the vendor sees.
 *
 * The one thing that is NOT an admin decision is whether an event is
 * complete enough to sell: the backend refuses to publish an event with no
 * upcoming available date or no ticket price, and that refusal is shown here
 * verbatim rather than being pre-empted by a disabled button whose reason
 * the admin would have to guess.
 *
 *
 * PROMOTION is a separate switch from publishing: "Promote on homepage" puts
 * a PUBLISHED event in the customer site's Featured events row; "Remove
 * promotion" takes it out again without unpublishing or deleting anything.
 * The backend owns every rule — only live events, at most MAX_PROMOTED at
 * once, and unpublishing/deleting drops the promotion — and its refusal is
 * shown verbatim.
 */

const inr = (n) => Number(n || 0).toLocaleString('en-IN')

const dateLabel = (iso) => {
  if (!iso) return ''
  try {
    return new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch { return String(iso) }
}

const BADGE = {
  draft: ['draft', 'Draft'],
  pending: ['pending', 'Pending review'],
  live: ['live', 'Published'],
  paused: ['neutral', 'Unpublished'],
  rejected: ['rejected', 'Rejected'],
  deleted: ['neutral', 'Deleted'],
}

const TABS = [
  { key: 'live', label: 'Published' },
  { key: 'promoted', label: 'Promoted' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paused', label: 'Unpublished' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
]

const EMPTY_COPY = {
  promoted: ['Nothing promoted', 'Promote a published event to feature it in the customer home page’s Featured events row.'],
  live: ['Nothing published yet', 'Create an event and publish it — it appears on the customer Events page straight away.'],
  draft: ['No drafts', 'Events you save without publishing wait here.'],
  paused: ['Nothing unpublished', 'Unpublishing hides an event from customers while keeping sold tickets valid.'],
  pending: ['Nothing waiting for review', 'Events vendors submit from their portal appear here for approval.'],
  rejected: ['Nothing rejected', 'Rejected vendor submissions appear here with the reason you gave.'],
  all: ['No events yet', 'Create your first event to start selling tickets.'],
}

export default function EventsPage() {
  const {
    events, createEvent, updateEvent, deleteEvent, refreshEvents, openModal, showToast,
  } = useAdmin()
  // Vendors submit events from their portal at any time — fetch the current
  // list on open so new submissions are in the Pending queue without a full
  // reload. Best effort: the bootstrap list stays if this fails.
  useEffect(() => {
    refreshEvents().catch(() => {})
  }, [refreshEvents])
  const [tab, setTab] = useState('live')
  const [form, setForm] = useState(null)       // null | {} (new) | event row
  const [orders, setOrders] = useState(null)   // the event whose bookings are open
  const [busyId, setBusyId] = useState('')

  // Promotion only ever counts for live events (the backend clears it on
  // anything else), so this is exactly what the customer page can show.
  const isPromoted = (e) => e.featured && e.status === 'live'
  const promotedCount = events.filter(isPromoted).length

  const rows = useMemo(() => {
    const list = tab === 'all'
      ? events
      : tab === 'promoted'
        ? events.filter((e) => e.featured && e.status === 'live')
        : events.filter((e) => e.status === tab)
    // Within "All": published first, then anything needing attention, then
    // the rest — the order an admin scans the page in.
    return [...list].sort((a, b) => {
      const rank = (s) => (s === 'live' ? 0 : s === 'pending' ? 1 : s === 'draft' ? 2 : 3)
      return rank(a.status) - rank(b.status) || String(a.name).localeCompare(String(b.name))
    })
  }, [events, tab])

  /** Run one write, surface its real error, and clear the row's spinner. */
  const run = async (event, action, successMessage) => {
    setBusyId(event.id)
    try {
      await action()
      if (successMessage) showToast(successMessage)
    } catch (err) {
      // The server's message names the actual reason — an event that cannot
      // be published, a delete refused because tickets are sold.
      showToast(err.message || 'That did not work — please try again')
    } finally {
      setBusyId('')
    }
  }

  const publish = (e) => run(
    e,
    () => updateEvent(e.id, { status: 'publish' }),
    e.status === 'pending' ? `${e.name} approved — it is now live` : `${e.name} is now live`,
  )

  const promote = (e) => run(
    e,
    () => updateEvent(e.id, { featured: true }),
    `${e.name} is now featured on the homepage`,
  )

  const unpromote = (e) => run(
    e,
    () => updateEvent(e.id, { featured: false }),
    `${e.name} removed from the homepage — it stays published`,
  )

  const unpublish = (e) => openModal({
    title: `Unpublish “${e.name}”?`,
    body: 'Customers stop seeing it and no new tickets can be sold. Tickets '
      + 'already paid for stay valid, and you can publish it again at any time.'
      + (e.featured ? ' Its homepage promotion is removed too.' : ''),
    confirmLabel: 'Unpublish',
    onConfirm: () => run(
      e, () => updateEvent(e.id, { status: 'unpublish' }), `${e.name} unpublished`,
    ),
  })

  const remove = (e) => openModal({
    title: `Delete “${e.name}”?`,
    body: 'This hides the event everywhere. If any tickets have been sold it '
      + 'will be unpublished instead of deleted, so those tickets keep working.',
    confirmLabel: 'Delete event',
    danger: true,
    onConfirm: () => run(e, () => deleteEvent(e.id), `${e.name} deleted`),
  })

  const reject = (e) => openModal({
    title: `Reject “${e.name}”?`,
    body: 'The event stays hidden from customers. Your reason is recorded on the event.',
    confirmLabel: 'Reject event',
    danger: true,
    needsReason: true,
    onConfirm: (reason) => run(
      e,
      () => updateEvent(e.id, { status: 'rejected', reviewNotes: reason || '' }),
      `${e.name} rejected`,
    ),
  })

  const [emptyTitle, emptySub] = EMPTY_COPY[tab] || EMPTY_COPY.all

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: '1 1 auto' }}>
          {TABS.map((t) => {
            const count = t.key === 'all'
              ? events.length
              : t.key === 'promoted'
                ? promotedCount
                : events.filter((e) => e.status === t.key).length
            return (
              <Button
                key={t.key}
                variant={tab === t.key ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTab(t.key)}
              >
                {t.label} ({count})
              </Button>
            )
          })}
        </div>
        {/* The tab's events with ticket types, per-date seats and sales. */}
        <ExportButton
          fetchFile={() => adminApi.exportReport('events', { tab })}
          filename={exportFileName('admin_events', localTodayISO())}
          count={rows.length} noun={rows.length === 1 ? 'event' : 'events'} what="events"
          title="Events in this tab, with ticket types, seats per date, sales, refunds and revenue"
        />
        <Button variant="navy" size="sm" onClick={() => setForm({})} style={{ flex: '0 0 auto' }}>
          <Icon name="plus" size={16} /> Create event
        </Button>
      </div>

      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        <strong style={{ color: promotedCount >= MAX_PROMOTED ? 'var(--red-600)' : 'var(--text-heading)' }}>
          {promotedCount} / {MAX_PROMOTED}
        </strong>
        {' '}events promoted on the customer homepage
        {promotedCount >= MAX_PROMOTED && ' — remove one to promote another'}
      </div>

      {rows.length === 0 && (
        <div className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--neutral-100)',
              color: 'var(--neutral-600)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}
          >
            <Icon name="ticket" size={30} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>
            {emptyTitle}
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)', margin: '6px auto 0', maxWidth: 420 }}>
            {emptySub}
          </div>
          {tab !== 'pending' && (
            <div style={{ marginTop: 18 }}>
              <Button variant="primary" size="sm" onClick={() => setForm({})}>
                <Icon name="plus" size={16} /> Create event
              </Button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((e) => {
          const [tone, statusLabel] = BADGE[e.status] || BADGE.draft
          const busy = busyId === e.id
          return (
            <div
              key={e.id}
              className="card"
              style={{ padding: 16, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <div
                style={{
                  width: 72, height: 54, borderRadius: 10, flex: '0 0 auto',
                  backgroundColor: 'var(--neutral-100)',
                  backgroundImage: e.poster ? `url('${e.poster}')` : 'none',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--neutral-600)',
                }}
              >
                {!e.poster && <Icon name="ticket" size={22} />}
              </div>

              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {e.name}
                  </span>
                  <Badge status={tone} size="sm">{statusLabel}</Badge>
                  {e.category && <Badge status="info" size="sm">{e.category}</Badge>}
                  {e.managedBy === 'vendor' && (
                    <Badge status="neutral" size="sm">Vendor-submitted</Badge>
                  )}
                </div>
                {isPromoted(e) && (
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--red-600)', marginTop: 2 }}>
                    ★ Featured on homepage
                  </div>
                )}
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2, overflowWrap: 'anywhere' }}>
                  {e.vendor || 'Organiser not recorded'}
                  {e.managedBy === 'vendor' && e.vendorPhone ? ` (${e.vendorPhone})` : ''} · {e.location || '—'}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {e.startTime}–{e.endTime} · {e.datesCount} date{e.datesCount === 1 ? '' : 's'}
                  {e.dates?.length > 0 && ` (${dateLabel(e.dates[0].date)}${e.dates.length > 1 ? `–${dateLabel(e.dates[e.dates.length - 1].date)}` : ''})`}
                  {' · '}from ₹{inr(e.fromPriceNum)}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {e.ticketsSold} / {e.capacity} tickets sold · {e.ordersNum} order{e.ordersNum === 1 ? '' : 's'} · ₹{inr(e.revenueNum)}
                </div>
                {e.status === 'rejected' && e.reviewNotes && (
                  <div style={{ fontSize: 13.5, color: 'var(--status-rejected-fg)', fontWeight: 600, marginTop: 4 }}>
                    {e.reviewNotes}
                  </div>
                )}
              </div>

              {/* `1 1 auto` + minWidth:0, NOT `0 0 auto`: five action buttons
                  are ~379px of content, which is wider than a 390px phone's
                  card interior. Refusing to shrink pushed the row past the
                  viewport and gave the whole page a horizontal scrollbar. */}
              <div style={{ display: 'flex', gap: 8, flex: '1 1 auto', minWidth: 0, flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setOrders(e)}>
                  Bookings
                </Button>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setForm(e)}>
                  Edit
                </Button>
                {e.status === 'pending' && (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => reject(e)}>
                    Reject
                  </Button>
                )}
                {/* Promotion: published events only, separate from publishing. */}
                {e.status === 'live' && (
                  isPromoted(e) ? (
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => unpromote(e)}>
                      {busy ? '…' : 'Remove promotion'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => promote(e)}
                      title={promotedCount >= MAX_PROMOTED
                        ? `Up to ${MAX_PROMOTED} events can be promoted — remove one first`
                        : 'Feature this event on the customer homepage'}
                    >
                      {busy ? '…' : '★ Promote'}
                    </Button>
                  )
                )}
                {e.status === 'live' ? (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => unpublish(e)}>
                    {busy ? '…' : 'Unpublish'}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => publish(e)}>
                    {busy ? '…' : e.status === 'pending' ? 'Approve' : 'Publish'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(e)}>
                  Delete
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {form && (
        <EventFormModal
          event={form.id ? form : null}
          onClose={() => setForm(null)}
          onCreate={createEvent}
          onUpdate={updateEvent}
          showToast={showToast}
        />
      )}
      {orders && <EventOrdersModal event={orders} onClose={() => setOrders(null)} />}
    </div>
  )
}
