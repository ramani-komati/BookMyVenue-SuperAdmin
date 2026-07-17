import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { DASHBOARD_ACTIVITY } from '../../data/mockData.js'
import StatCard from '../../components/ui/StatCard.jsx'
import Icon from '../../components/ui/Icon.jsx'

const RANGE_LABELS = {
  7: ['Mon 6 Jul', 'Thu 9 Jul', 'Sun 12 Jul'],
  30: ['15 Jun', '30 Jun', '14 Jul'],
  90: ['16 Apr', '31 May', '14 Jul'],
}

const DONUT_DATA = [
  { label: 'Sports turfs', pct: 44, color: '#F1252E' },
  { label: 'Banquet & party halls', pct: 28, color: '#06152C' },
  { label: 'Pools & play zones', pct: 17, color: '#F79009' },
  { label: 'Private theatres', pct: 11, color: '#2E6FE0' },
]

function series(n) {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push(140 + Math.round(90 * Math.sin(i / 3.1) + 60 * Math.sin(i / 8.7) + (i * 220) / n))
  }
  return out
}

function chartPaths(range) {
  const data = series(range)
  const W = 640, H = 210
  const max = Math.max(...data) * 1.15
  const pts = data.map((v, i) => [Math.round((i * W) / (data.length - 1)), Math.round(H - (v / max) * H)])
  const linePath = 'M' + pts.map((p) => p[0] + ',' + p[1]).join(' L')
  const areaPath = linePath + ' L' + W + ',' + H + ' L0,' + H + ' Z'
  return { linePath, areaPath }
}

function donutSegments() {
  const C = 2 * Math.PI * 54
  let acc = 0
  return DONUT_DATA.map((g) => {
    const len = (g.pct / 100) * C
    const seg = { ...g, dash: `${len.toFixed(1)} ${(C - len).toFixed(1)}`, offset: (-acc).toFixed(1) }
    acc += len
    return seg
  })
}

export default function DashboardPage() {
  const { pendingApprovals, reviews, payoutsList } = useAdmin()
  const navigate = useNavigate()
  const [range, setRange] = useState(7)

  const { linePath, areaPath } = chartPaths(range)
  const donut = donutSegments()
  const pendingCount = pendingApprovals.length
  const oldestWait = pendingCount ? 'oldest waiting ' + Math.max(...pendingApprovals.map((p) => p.waitingH)) + ' h' : 'nothing waiting'
  const failedPayouts = payoutsList.filter((p) => p.status === 'failed').length

  const attention = [
    { label: 'Venues waiting for approval', count: pendingCount, icon: 'clock', iconBg: 'var(--warning-50)', iconColor: 'var(--warning-600)', go: () => navigate('/approvals') },
    { label: 'Flagged reviews to moderate', count: reviews.length, icon: 'star', iconBg: 'var(--error-50)', iconColor: 'var(--error-600)', go: () => navigate('/reviews') },
    { label: 'Failed payouts to retry', count: failedPayouts, icon: 'wallet', iconBg: 'var(--info-50)', iconColor: 'var(--info-600)', go: () => navigate('/payouts', { state: { tab: 'Failed' } }) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(210px,100%),1fr))', gap: 14 }}>
        <StatCard label="Today's bookings" value="184" icon="calendar-check" tone="accent" trend={11} trendLabel="vs yesterday" onClick={() => navigate('/bookings')} />
        <StatCard label="Gross booking value" prefix="₹" value="6,41,900" icon="indian-rupee" tone="navy" trend={7} trendLabel="vs yesterday" onClick={() => navigate('/payouts')} />
        <StatCard label="Pending approvals" value={pendingCount} icon="clock" tone="warning" trendLabel={oldestWait} onClick={() => navigate('/approvals')} />
        <StatCard label="Active venues" value="312" icon="building-2" tone="success" trend={5} trendLabel="new this month" onClick={() => navigate('/venues')} />
        <StatCard label="New users this week" value="1,208" icon="users" tone="accent" trend={-3} trendLabel="vs last week" onClick={() => navigate('/users')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(340px,100%),1fr))', gap: 14, alignItems: 'stretch' }}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }}>Bookings trend</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[7, 30, 90].map((r) => {
                const on = r === range
                return (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    style={{
                      border: `1px solid ${on ? 'var(--navy-800)' : 'var(--border-default)'}`,
                      background: on ? 'var(--navy-800)' : 'var(--surface-card)',
                      color: on ? '#fff' : 'var(--text-heading)',
                      fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700,
                      padding: '6px 13px', borderRadius: 999, cursor: 'pointer', transition: '.15s ease',
                    }}
                  >
                    {r} days
                  </button>
                )
              })}
            </div>
          </div>
          <svg viewBox="0 0 640 210" style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="none">
            <path d={areaPath} fill="rgba(241,37,46,.09)" />
            <path d={linePath} fill="none" stroke="#F1252E" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
            {RANGE_LABELS[range].map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }}>Revenue by category</div>
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
          {DASHBOARD_ACTIVITY.map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.to, a.state ? { state: a.state } : undefined)}
              className="hover-row"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 6px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--neutral-100)', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%', borderRadius: 8 }}
            >
              <span style={{ width: 36, height: 36, borderRadius: 9, background: '#F4EAE5', color: 'var(--navy-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <Icon name={a.icon} size={17} />
              </span>
              <span style={{ flex: 1, fontSize: 16, color: 'var(--text-body)' }}>{a.text}</span>
              <span style={{ fontSize: 14.5, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.time}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
