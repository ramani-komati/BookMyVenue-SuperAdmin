import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { fmt, statusMeta } from '../../utils/format.js'
import { keepsMoney, platformFeeOf } from '../../utils/revenue.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import StatCard from '../../components/ui/StatCard.jsx'

const PO_META = { pending: ['warning', 'Pending'], completed: ['success', 'Completed'], failed: ['error', 'Failed'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 150px 125px 155px', minWidth: 820, gap: 10 }

export default function PayoutsPage() {
  const { payoutsList, updatePayout, logAudit, showToast, vendors, openDrawer, settings, bookings } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab || 'Pending')

  // The platform's ONLY charge is the flat booking fee added to each online
  // booking. The fee is FROZEN per booking at booking time — the current
  // settings fee is only the fallback for legacy rows without one.
  const bookingFee = Number(settings?.fee) || 20

  const openVendor = (name) => {
    const vendor = vendors.find((v) => v.name === name)
    if (vendor) openDrawer('vendor', vendor.id)
  }

  const filtered = payoutsList.filter((p) => p.status === tab.toLowerCase())
  const duePayouts = payoutsList.filter((p) => p.status === 'pending')
  const dueTotal = duePayouts.reduce((a, p) => a + (Number(p.grossNum) || 0), 0)
  // Platform earnings = Σ each booking's BOOKING-TIME frozen fee (a ₹20-era
  // row adds 20, a ₹10-era row adds 10 — NOT today's fee × count). Walk-ins
  // carry no fee, and cancelled/refunded/refund-pending rows return the fee
  // with the money, so only kept fee-bearing rows count. Platform-funded promo
  // discounts come out of the platform's side (payout made-whole rule), so a
  // promo row nets fee − discountAmount (can go negative — a real loss-leader).
  const feeBearing = bookings.filter((b) => keepsMoney(b) && platformFeeOf(b, bookingFee) > 0)
  const platformEarnings = feeBearing.reduce((s, b) => {
    const promo = b.offer?.source === 'platform' ? Number(b.discountAmount) || 0 : 0
    return s + platformFeeOf(b, bookingFee) - promo
  }, 0)

  const process = (p) => {
    updatePayout(p.id, { status: 'completed' })
    const amt = fmt(Number(p.grossNum) || 0)
    logAudit('Processed payout', p.vendor + ' · ' + amt, 'pending → completed')
    showToast(amt + ' payout to ' + p.vendor + ' processed')
  }

  const retry = (p) => {
    updatePayout(p.id, { status: 'completed' })
    logAudit('Retried payout', p.vendor, 'failed → completed')
    showToast('Payout to ' + p.vendor + ' went through on retry')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),340px))', gap: 14 }}>
        <StatCard label="Total pending payouts" prefix="₹" value={dueTotal.toLocaleString('en-IN')} icon="indian-rupee" tone="warning" trendLabel={duePayouts.length ? duePayouts.length + ' vendors waiting' : 'all settled'} />
        <StatCard label="Platform earnings" prefix="₹" value={platformEarnings.toLocaleString('en-IN')} icon="wallet" tone="navy" trendLabel={`${feeBearing.length} online booking${feeBearing.length === 1 ? '' : 's'} · each at its booking-time fee`} />
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

      {compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((p) => {
            const [badge, label] = statusMeta(PO_META, p.status)
            return (
              <div key={p.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => openVendor(p.vendor)}
                    title="View vendor profile"
                    style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecorationLine: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 4 }}
                  >
                    {p.vendor}
                  </button>
                  <span style={{ flex: 1 }} />
                  <Badge status={badge} size="sm">{label}</Badge>
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>{p.period}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 14.5 }}>
                  <span>Payout <strong style={{ color: 'var(--text-heading)', fontWeight: 800 }}>{fmt(Number(p.grossNum) || 0)}</strong></span>
                </div>
                {p.status === 'pending' && <Button variant="primary" size="sm" block onClick={() => process(p)}>Process payout</Button>}
                {p.status === 'failed' && <Button variant="secondary" size="sm" block onClick={() => retry(p)}>Retry</Button>}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>Nothing in this tab right now.</div>
          )}
        </div>
      ) : (
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Vendor</div><div>Period</div><div>Payout amount</div><div>Status</div><div />
        </div>

        {filtered.map((p) => {
          const [badge, label] = statusMeta(PO_META, p.status)
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
              <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{fmt(Number(p.grossNum) || 0)}</div>
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
      )}
    </div>
  )
}
