import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { adminLabel, resolveTarget } from '../../utils/format.js'

const GRID = { display: 'grid', gridTemplateColumns: '160px 135px 1.2fr 1.2fr 1.6fr', minWidth: 960, gap: 10 }

export default function AuditPage() {
  const { audit, approvals, venues, vendors, users, bookings } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const collections = { approvals, venues, vendors, users, bookings }

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {audit.map((a, i) => (
          <div key={i} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: 15.5 }}>{adminLabel(a.admin)}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{a.time}</span>
            </div>
            <div style={{ fontSize: 15.5 }}>{a.action} — <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{resolveTarget(a.target, collections)}</span></div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{a.change}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>When</div><div>Admin</div><div>Action</div><div>Target</div><div>Change</div>
        </div>
        {audit.map((a, i) => (
          <div key={i} style={{ ...GRID, padding: '14px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)' }}>
            <div style={{ color: 'var(--text-muted)' }}>{a.time}</div>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{adminLabel(a.admin)}</div>
            <div>{a.action}</div>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{resolveTarget(a.target, collections)}</div>
            <div style={{ color: 'var(--text-muted)' }}>{a.change}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
