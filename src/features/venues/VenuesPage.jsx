import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import { adminApi } from '../../services/adminApi.js'
import { placeOf } from '../../utils/format.js'
import { exportFileName } from '../../utils/exports.js'
import { localTodayISO } from '../../utils/slots.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import Icon from '../../components/ui/Icon.jsx'
import SearchInput from '../../components/ui/SearchInput.jsx'
import { searchVenues, venueSearchParams } from './venueSearch.js'
import { PIN_STATUS } from './venueEdit.js'

const VENUE_META = { live: ['live', 'Live'], paused: ['warning', 'Paused'], pending: ['warning', 'Pending'], rejected: ['rejected', 'Rejected'], draft: ['draft', 'Draft'], deletion_requested: ['warning', 'Deletion requested'] }
// Unknown statuses from the API must never crash the page — show them as-is.
const venueMeta = (status) => VENUE_META[status] || ['draft', status || 'Unknown']

// Live venues = the ones actually LIVE and bookable. A deletion-requested
// venue is still live/bookable (the request only removes it once a super-admin
// APPROVES), so it stays here — with its "Deletion requested" badge — until
// approval flips it to `deleted`. Paused/pending/rejected/drafts/deleted live
// in the All venues registry.
const isLive = (v) => v.status === 'live' || v.status === 'deletion_requested'

const GRID = { display: 'grid', gridTemplateColumns: '34px 2.5fr 1.2fr 140px 100px 100px 80px 100px 120px 250px', minWidth: 1360, gap: 10 }

// Where the venue is on the map (adminpanel formatters pin_info). Older
// backends don't send pinStatus — then nothing is shown rather than a guess.
function PinBadge({ v }) {
  const meta = PIN_STATUS[v.pinStatus]
  if (!meta) return null
  return (
    <span
      title={v.pinStatus === 'missing' ? 'Customers see this venue under “Distance unknown” — open Edit → Location to set it' : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: meta.tone === 'success' ? 'var(--text-muted)' : meta.tone === 'error' ? 'var(--error-700)' : 'var(--warning-700, #b45309)' }}
    >
      <Icon name="map-pin" size={13} /> {meta.label}
    </span>
  )
}

const editBtn = { fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }

