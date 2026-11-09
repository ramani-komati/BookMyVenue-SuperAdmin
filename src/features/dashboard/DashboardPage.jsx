import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { adminApi } from '../../services/adminApi.js'
import { resolveTarget } from '../../utils/format.js'
import StatCard from '../../components/ui/StatCard.jsx'
import Icon from '../../components/ui/Icon.jsx'
import DataErrorCard from '../../components/DataErrorCard.jsx'
import {
  DEFAULT_RANGE, RANGES, categoryBars, countRows, dailySeries, inr, moneyCards, rangeQuery,
} from './dashboardModel.js'

// Money and booking figures come from GET /api/admin/dashboard — computed on
// the server from VERIFIED payments only, venue bookings and event tickets
// together (backend reports/finance.py). Nothing on this page adds up booking
// amounts itself. Seeded/demo numbers: none.

// Two series, validated (dataviz validator, light surface): all checks pass.
const SERIES = { venue: '#1F4FB8', event: '#E8590C' }

const cardTitle = { fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }
const muted = { fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.5 }

function RangeFilter({ range, from, to, onRange, onFrom, onTo, error }) {
  const btn = (on) => ({
    padding: '8px 13px', borderRadius: 999, border: '1px solid ' + (on ? 'var(--navy-800)' : 'var(--border-default)'),
    background: on ? 'var(--navy-800)' : 'var(--surface-card)', color: on ? '#fff' : 'var(--text-heading)',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  })
  const input = { padding: '7px 10px', borderRadius: 10, border: '1px solid var(--border-default)', fontFamily: 'var(--font-body)', fontSize: 14 }
  return (
    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="group" aria-label="Date range" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {RANGES.map((r) => (
          <button key={r.key} type="button" style={btn(range === r.key)} aria-pressed={range === r.key} onClick={() => onRange(r.key)}>
            {r.label}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>From <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} style={input} /></label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>To <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} style={input} /></label>
          {error && <span style={{ color: 'var(--error-600)' }}>{error}</span>}
        </div>
      )}
    </div>
  )
}

function CountsTable({ data }) {
  const rows = countRows(data)
  const tickets = Number(data?.counts?.events?.ticketsPaid) || 0
  const th = { padding: '8px 10px', fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }
  const td = { padding: '9px 10px', fontSize: 15, borderBottom: '1px solid var(--neutral-100)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--text-heading)' }
  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={cardTitle}>Bookings &amp; ticket orders</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
          <thead>
            <tr><th style={{ ...th, textAlign: 'left' }}>Status</th><th style={th}>Venue bookings</th><th style={th}>Event orders</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ ...td, textAlign: 'left', fontWeight: r.key === 'total' ? 800 : 600, color: 'var(--text-body)' }}>{r.label}</td>
                <td style={td}>{r.venue.toLocaleString('en-IN')}</td>
                <td style={td}>{r.events == null ? '—' : r.events.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={muted}>
        <strong style={{ color: 'var(--text-heading)' }}>{tickets.toLocaleString('en-IN')} tickets</strong> on paid event orders — one order can hold several tickets, so orders and tickets are counted separately.
        {Number(data?.counts?.venue?.cancelledAfterPayment) + Number(data?.counts?.events?.cancelledAfterPayment) > 0 && (
          <> {Number(data.counts.venue.cancelledAfterPayment) + Number(data.counts.events.cancelledAfterPayment)} cancelled after payment with no refund recorded yet.</>
        )}
      </div>
    </div>
  )
}

