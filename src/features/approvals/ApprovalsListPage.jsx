import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Badge from '../../components/ui/Badge.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { APPROVAL_STATUS_META } from './approvalMeta.js'
import { placeOf, statusMeta } from '../../utils/format.js'
import { TELANGANA_DISTRICTS } from '../../constants/districts.js'

const PAGE_SIZE = 10

const selectStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)',
  minHeight: 40, padding: '0 12px', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', borderRadius: 10, cursor: 'pointer',
}

const GRID = { display: 'grid', gridTemplateColumns: '2.8fr 1.3fr 150px 1.1fr 105px 125px 160px', minWidth: 1180, gap: 12 }

export default function ApprovalsListPage() {
  const { approvals } = useAdmin()
  const navigate = useNavigate()
  const { width } = useViewport()
  const compact = width < 768

  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCat, setFilterCat] = useState('All')
  const [filterCity, setFilterCity] = useState('All')
  const [page, setPage] = useState(1)
  const [sortDesc, setSortDesc] = useState(true)

  const day = (a) => parseInt(a.submitted, 10) || 0

  // District filter: every Telangana district (what vendors pick in the
  // wizard), plus any district/city value present in the data that isn't in
  // the list — so no approval is ever unfilterable. Categories come from the
  // data itself.
  const cityOptions = [...new Set([
    ...TELANGANA_DISTRICTS,
    ...approvals.flatMap((a) => [a.district, a.city]).filter(Boolean),
  ])]
  const categoryOptions = [...new Set(approvals.map((a) => a.category).filter(Boolean))].sort()
  // A record matches when the chosen district equals its district OR (for
  // records from before the backend exposed `district`) its city field.
  const matchesCity = (a) => filterCity === 'All' || a.district === filterCity || a.city === filterCity
  const filtered = approvals
    .filter((a) =>
      (filterStatus === 'All' || a.status === filterStatus) &&
      (filterCat === 'All' || a.category === filterCat) &&
      matchesCity(a))
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
          {categoryOptions.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterCity} onChange={resetPage(setFilterCity)} style={selectStyle}>
          <option value="All">City: All</option>
          {cityOptions.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
          {filtered.length} submission{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((v) => {
            const [badge, label] = statusMeta(APPROVAL_STATUS_META, v.status)
            return (
              <div key={v.id} onClick={() => navigate(`/approvals/${v.id}`)} className="card hover-wash" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 72, height: 52, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>{v.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{v.vendor} · {placeOf(v)}</div>
                  </div>
                  <Badge status={badge} size="sm">{label}</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '4px 11px', borderRadius: 999, fontSize: 13.5 }}>{v.category}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Submitted {v.submitted}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--neutral-100)', overflow: 'hidden' }}>
                    <div style={{ width: v.completion + '%', height: '100%', borderRadius: 3, background: 'var(--success-500)' }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>{v.completion}% complete</span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-accent-soft)', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="inbox" size={26} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>No submissions match</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Try clearing a filter or checking another status.</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <button onClick={() => setPage(Math.max(1, current - 1))} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Previous</button>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Page {current} of {pages}</span>
            <button onClick={() => setPage(Math.min(pages, current + 1))} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer' }}>Next</button>
          </div>
        </div>
      ) : (
      <div className="card" style={{ padding: '8px 20px 14px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>Venue</div><div>Vendor</div><div>Category</div><div>Location</div>
          <button
            onClick={() => setSortDesc((s) => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-heading)', textAlign: 'left' }}
          >
            Submitted {sortDesc ? '↓' : '↑'}
          </button>
          <div>Complete</div><div>Status</div>
        </div>

        {rows.map((v) => {
          const [badge, label] = statusMeta(APPROVAL_STATUS_META, v.status)
          return (
            <div
              key={v.id}
              onClick={() => navigate(`/approvals/${v.id}`)}
              className="hover-row"
              style={{ ...GRID, padding: '16px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{ width: 84, height: 60, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>{v.name}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>{v.vendor}</div>
                <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{v.phone}</div>
              </div>
              <div>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{v.category}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>{placeOf(v)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>{v.submitted}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--neutral-100)', overflow: 'hidden' }}>
                  <div style={{ width: v.completion + '%', height: '100%', borderRadius: 3, background: 'var(--success-500)' }} />
                </div>
                <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-muted)' }}>{v.completion}%</span>
              </div>
              <div><Badge status={badge} size="sm">{label}</Badge></div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-accent-soft)', color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="inbox" size={26} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>No submissions match</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Try clearing a filter or checking another status.</div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 12px 4px' }}>
          <button onClick={() => setPage(Math.max(1, current - 1))} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '7px 14px', cursor: 'pointer' }}>Previous</button>
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Page {current} of {pages}</span>
          <button onClick={() => setPage(Math.min(pages, current + 1))} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '7px 14px', cursor: 'pointer' }}>Next</button>
        </div>
      </div>
      )}
    </div>
  )
}
