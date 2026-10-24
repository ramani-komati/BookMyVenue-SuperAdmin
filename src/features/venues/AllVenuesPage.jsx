import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { placeOf } from '../../utils/format.js'
import Badge from '../../components/ui/Badge.jsx'

// Every status a venue can be in across its whole life on the platform —
// including `deleted` rows, which the backend keeps (soft-delete) so the
// registry never loses history. Unknown statuses must never crash the page.
const VENUE_META = {
  live: ['live', 'Live'], paused: ['warning', 'Paused'], pending: ['warning', 'Pending'],
  rejected: ['rejected', 'Rejected'], draft: ['draft', 'Draft'], deleted: ['neutral', 'Deleted'],
  deletion_requested: ['warning', 'Deletion requested'],
}
const venueMeta = (status) => VENUE_META[status] || ['draft', status || 'Unknown']

// Filter chips in lifecycle order; only chips with at least one venue render.
const STATUS_ORDER = ['live', 'paused', 'deletion_requested', 'pending', 'rejected', 'draft', 'deleted']

const GRID = { display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 140px 100px 100px 80px 100px 150px', minWidth: 1140, gap: 10 }

const dateLabel = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return String(iso) }
}

/**
 * AllVenuesPage — the full venue registry: every venue the platform has ever
 * had, whatever its status — live, paused, pending, rejected, draft, and
 * DELETED (rows the backend keeps after a vendor removes a listing). This is
 * the read-only archive; day-to-day actions (pause, feature) live on the
 * Venues panel, which shows only the venues currently on the platform.
 */
export default function AllVenuesPage() {
  const { venues, openDrawer } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const [statusFilter, setStatusFilter] = useState('all')

  const counts = venues.reduce((acc, v) => {
    const s = VENUE_META[v.status] ? v.status : 'draft'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const shown = statusFilter === 'all' ? venues : venues.filter((v) => (VENUE_META[v.status] ? v.status : 'draft') === statusFilter)
  const deletedCount = counts.deleted || 0

  const chip = (key, label, count) => {
    const on = statusFilter === key
    return (
      <button
        key={key}
        onClick={() => setStatusFilter(on && key !== 'all' ? 'all' : key)}
        style={{
          fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
          color: on ? '#fff' : 'var(--text-heading)',
          background: on ? 'var(--navy-800)' : 'var(--surface-card)',
          border: `1px solid ${on ? 'var(--navy-800)' : 'var(--border-default)'}`,
          borderRadius: 999, padding: '7px 14px', whiteSpace: 'nowrap',
        }}
      >
        {label} · {count}
      </button>
    )
  }

  const rowCard = (v) => {
    const [badge, label] = venueMeta(v.status)
    const dead = v.status === 'deleted'
    return (
      <div
        key={v.id}
        onClick={() => openDrawer('venue', v.id)}
        className="card hover-wash"
        style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', opacity: dead ? 0.65 : 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 70, height: 50, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: dead ? 'grayscale(1)' : 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3, textDecoration: dead ? 'line-through' : 'none' }}>{v.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{v.vendor} · {placeOf(v)}</div>
          </div>
          <Badge status={badge} size="sm">{label}</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14.5 }}>
          <span style={{ fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '4px 11px', borderRadius: 999, fontSize: 13.5 }}>{v.category}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.price}/hr</span>
          <span style={{ color: 'var(--text-muted)' }}>★ {v.rating}</span>
          <span style={{ color: 'var(--text-muted)' }}>{v.bookings} bookings</span>
          {dead && v.deletedAt && <span style={{ color: 'var(--error-600)', fontWeight: 700, fontSize: 13.5 }}>Deleted {dateLabel(v.deletedAt)}</span>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-muted)', marginRight: 4 }}>
          {venues.length === 0
            ? 'No venues yet.'
            : `${venues.length} venue${venues.length === 1 ? '' : 's'} ever listed${deletedCount ? ` · ${deletedCount} deleted` : ''}`}
        </div>
        {venues.length > 0 && chip('all', 'All', venues.length)}
        {STATUS_ORDER.map((s) => (counts[s] ? chip(s, VENUE_META[s][1], counts[s]) : null))}
      </div>

      {shown.length === 0 && venues.length > 0 && (
        <div className="card" style={{ padding: '28px 20px', textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
          No venues with this status.
        </div>
      )}

      {compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{shown.map(rowCard)}</div>
      ) : shown.length > 0 && (
        <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
          <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>Venue</div><div>Vendor</div><div>Category</div><div>City</div><div>Price/hr</div><div>Rating</div><div>Bookings</div><div>Status</div>
          </div>

          {shown.map((v) => {
            const [badge, label] = venueMeta(v.status)
            const dead = v.status === 'deleted'
            return (
              <div
                key={v.id}
                onClick={() => openDrawer('venue', v.id)}
                className="hover-row"
                style={{ ...GRID, padding: '14px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)', cursor: 'pointer', opacity: dead ? 0.65 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div style={{ width: 80, height: 58, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: dead ? 'grayscale(1)' : 'none' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3, textDecoration: dead ? 'line-through' : 'none' }}>{v.name}</div>
                    {v.featured && !dead && <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--red-600)' }}>★ Featured on homepage</div>}
                  </div>
                </div>
                <div style={{ fontSize: 16 }}>{v.vendor}</div>
                <div><span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{v.category}</span></div>
                <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{placeOf(v)}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.price}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.rating}</div>
                <div>{v.bookings}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <Badge status={badge} size="sm">{label}</Badge>
                  {dead && v.deletedAt && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--error-600)', whiteSpace: 'nowrap' }}>on {dateLabel(v.deletedAt)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
