import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { fmt, resolveTarget } from '../../utils/format.js'
import StatCard from '../../components/ui/StatCard.jsx'
import Icon from '../../components/ui/Icon.jsx'

// Everything on this page is computed from the real bootstrap data — no
// seeded/demo numbers. Sections show an empty state until data exists.

const STATUS_META = {
  confirmed: { label: 'Confirmed', color: '#2E6FE0' },
  completed: { label: 'Completed', color: '#12B76A' },
  refund_pending: { label: 'Refund pending', color: '#F79009' },
  refunded: { label: 'Refunded', color: '#06152C' },
  cancelled: { label: 'Cancelled', color: '#F1252E' },
}

const DONUT_PALETTE = ['#F1252E', '#06152C', '#F79009', '#2E6FE0', '#12B76A', '#7A5AF8']

/** Revenue grouped by venue category (top 5 + Others), as donut segments. */
function revenueByCategory(venues) {
  const byCat = new Map()
  venues.forEach((v) => {
    const amt = Number(v.revenueNum) || 0
    if (amt > 0) byCat.set(v.category, (byCat.get(v.category) || 0) + amt)
  })
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 5)
  const rest = sorted.slice(5).reduce((s, [, amt]) => s + amt, 0)
  if (rest > 0) top.push(['Others', rest])
  const total = top.reduce((s, [, amt]) => s + amt, 0)
  if (!total) return []
  const C = 2 * Math.PI * 54
  let acc = 0
  return top.map(([label, amt], i) => {
    const pct = Math.round((amt / total) * 100)
    const len = (amt / total) * C
    const seg = {
      label,
      pct,
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
      dash: `${len.toFixed(1)} ${(C - len).toFixed(1)}`,
      offset: (-acc).toFixed(1),
    }
    acc += len
    return seg
  })
}

export default function DashboardPage() {
  const { pendingApprovals, approvals, vendors, reviews, payoutsList, bookings, venues, users, audit } = useAdmin()
  const collections = { approvals, venues, vendors, users, bookings }
  const navigate = useNavigate()

  const pendingCount = pendingApprovals.length
  const oldestWait = pendingCount ? 'oldest waiting ' + Math.max(...pendingApprovals.map((p) => p.waitingH)) + ' h' : 'nothing waiting'
  const failedPayouts = payoutsList.filter((p) => p.status === 'failed').length
  const deletionRequests = venues.filter((v) => v.status === 'deletion_requested').length

  const grossValue = bookings.reduce((s, b) => s + (Number(b.amountNum) || 0), 0)
  const liveVenues = venues.filter((v) => v.status === 'live').length

  // Bookings grouped by status, for the real status-breakdown bars.
  const statusCounts = Object.keys(STATUS_META)
    .map((key) => ({ key, ...STATUS_META[key], count: bookings.filter((b) => b.status === key).length }))
    .filter((s) => s.count > 0)
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count))

  const donut = revenueByCategory(venues)

  const attention = [
    { label: 'Venues waiting for approval', count: pendingCount, icon: 'clock', iconBg: 'var(--warning-50)', iconColor: 'var(--warning-600)', go: () => navigate('/approvals') },
    { label: 'Venue deletion requests', count: deletionRequests, icon: 'inbox', iconBg: 'var(--warning-50)', iconColor: 'var(--warning-600)', go: () => navigate('/deletion-requests') },
    { label: 'Flagged reviews to moderate', count: reviews.length, icon: 'star', iconBg: 'var(--error-50)', iconColor: 'var(--error-600)', go: () => navigate('/reviews') },
    { label: 'Failed payouts to retry', count: failedPayouts, icon: 'wallet', iconBg: 'var(--info-50)', iconColor: 'var(--info-600)', go: () => navigate('/payouts', { state: { tab: 'Failed' } }) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(210px,100%),1fr))', gap: 14 }}>
        <StatCard label="Total bookings" value={bookings.length.toLocaleString('en-IN')} icon="calendar-check" tone="accent" onClick={() => navigate('/bookings')} />
        <StatCard label="Gross booking value" value={fmt(grossValue).slice(1)} prefix="₹" icon="indian-rupee" tone="navy" onClick={() => navigate('/payouts')} />
        <StatCard label="Pending approvals" value={pendingCount} icon="clock" tone="warning" trendLabel={oldestWait} onClick={() => navigate('/approvals')} />
        {/* venues[] now includes soft-deleted rows — say what the total counts. */}
        <StatCard label="Live venues" value={liveVenues} icon="building-2" tone="success" trendLabel={`${venues.length} ever listed`} onClick={() => navigate('/venues')} />
        <StatCard label="Registered users" value={users.length.toLocaleString('en-IN')} icon="users" tone="accent" onClick={() => navigate('/users')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(340px,100%),1fr))', gap: 14, alignItems: 'stretch' }}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }}>Bookings by status</div>
          {statusCounts.length === 0 && (
            <div style={{ fontSize: 15.5, color: 'var(--text-muted)' }}>No bookings yet.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {statusCounts.map((s) => (
              <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15.5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: '0 0 auto' }} />
                  <span style={{ flex: 1, color: 'var(--text-body)', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{s.count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--neutral-100)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((s.count / maxStatus) * 100)}%`, height: '100%', borderRadius: 999, background: s.color, transition: 'width .3s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }}>Revenue by category</div>
          {donut.length === 0 && (
            <div style={{ fontSize: 15.5, color: 'var(--text-muted)' }}>No revenue yet.</div>
          )}
          {donut.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <svg viewBox="0 0 140 140" style={{ width: 140, height: 140, flex: '0 0 auto' }}>
                {donut.map((g) => (
                  <circle key={g.label} cx="70" cy="70" r="54" fill="none" stroke={g.color} strokeWidth="20" strokeDasharray={g.dash} strokeDashoffset={g.offset} transform="rotate(-90 70 70)" />
                ))}
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
                {donut.map((g) => (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15.5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color, flex: '0 0 auto' }} />
                    <span style={{ flex: 1, color: 'var(--text-body)', fontWeight: 600 }}>{g.label}</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{g.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(340px,100%),1fr))', gap: 14, alignItems: 'start' }}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }}>Needs attention</div>
          {attention.map((a) => (
            <button
              key={a.label}
              onClick={a.go}
              className="hover-wash"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border-subtle)', background: 'var(--surface-card)', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%' }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 10, background: a.iconBg, color: a.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name={a.icon} size={19} />
              </span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{a.label}</span>
              <span style={{ fontSize: 18.5, fontWeight: 800, color: a.iconColor }}>{a.count}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 8 }}>Recent activity</div>
          {audit.length === 0 && (
            <div style={{ fontSize: 15.5, color: 'var(--text-muted)', padding: '9px 6px' }}>No activity yet.</div>
          )}
          {audit.slice(0, 6).map((a, i) => (
            <button
              key={i}
              onClick={() => navigate('/audit')}
              className="hover-row"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 6px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--neutral-100)', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%', borderRadius: 8 }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 9, background: '#F4EAE5', color: 'var(--navy-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name="clock" size={17} />
              </span>
              {/* minWidth:0 lets a long line wrap instead of growing and
                  pushing the time off the card's right edge; the time stays a
                  fixed, non-shrinking column so it always shows. */}
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', fontSize: 16, color: 'var(--text-body)' }}>{a.action} — {resolveTarget(a.target, collections)}</span>
              <span style={{ fontSize: 14.5, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', flex: '0 0 auto' }}>{a.time}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
