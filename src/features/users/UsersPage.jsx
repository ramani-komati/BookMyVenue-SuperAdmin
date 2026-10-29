import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { adminApi } from '../../services/adminApi.js'
import { fmt, initials, statusMeta } from '../../utils/format.js'
import { exportFileName } from '../../utils/exports.js'
import { localTodayISO } from '../../utils/slots.js'
import Badge from '../../components/ui/Badge.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import { countStyle, searchStyle, selectStyle } from '../../components/ui/filterStyles.js'
import { USER_STATUS_OPTIONS, filterUsers, userExportParams } from './userFilters.js'

const USER_META = { active: ['success', 'Active'], blocked: ['error', 'Blocked'] }

const GRID = { display: 'grid', gridTemplateColumns: '1.7fr 1.2fr 115px 130px 140px 115px', minWidth: 960, gap: 10 }

export default function UsersPage() {
  const { users, openDrawer } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const filters = { query, status }
  const shown = filterUsers(users, filters)
  const filtering = shown.length !== users.length

  // Received-count — makes a short backend list visible at a glance; with a
  // search or status filter it reads "3 of 120 users".
  const countLine = (
    <div style={countStyle}>
      {users.length === 0
        ? 'No users yet.'
        : `${filtering ? `${shown.length} of ` : ''}${users.length} user${users.length === 1 ? '' : 's'}`}
    </div>
  )

  // Search, status, count and the export of exactly the users listed below
  // (the server applies the same search and status — see userFilters.js).
  const toolbar = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        className="bmva" type="search" placeholder="Search name, phone, email or ID…" value={query}
        onChange={(e) => setQuery(e.target.value)} style={searchStyle(compact)} aria-label="Search users"
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle} aria-label="Account status">
        {USER_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div style={{ flex: 1 }} />
      {countLine}
      <ExportButton
        fetchFile={() => adminApi.exportReport('users', userExportParams(filters))}
        filename={exportFileName('admin_users', localTodayISO())}
        count={shown.length} noun={shown.length === 1 ? 'user' : 'users'} what="users"
        label={filtering ? 'Export matching users' : 'Export Excel'}
        title={filtering ? 'Exports the users matching your search and filter' : 'Exports every user'}
      />
    </div>
  )
  const noMatch = users.length > 0 && shown.length === 0 && (
    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>
      No users match this search.
    </div>
  )

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {toolbar}
        {noMatch}
        {shown.map((u) => (
          <div key={u.id} onClick={() => openDrawer('user', u.id)} className="card hover-wash" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-accent-soft)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flex: '0 0 auto' }}>{initials(u.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{u.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{u.phone}</div>
              </div>
              <Badge status={statusMeta(USER_META, u.status)[0]} size="sm">{statusMeta(USER_META, u.status)[1]}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 14.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{u.bookings} booking{u.bookings === 1 ? '' : 's'}</span>
              <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{fmt(u.spentNum)} spent</span>
              <span style={{ color: 'var(--text-muted)' }}>active {String(u.lastActive || '—').toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {toolbar}
      {noMatch || (
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Customer</div><div>Phone</div><div>Bookings</div><div>Total spent</div><div>Last active</div><div>Status</div>
        </div>
        {shown.map((u) => (
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
            <div><Badge status={statusMeta(USER_META, u.status)[0]} size="sm">{statusMeta(USER_META, u.status)[1]}</Badge></div>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