export default function VenuesPage() {
  const { venues, setVenues, updateVenue, openModal, logAudit, showToast, openDrawer } = useAdmin()
  const navigate = useNavigate()
  const { width } = useViewport()
  const compact = width < 768
  const [selectedIds, setSelectedIds] = useState([])
  const [unpinnedOnly, setUnpinnedOnly] = useState(false)
  const allLive = venues.filter(isLive)
  const unpinned = allLive.filter((v) => v.pinStatus && v.pinStatus !== 'ok')
  const [query, setQuery] = useState('')
  // Search runs over whatever the pin filter left — the two combine.
  const live = searchVenues(unpinnedOnly ? unpinned : allLive, query)
  const filtering = live.length !== allLive.length
  // Bulk actions only touch selected venues that are still on screen, so a
  // search can never hide a venue that then gets paused.
  const visibleSelected = selectedIds.filter((id) => live.some((v) => v.id === id))
  // Edit opens the full venue editor (details, map location, photos).
  const editVenue = (v) => navigate(`/all-venues/${encodeURIComponent(v.id)}/edit`)

  const toggleSel = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const togglePause = (v) => {
    if (v.status === 'paused') {
      updateVenue(v.id, { status: 'live' })
      logAudit('Unpaused venue', v.name, 'paused → live')
      showToast(v.name + ' is live again')
    } else {
      openModal({
        title: 'Pause ' + v.name + '?',
        body: 'The venue stops taking new bookings immediately. Existing bookings are not affected.',
        confirmLabel: 'Pause venue', danger: true, needsReason: true,
        onConfirm: (reason) => {
          updateVenue(v.id, { status: 'paused' })
          logAudit('Paused venue', v.name, 'reason: ' + reason)
          showToast(v.name + ' paused')
        },
      })
    }
  }

  const toggleFeature = (v) => {
    updateVenue(v.id, { featured: !v.featured })
    logAudit(v.featured ? 'Unfeatured venue' : 'Featured venue', v.name, 'homepage feature: ' + (v.featured ? 'off' : 'on'))
    showToast(v.featured ? v.name + ' removed from homepage' : v.name + ' featured on homepage')
  }

  const bulkPause = () => openModal({
    title: 'Pause ' + visibleSelected.length + ' venues?',
    body: 'They all stop taking new bookings immediately.',
    confirmLabel: 'Pause all', danger: true, needsReason: true,
    onConfirm: (reason) => {
      setVenues((prev) => prev.map((v) => (visibleSelected.includes(v.id) ? { ...v, status: 'paused' } : v)))
      logAudit('Bulk paused venues', visibleSelected.length + ' venues', 'reason: ' + reason)
      showToast(visibleSelected.length + ' venues paused')
      setSelectedIds([])
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Count of venues currently on the platform (live + paused); the full
          registry — every status incl. deleted — is the All venues panel. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <SearchInput
          value={query} onChange={setQuery} compact={compact} label="Search live venues"
          placeholder="Search venue, vendor, city, category or ID…"
        />
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-muted)', flex: 1, minWidth: 200 }}>
          {allLive.length === 0
            ? 'No live venues yet.'
            : `${filtering ? `${live.length} of ` : ''}${allLive.length} live venue${allLive.length === 1 ? '' : 's'}`}
          {unpinned.length > 0 && (
            <label style={{ marginLeft: 14, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--warning-700, #b45309)', cursor: 'pointer' }}>
              <input type="checkbox" checked={unpinnedOnly} onChange={(e) => setUnpinnedOnly(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#F1252E' }} />
              Only the {unpinned.length} without a valid map location
            </label>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/all-venues')}
            style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            All venues incl. deleted →
          </button>
          <ExportButton
            fetchFile={() => adminApi.exportReport('venues', {
              scope: 'live', ...venueSearchParams(query), ...(unpinnedOnly ? { pin: 'unpinned' } : {}),
            })}
            filename={exportFileName('admin_venues', localTodayISO())}
            count={live.length} noun={live.length === 1 ? 'live venue' : 'live venues'} what="venues"
            label={filtering ? 'Export matching venues' : 'Export Excel'}
            title={filtering
              ? 'Exports the live venues matching your search and filter'
              : 'Exports every live venue with its vendor, location, price, status and booking totals'}
          />
        </div>
      </div>
      {visibleSelected.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--navy-800)', color: '#fff', borderRadius: 12, padding: '10px 16px' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{visibleSelected.length} selected</span>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" onClick={bulkPause}>Pause selected</Button>
          <button onClick={() => setSelectedIds([])} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--navy-200)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {allLive.length > 0 && live.length === 0 && (
        <div className="card" role="status" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <span>
            {query.trim() ? <>No live venues match “{query.trim()}”{unpinnedOnly ? ' among those without a map location' : ''}.</> : 'No live venues match this filter.'}
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            {query && <Button variant="secondary" size="sm" onClick={() => setQuery('')}>Clear search</Button>}
            {unpinnedOnly && <Button variant="ghost" size="sm" onClick={() => setUnpinnedOnly(false)}>Show all live venues</Button>}
          </span>
        </div>
      )}

      {live.length === 0 ? null : compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {live.map((v) => {
            const [badge, label] = venueMeta(v.status)
            const selected = selectedIds.includes(v.id)
            return (
              <div key={v.id} onClick={() => openDrawer('venue', v.id)} className="card hover-wash" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="checkbox" checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(v.id)} style={{ width: 18, height: 18, accentColor: '#F1252E', cursor: 'pointer', flex: '0 0 auto' }} />
                  <div style={{ width: 70, height: 50, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>{v.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{v.vendor} · {placeOf(v)}</div>
                    <PinBadge v={v} />
                    {v.featured && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red-600)' }}>★ Featured on homepage</div>}
                  </div>
                  <Badge status={badge} size="sm">{label}</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14.5 }}>
                  <span style={{ fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '4px 11px', borderRadius: 999, fontSize: 13.5 }}>{v.category}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.price}/hr</span>
                  <span style={{ color: 'var(--text-muted)' }}>★ {v.rating}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{v.bookings} bookings</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); editVenue(v) }} aria-label={`Edit ${v.name}`} style={{ ...editBtn, fontSize: 15, padding: '9px 13px' }}>
                    <Icon name="pencil" size={14} /> Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePause(v) }} style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '9px 13px', cursor: 'pointer' }}>
                    {v.status === 'paused' ? 'Unpause' : 'Pause'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFeature(v) }}
                    title="Feature on homepage"
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700,
                      color: v.featured ? '#fff' : 'var(--text-muted)',
                      background: v.featured ? 'var(--red-500)' : 'var(--surface-card)',
                      border: `1px solid ${v.featured ? 'var(--red-500)' : 'var(--border-default)'}`,
                      borderRadius: 9, padding: '9px 16px', cursor: 'pointer', flex: '0 0 auto',
                    }}
                  >
                    ★
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <div className="card" style={{ padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
        <div style={{ ...GRID, padding: '14px 12px 10px', fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div /><div>Venue</div><div>Vendor</div><div>Category</div><div>City</div><div>Price/hr</div><div>Rating</div><div>Bookings</div><div>Status</div><div>Actions</div>
        </div>

        {live.map((v) => {
          const [badge, label] = venueMeta(v.status)
          const selected = selectedIds.includes(v.id)
          return (
            <div
              key={v.id}
              onClick={() => openDrawer('venue', v.id)}
              className="hover-row"
              style={{ ...GRID, padding: '14px 12px', fontSize: 16, alignItems: 'center', borderBottom: '1px solid var(--neutral-100)', cursor: 'pointer' }}
            >
              <input type="checkbox" checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(v.id)} style={{ width: 18, height: 18, accentColor: '#F1252E', cursor: 'pointer' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{ width: 80, height: 58, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>{v.name}</div>
                  {v.featured && <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--red-600)' }}>★ Featured on homepage</div>}
                  <PinBadge v={v} />
                </div>
              </div>
              <div style={{ fontSize: 16 }}>{v.vendor}</div>
              <div><span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{v.category}</span></div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{placeOf(v)}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.price}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.rating}</div>
              <div>{v.bookings}</div>
              <div><Badge status={badge} size="sm">{label}</Badge></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={(e) => { e.stopPropagation(); editVenue(v) }} aria-label={`Edit ${v.name}`} style={{ ...editBtn, fontSize: 15.5, padding: '8px 12px' }}>
                  <Icon name="pencil" size={14} /> Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); togglePause(v) }} style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 9, padding: '8px 13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {v.status === 'paused' ? 'Unpause' : 'Pause'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFeature(v) }}
                  title="Feature on homepage"
                  style={{
                    fontFamily: 'var(--font-body)', fontSize: 16.5, fontWeight: 700,
                    color: v.featured ? '#fff' : 'var(--text-muted)',
                    background: v.featured ? 'var(--red-500)' : 'var(--surface-card)',
                    border: `1px solid ${v.featured ? 'var(--red-500)' : 'var(--border-default)'}`,
                    borderRadius: 9, padding: '8px 13px', cursor: 'pointer',
                  }}
                >
                  ★
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
