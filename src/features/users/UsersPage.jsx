import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { fmt, initials } from '../../data/mockData.js'
import Badge from '../../components/ui/Badge.jsx'

const USER_META = { active: ['success', 'Active'], blocked: ['error', 'Blocked'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.7fr 1.2fr 115px 130px 140px 115px', minWidth: 960, gap: 10 }

export default function UsersPage() {
  const { users, openDrawer } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {users.map((u) => (
          <div key={u.id} onClick={() => openDrawer('user', u.id)} className="card hover-wash" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-accent-soft)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flex: '0 0 auto' }}>{initials(u.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{u.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{u.phone}</div>
              </div>
              <Badge status={USER_META[u.status][0]} size="sm">{USER_META[u.status][1]}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 14.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{u.bookings} booking{u.bookings === 1 ? '' : 's'}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(u.spentNum)} spent</span>
              <span style={{ color: 'var(--text-muted)' }}>active {u.lastActive.toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Customer</div><div>Phone</div><div>Bookings</div><div>Total spent</div><div>Last active</div><div>Status</div>
        </div>
        {users.map((u) => (
          <div
            key={u.id}
            onClick={() => openDrawer('user', u.id)}
            className="hover-row"
            style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-accent-soft)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flex: '0 0 auto' }}>{initials(u.name)}</div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)' }}>{u.name}</div>
            </div>
            <div style={{ fontSize: 16 }}>{u.phone}</div>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{u.bookings}</div>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(u.spentNum)}</div>
            <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{u.lastActive}</div>
            <div><Badge status={USER_META[u.status][0]} size="sm">{USER_META[u.status][1]}</Badge></div>
          </div>
        ))}
      </div>
    </div>
  )
}
