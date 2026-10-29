import { useMemo, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { moveItem } from './bannerSpec.js'
import { EmptyCard, MoveButtons, dangerLinkBtn, hintStyle, inputStyle, linkBtn, sectionTitle } from './homepageUi.jsx'

/**
 * Featured venues lead the Explore venue list (tagged "Featured"; the old
 * separate Spotlight row repeated the same venues and was merged into it). This reuses each venue's existing
 * "Feature on homepage" switch (the same one on Live venues and the venue
 * drawer) — the card always links to the original venue record — and only
 * adds an order. Venues that aren't live are kept here but never shown.
 */
export default function FeaturedVenuesTab({ data, run }) {
  const { venues, setVenues } = useAdmin()
  const [query, setQuery] = useState('')
  const rows = data.featuredVenues
  const featuredIds = new Set(rows.map((v) => v.id))
  const max = data.limits.maxFeaturedVenues

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return venues
      .filter((v) => v.status === 'live' && !featuredIds.has(v.id))
      .filter((v) => !q || [v.name, v.category, v.area, v.city].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues, query, rows])

  const setFeatured = (venue, featured) => run(async () => {
    await adminApi.updateVenue(venue.id, { featured })
    setVenues((prev) => prev.map((v) => (v.id === venue.id ? { ...v, featured } : v)))
    // The server writes the audit entry for the switch itself.
    return adminApi.getHomepage()
  }, featured ? `${venue.name} featured at the top of the venue list` : `${venue.name} no longer featured — the venue is unchanged and still listed`)

  const move = (index, delta) => {
    const ids = moveItem(rows, index, delta).map((v) => v.id)
    run(() => adminApi.reorderFeaturedVenues(data.revision, ids), 'Order saved')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={sectionTitle}>Featured venues</div>
        <div style={hintStyle}>
          Shown first in the Explore venue list, in this order (up to {max}), tagged “Featured” — then every other venue, each listed once. Venue discovery stays separate from Top events and promotions.
        </div>
      </div>

      {rows.length === 0 && <EmptyCard title="No featured venues" body="The venue list then starts with the newest listings." />}

      {rows.map((v, i) => (
        <div key={v.id} className="card" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <MoveButtons index={i} count={rows.length} onMove={move} label={v.name} />
          <div style={{ width: 72, height: 54, borderRadius: 10, overflow: 'hidden', background: 'var(--navy-800)', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            {v.image ? <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="building-2" size={20} />}
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{v.name}</span>
              {v.status !== 'live' && <Badge status="warning">{v.status} — hidden</Badge>}
              {i >= max && <Badge status="neutral">Beyond the {max} shown</Badge>}
            </div>
            <div style={hintStyle}>
              {[v.category, v.locality, v.ratingCount ? `${Number(v.rating).toFixed(1)}★ (${v.ratingCount})` : 'Not rated yet'].filter(Boolean).join(' · ')}
            </div>
          </div>
          <button type="button" style={dangerLinkBtn} onClick={() => setFeatured(v, false)}>Stop featuring</button>
        </div>
      ))}

      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>Feature a venue</div>
        <input className="bmva" style={inputStyle} placeholder="Search live venues by name, category or area…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {candidates.length === 0 ? (
          <div style={hintStyle}>No other live venues match.</div>
        ) : candidates.map((v) => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 220px', minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{v.name}</span>
              <span style={{ ...hintStyle, marginLeft: 8 }}>{[v.category, v.area || v.city].filter(Boolean).join(' · ')}</span>
            </span>
            <button type="button" style={linkBtn} onClick={() => setFeatured(v, true)}>Feature</button>
          </div>
        ))}
      </div>
    </div>
  )
}
