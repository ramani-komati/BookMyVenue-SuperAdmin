import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { APPROVAL_STATUS_META } from './approvalMeta.js'

const PAGE_SIZE = 4

const selectStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)',
  minHeight: 40, padding: '0 12px', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', borderRadius: 10, cursor: 'pointer',
}

const CELL_BORDER = '2px solid #4B5563'

// Inner lines only — the rounded wrapper draws the outer border,
// so cells skip their last-column / last-row edges to keep every line 2px.
const thStyle = (lastCol) => ({
  borderRight: lastCol ? 'none' : CELL_BORDER,
  borderBottom: CELL_BORDER,
  padding: '13px 13px',
  fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
  color: 'var(--text-muted)', textAlign: 'left', background: '#F4EAE5', whiteSpace: 'nowrap',
})

const tdStyle = (lastCol, lastRow) => ({
  borderRight: lastCol ? 'none' : CELL_BORDER,
  borderBottom: lastRow ? 'none' : CELL_BORDER,
  padding: '13px 13px',
  fontSize: 16, verticalAlign: 'middle',
})

export default function ApprovalsListPage() {
  const { approvals } = useAdmin()
  const navigate = useNavigate()

  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCat, setFilterCat] = useState('All')
  const [filterCity, setFilterCity] = useState('All')
  const [page, setPage] = useState(1)
  const [sortDesc, setSortDesc] = useState(true)

  const day = (a) => parseInt(a.submitted, 10) || 0
  const filtered = approvals
    .filter((a) =>
      (filterStatus === 'All' || a.status === filterStatus) &&
      (filterCat === 'All' || a.category === filterCat) &&
      (filterCity === 'All' || a.city === filterCity))
    .sort((a, b) => (sortDesc ? day(b) - day(a) : day(a) - day(b)))

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const resetPage = (setter) => (e) => { setter(e.target.value); setPage(1) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={resetPage(setFilterStatus)} style={selectStyle}>
          <option value="All">Status: All</option>
          <option value="pending">Pending</option>
          <option value="changes">Changes requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filterCat} onChange={resetPage(setFilterCat)} style={selectStyle}>
          <option value="All">Category: All</option>
          <option>Sports Turf</option><option>Banquet Hall</option><option>Party Hall</option>
          <option>Swimming Pool</option><option>Private Theatre</option>
        </select>
        <select value={filterCity} onChange={resetPage(setFilterCity)} style={selectStyle}>
          <option value="All">City: All</option>
          <option>Hyderabad</option><option>Bengaluru</option><option>Pune</option>
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
          {filtered.length} submission{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ border: CELL_BORDER, borderRadius: 14, overflow: 'hidden', minWidth: 1050 }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr>
                <th style={thStyle(false)}>Venue</th>
                <th style={thStyle(false)}>Vendor</th>
                <th style={thStyle(false)}>Category</th>
                <th style={thStyle(false)}>Location</th>
                <th style={{ ...thStyle(false), padding: 0 }}>
                  <button
                    onClick={() => setSortDesc((s) => !s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', padding: '13px 13px', width: '100%', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-heading)', textAlign: 'left', whiteSpace: 'nowrap' }}
                  >
                    Submitted {sortDesc ? '↓' : '↑'}
                  </button>
                </th>
                <th style={thStyle(false)}>Complete</th>
                <th style={thStyle(true)}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v, idx) => {
                const [badge, label] = APPROVAL_STATUS_META[v.status]
                const lastRow = idx === rows.length - 1
                return (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/approvals/${v.id}`)}
                    className="hover-row"
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ ...tdStyle(false, lastRow), minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 80, height: 58, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>{v.name}</div>
                      </div>
                    </td>
                    <td style={tdStyle(false, lastRow)}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>{v.vendor}</div>
                      <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{v.phone}</div>
                    </td>
                    <td style={tdStyle(false, lastRow)}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{v.category}</span>
                    </td>
                    <td style={{ ...tdStyle(false, lastRow), color: 'var(--text-muted)' }}>{v.area}, {v.city}</td>
                    <td style={{ ...tdStyle(false, lastRow), color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{v.submitted}</td>
                    <td style={{ ...tdStyle(false, lastRow), minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--neutral-100)', overflow: 'hidden', minWidth: 50 }}>
                          <div style={{ width: v.completion + '%', height: '100%', borderRadius: 3, background: 'var(--success-500)' }} />
                        </div>
                        <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-muted)' }}>{v.completion}%</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle(true, lastRow), whiteSpace: 'nowrap' }}>
                      <Badge status={badge} size="sm">{label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-accent-soft)', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="inbox" size={26} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>No submissions match</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Try clearing a filter or checking another status.</div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '16px 0 2px' }}>
          <button onClick={() => setPage(Math.max(1, current - 1))} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '7px 14px', cursor: 'pointer' }}>Previous</button>
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Page {current} of {pages}</span>
          <button onClick={() => setPage(Math.min(pages, current + 1))} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '7px 14px', cursor: 'pointer' }}>Next</button>
        </div>
      </div>
    </div>
  )
}
