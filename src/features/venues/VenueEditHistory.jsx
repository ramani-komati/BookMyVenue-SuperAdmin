import Button from '../../components/ui/Button.jsx'

const sectionTitle = { fontSize: 15, fontWeight: 800, color: 'var(--text-heading)' }
const when = (iso) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : ''
}

// Record keys → words an admin recognises.
const FIELD = {
  name: 'name', category: 'category', image: 'cover photo', gallery: 'gallery', price: 'price',
  locality: 'locality', city: 'city', district: 'district', location: 'address line', pincode: 'PIN code',
  photos: 'photos', 'detail.mapsLink': 'Google Maps link', 'detail.mapPin': 'map location',
  'detail.description': 'description', 'detail.address': 'address', 'detail.timings': 'timings',
  'detail.amenities': 'amenities', 'detail.contactPhone': 'contact phone', 'detail.capacity': 'capacity',
}
const label = (key) => FIELD[key] || key.replace(/^detail\./, '')

/**
 * Photos taken off this venue — by the current unsaved edit (`pending`) or
 * by earlier saves (`history`, from VenueEditRevision) — with Restore. A
 * restored photo goes back at the end of its gallery and is saved with the
 * next Save; nothing was ever deleted from storage.
 */
export function RemovedPhotosPanel({ pending, history, current, onRestore }) {
  const showing = new Set(Object.values(current || {}).flat().map((p) => p?.url))
  const seen = new Set()
  const rows = []
  for (const p of pending) {
    if (!seen.has(p.url)) { seen.add(p.url); rows.push({ ...p, note: 'Removed in this edit — not saved yet' }) }
  }
  for (const rev of history) {
    for (const p of rev.removedPhotos || []) {
      if (seen.has(p.url) || showing.has(p.url)) continue
      seen.add(p.url)
      rows.push({ ...p, note: `Removed by ${rev.admin || 'an admin'} · ${when(rev.at)}` })
    }
  }
  if (!rows.length) return null
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 28, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={sectionTitle}>Removed photos</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Kept so they can be reviewed or put back.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {rows.map((p) => (
          <div key={p.url} style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <img src={p.url} alt="Removed venue photo" loading="lazy" style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)', opacity: 0.85 }} />
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.note}</div>
            <Button variant="secondary" size="sm" onClick={() => onRestore(p)}>Restore</Button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Who changed this venue from the panel, when, and what (VenueEditRevision). */
export function ChangeHistory({ revisions }) {
  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={sectionTitle}>Change history</div>
      {revisions.length === 0 ? (
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No admin edits yet. Every save is recorded here and in the Audit log.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {revisions.map((rev) => (
            <li key={rev.id} style={{ fontSize: 14, padding: '8px 12px', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              <b style={{ color: 'var(--text-heading)' }}>{rev.admin || 'Admin'}</b>
              <span style={{ color: 'var(--text-muted)' }}> · {when(rev.at)}</span>
              <div style={{ color: 'var(--text-body)', marginTop: 2 }}>
                {(rev.changed || []).length ? `Changed ${[...new Set(rev.changed.map(label))].join(', ')}` : 'Saved with no changes'}
                {(rev.removedPhotos || []).length ? ` · removed ${rev.removedPhotos.length} photo${rev.removedPhotos.length === 1 ? '' : 's'}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
