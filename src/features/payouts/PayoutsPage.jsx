import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { fmt } from '../../data/mockData.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import StatCard from '../../components/ui/StatCard.jsx'

const COMMISSION = 0.10
const PO_META = { pending: ['warning', 'Pending'], completed: ['success', 'Completed'], failed: ['error', 'Failed'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 125px 135px 130px 125px 155px', minWidth: 1060, gap: 10 }

export default function PayoutsPage() {
  const { payoutsList, updatePayout, logAudit, showToast, vendors, openDrawer } = useAdmin()
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab || 'Pending')

  const openVendor = (name) => {
    const vendor = vendors.find((v) => v.name === name)
    if (vendor) openDrawer('vendor', vendor.id)
  }

  const filtered = payoutsList.filter((p) => p.status === tab.toLowerCase())
  const duePayouts = payoutsList.filter((p) => p.status === 'pending')
  const dueNet = duePayouts.reduce((a, p) => a + Math.round(p.grossNum * (1 - COMMISSION)), 0)

  const process = (p) => {
    updatePayout(p.id, { status: 'completed' })
    const net = fmt(Math.round(p.grossNum * (1 - COMMISSION)))
    logAudit('Processed payout', p.vendor + ' · ' + net, 'pending → completed')
    showToast(net + ' payout to ' + p.vendor + ' processed')
  }

  const retry = (p) => {
    updatePayout(p.id, { status: 'completed' })
    logAudit('Retried payout', p.vendor, 'failed → completed')
    showToast('Payout to ' + p.vendor + ' went through on retry')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),340px))', gap: 14 }}>
        <StatCard label="Total pending payouts" prefix="₹" value={dueNet.toLocaleString('en-IN')} icon="indian-rupee" tone="warning" trendLabel={duePayouts.length ? duePayouts.length + ' vendors waiting' : 'all settled'} />
        <StatCard label="Commission this month" prefix="₹" value="1,92,700" icon="wallet" tone="navy" trend={9} trendLabel="vs last month" />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Pending', 'Completed', 'Failed'].map((label) => {
          const on = label === tab
          return (
            <button
              key={label}
              onClick={() => setTab(label)}
              style={{
                border: `1px solid ${on ? 'var(--navy-800)' : 'var(--border-default)'}`,
                background: on ? 'var(--navy-800)' : 'var(--surface-card)',
                color: on ? '#fff' : 'var(--text-heading)',
                fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                padding: '9px 18px', borderRadius: 999, cursor: 'pointer', transition: '.15s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Vendor</div><div>Period</div><div>Gross</div><div>Commission</div><div>Net payout</div><div>Status</div><div />
        </div>

        {filtered.map((p) => {
          const [badge, label] = PO_META[p.status]
          return (
            <div key={p.id} style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)' }}>
              <button
                onClick={() => openVendor(p.vendor)}
                title="View vendor profile"
                style={{ fontFamily: 'var(--font-body)', fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecorationLine: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 4 }}
              >
                {p.vendor}
              </button>
              <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>{p.period}</div>
              <div>{fmt(p.grossNum)}</div>
              <div style={{ color: 'var(--text-muted)' }}>{fmt(Math.round(p.grossNum * COMMISSION))}</div>
              <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(Math.round(p.grossNum * (1 - COMMISSION)))}</div>
              <div><Badge status={badge} size="sm">{label}</Badge></div>
              <div>
                {p.status === 'pending' && <Button variant="primary" size="sm" onClick={() => process(p)}>Process payout</Button>}
                {p.status === 'failed' && <Button variant="secondary" size="sm" onClick={() => retry(p)}>Retry</Button>}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>Nothing in this tab right now.</div>
        )}
      </div>
    </div>
  )
}