function CategoryRevenue({ data }) {
  const bars = categoryBars(data?.categories)
  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardTitle}>Revenue by category</div>
      {bars.length === 0 && <div style={muted}>No successful payments in this period.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bars.map((c) => (
          <div key={c.key} title={`${c.label} (${c.sourceLabel}): ${inr(c.received)} received · ${inr(c.refunded)} refunded · ${inr(c.net)} net · ${c.payments} payments`} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 15 }}>
              <span style={{ flex: 1, minWidth: 0, color: 'var(--text-body)', fontWeight: 600, overflowWrap: 'anywhere' }}>
                {c.label}
                <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.sourceLabel}</span>
              </span>
              <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>{inr(c.received)}</span>
              <span style={{ width: 52, textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.percent}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--neutral-100)', overflow: 'hidden' }}>
              <div style={{ width: `${c.width}%`, height: '100%', borderRadius: 4, background: SERIES.venue }} />
            </div>
            {c.refunded > 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{inr(c.refunded)} refunded · {inr(c.net)} net</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function DailyRevenue({ data }) {
  const days = dailySeries(data)
  const [hover, setHover] = useState(null)
  const max = Math.max(0, ...days.map((d) => d.venue + d.event))
  const H = 160
  const allTime = data?.period?.key === 'all'
  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ ...cardTitle, flex: 1 }}>Payments per day</div>
        {['venue', 'event'].map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-body)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: SERIES[k] }} />{k === 'venue' ? 'Venue bookings' : 'Event tickets'}
          </span>
        ))}
      </div>
      {max === 0 ? (
        <div style={muted}>No successful payments in this period.</div>
      ) : (
        <>
          <div style={{ position: 'relative', height: H, display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: '1px solid var(--border-subtle)' }} onMouseLeave={() => setHover(null)}>
            {days.map((d) => {
              const total = d.venue + d.event
              const vh = max ? (d.venue / max) * H : 0
              const eh = max ? (d.event / max) * H : 0
              return (
                <div
                  key={d.date}
                  onMouseEnter={() => setHover(d)}
                  onFocus={() => setHover(d)}
                  tabIndex={0}
                  aria-label={`${d.date}: venue ${inr(d.venue)}, events ${inr(d.event)}`}
                  style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: total && d.venue && d.event ? 2 : 0, cursor: 'default', background: hover?.date === d.date ? 'var(--neutral-50)' : 'transparent' }}
                >
                  {d.event > 0 && <div style={{ height: Math.max(eh, 2), background: SERIES.event, borderRadius: d.venue ? '4px 4px 0 0' : '4px 4px 0 0' }} />}
                  {d.venue > 0 && <div style={{ height: Math.max(vh, 2), background: SERIES.venue, borderRadius: d.event ? 0 : '4px 4px 0 0' }} />}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>{days[0]?.date}</span><span>{days[days.length - 1]?.date}</span>
          </div>
          <div style={{ minHeight: 22, fontSize: 14, color: 'var(--text-body)' }} aria-live="polite">
            {hover
              ? <><strong>{hover.date}</strong> · Venue {inr(hover.venue)} · Events {inr(hover.event)} · Total {inr(hover.venue + hover.event)}</>
              : <span style={{ color: 'var(--text-muted)' }}>Hover a day for its figures.{allTime ? ' All time shows the most recent 62 days.' : ''}</span>}
          </div>
        </>
      )}
    </div>
  )
}

