import { useAdmin } from '../../context/AdminContext.jsx'

const GRID = { display: 'grid', gridTemplateColumns: '160px 135px 1.2fr 1.2fr 1.6fr', minWidth: 960, gap: 10 }

export default function AuditPage() {
  const { audit } = useAdmin()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>When</div><div>Admin</div><div>Action</div><div>Target</div><div>Change</div>
        </div>
        {audit.map((a, i) => (
          <div key={i} style={{ ...GRID, padding: '14px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)' }}>
            <div style={{ color: 'var(--text-muted)' }}>{a.time}</div>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{a.admin}</div>
            <div>{a.action}</div>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{a.target}</div>
            <div style={{ color: 'var(--text-muted)' }}>{a.change}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
