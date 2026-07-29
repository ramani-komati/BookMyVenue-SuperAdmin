import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'

const VENUE_META = { live: ['live', 'Live'], paused: ['warning', 'Paused'], rejected: ['rejected', 'Rejected'], draft: ['draft', 'Draft'] }

const GRID = { display: 'grid', gridTemplateColumns: '34px 2.5fr 1.2fr 140px 100px 100px 80px 100px 120px 175px', minWidth: 1280, gap: 10 }

export default function VenuesPage() {
  const { venues, setVenues, updateVenue, openModal, logAudit, showToast, openDrawer } = useAdmin()
  const { width } = useViewport()
  const compact = width < 768
  const [selectedIds, setSelectedIds] = useState([])

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
    title: 'Pause ' + selectedIds.length + ' venues?',
    body: 'They all stop taking new bookings immediately.',
    confirmLabel: 'Pause all', danger: true, needsReason: true,
    onConfirm: (reason) => {
      setVenues((prev) => prev.map((v) => (selectedIds.includes(v.id) ? { ...v, status: 'paused' } : v)))
      logAudit('Bulk paused venues', selectedIds.length + ' venues', 'reason: ' + reason)
      showToast(selectedIds.length + ' venues paused')
      setSelectedIds([])
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--navy-800)', color: '#fff', borderRadius: 12, padding: '10px 16px' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedIds.length} selected</span>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" onClick={bulkPause}>Pause selected</Button>
          <button onClick={() => setSelectedIds([])} style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--navy-200)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {compact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {venues.map((v) => {
            const [badge, label] = VENUE_META[v.status]
            const selected = selectedIds.includes(v.id)
            return (
              <div key={v.id} onClick={() => openDrawer('venue', v.id)} className="card hover-wash" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="checkbox" checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => toggleSel(v.id)} style={{ width: 18, height: 18, accentColor: '#F1252E', cursor: 'pointer', flex: '0 0 auto' }} />
                  <div style={{ width: 70, height: 50, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.3 }}>{v.name}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{v.vendor} · {v.city}</div>
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

        {venues.map((v) => {
          const [badge, label] = VENUE_META[v.status]
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
                </div>
              </div>
              <div style={{ fontSize: 16 }}>{v.vendor}</div>
              <div><span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{v.category}</span></div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>{v.city}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.price}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{v.rating}</div>
              <div>{v.bookings}</div>
              <div><Badge status={badge} size="sm">{label}</Badge></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