function Definitions({ data }) {
  const [open, setOpen] = useState(false)
  const defs = data?.definitions || {}
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--red-600)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
        {open ? 'Hide' : 'How these figures are counted'}
      </button>
      {open && (
        <ul style={{ ...muted, margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(defs).map(([k, text]) => <li key={k}>{text}</li>)}
        </ul>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { pendingApprovals, approvals, vendors, reviews, payoutsList, bookings, venues, users, audit } = useAdmin()
  const collections = { approvals, venues, vendors, users, bookings }
  const navigate = useNavigate()

  const [range, setRange] = useState(DEFAULT_RANGE)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reload, setReload] = useState(0)
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })

  const { query, error: rangeError } = useMemo(() => rangeQuery(range, from, to), [range, from, to])
  const queryKey = JSON.stringify(query || null)

  useEffect(() => {
    if (!query) return undefined
    const call = new AbortController()
    setState((s) => ({ ...s, status: 'loading' }))
    adminApi.dashboard(query, { signal: call.signal })
      .then((data) => { if (!call.signal.aborted) setState({ status: 'ready', data, error: '' }) })
      .catch((err) => { if (!err.aborted && !call.signal.aborted) setState((s) => ({ ...s, status: 'error', error: err.message })) })
    return () => call.abort()
    // queryKey captures `query`'s contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, reload])

  const data = state.data
  const pendingCount = pendingApprovals.length
  const oldestWait = pendingCount ? 'oldest waiting ' + Math.max(...pendingApprovals.map((p) => p.waitingH)) + ' h' : 'nothing waiting'
  const failedPayouts = payoutsList.filter((p) => p.status === 'failed').length
  const deletionRequests = venues.filter((v) => v.status === 'deletion_requested').length
  const liveVenues = venues.filter((v) => v.status === 'live').length

  const attention = [
    { label: 'Venues waiting for approval', count: pendingCount, icon: 'clock', iconBg: 'var(--warning-50)', iconColor: 'var(--warning-600)', go: () => navigate('/approvals') },
    { label: 'Venue deletion requests', count: deletionRequests, icon: 'inbox', iconBg: 'var(--warning-50)', iconColor: 'var(--warning-600)', go: () => navigate('/deletion-requests') },
    { label: 'Flagged reviews to moderate', count: reviews.length, icon: 'star', iconBg: 'var(--error-50)', iconColor: 'var(--error-600)', go: () => navigate('/reviews') },
    { label: 'Failed payouts to retry', count: failedPayouts, icon: 'wallet', iconBg: 'var(--info-50)', iconColor: 'var(--info-600)', go: () => navigate('/payouts', { state: { tab: 'Failed' } }) },
  ]

  const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(min(${min}px,100%),1fr))`, gap: 14, alignItems: 'stretch' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <RangeFilter
        range={range} from={from} to={to} error={rangeError}
        onRange={setRange} onFrom={setFrom} onTo={setTo}
      />

      {state.status === 'error' && !data && <DataErrorCard onRetry={() => setReload((n) => n + 1)} />}
      {state.status === 'error' && data && (
        <div className="card" style={{ padding: 14, color: 'var(--error-600)', fontSize: 14.5 }}>
          Could not refresh these figures ({state.error}). Showing {data.period?.label}.{' '}
          <button type="button" onClick={() => setReload((n) => n + 1)} style={{ background: 'none', border: 'none', color: 'var(--red-600)', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
        </div>
      )}
      {!data && state.status === 'loading' && <div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>Loading figures…</div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, opacity: state.status === 'loading' ? 0.55 : 1, transition: 'opacity .15s ease' }} aria-busy={state.status === 'loading'}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...cardTitle, fontSize: 17 }}>
              {data.period?.label}
              {data.period?.from && <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 15 }}> · {data.period.from === data.period.to ? data.period.from : `${data.period.from} to ${data.period.to}`}</span>}
            </span>
            <Definitions data={data} />
          </div>
          <div style={grid(210)}>
            {moneyCards(data).map((c) => (
              <StatCard key={c.key} label={c.label} value={c.value.toLocaleString('en-IN')} prefix="₹" icon={c.icon} tone={c.tone} trendLabel={c.hint} />
            ))}
          </div>
          <div style={grid(340)}>
            <CountsTable data={data} />
            <CategoryRevenue data={data} />
          </div>
          <DailyRevenue data={data} />
        </div>
      )}

      {/* Platform figures — current totals, not affected by the date range. */}
      <div style={grid(210)}>
        <StatCard label="Pending approvals" value={pendingCount} icon="clock" tone="warning" trendLabel={oldestWait} onClick={() => navigate('/approvals')} />
        {/* venues[] now includes soft-deleted rows — say what the total counts. */}
        <StatCard label="Live venues" value={liveVenues} icon="building-2" tone="success" trendLabel={`${venues.length} ever listed`} onClick={() => navigate('/venues')} />
        <StatCard label="Registered users" value={users.length.toLocaleString('en-IN')} icon="users" tone="accent" onClick={() => navigate('/users')} />
      </div>

      <div style={{ ...grid(340), alignItems: 'start' }}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={cardTitle}>Needs attention</div>
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
