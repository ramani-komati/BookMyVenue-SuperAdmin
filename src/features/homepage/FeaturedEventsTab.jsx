import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { EVENT_STATES, moveItem } from './bannerSpec.js'
import { EmptyCard, Field, MoveButtons, dangerLinkBtn, hintStyle, inputStyle, linkBtn, sectionTitle } from './homepageUi.jsx'

const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function ScheduleRow({ event, run }) {
  const [from, setFrom] = useState(event.featuredFrom || '')
  const [until, setUntil] = useState(event.featuredUntil || '')
  const changed = from !== (event.featuredFrom || '') || until !== (event.featuredUntil || '')
  useEffect(() => {
    setFrom(event.featuredFrom || '')
    setUntil(event.featuredUntil || '')
  }, [event.featuredFrom, event.featuredUntil])
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <Field label="Show from" style={{ flex: '0 1 170px' }}>
        <input className="bmva" type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
      </Field>
      <Field label="Show until" style={{ flex: '0 1 170px' }}>
        <input className="bmva" type="date" style={inputStyle} value={until} onChange={(e) => setUntil(e.target.value)} />
      </Field>
      {changed && (
        <Button variant="navy" size="sm" onClick={() => run(() => adminApi.scheduleFeaturedEvent(event.id, { from, until }), 'Schedule saved')}>
          Save dates
        </Button>
      )}
    </div>
  )
}

/**
 * Featured events = Top events on Explore. Picks EXISTING published events
 * (searched, never typed ids), orders them, schedules them, and removes them
 * from the homepage without touching the event itself. The server shows only
 * those that are live, bookable and inside their dates — pending or rejected
 * vendor events can't be featured at all.
 */
export default function FeaturedEventsTab({ data, run }) {
  const { events, refreshEvents } = useAdmin()
  const [query, setQuery] = useState('')
  const rows = data.featuredEvents
  const limit = data.sections.find((s) => s.key === 'topEvents')?.limit || 6
  const maxFeatured = data.limits.maxFeaturedEvents

  useEffect(() => {
    refreshEvents?.().catch(() => {})
  }, [refreshEvents])

  const featuredIds = new Set(rows.map((e) => e.id))
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events
      .filter((e) => e.status === 'live' && !featuredIds.has(e.id))
      .filter((e) => !q || [e.name, e.category, e.city, e.location].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, query, rows])

  const move = (index, delta) => {
    const ids = moveItem(rows, index, delta).map((e) => e.id)
    run(() => adminApi.reorderFeaturedEvents(data.revision, ids), 'Order saved')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={sectionTitle}>Featured events (Top events)</div>
        <div style={hintStyle}>
          Shown straight after the hero, in this order. The homepage shows the first {limit} that are live and bookable today
          (change the number under Homepage sections). Up to {maxFeatured} can be featured at once.
        </div>
      </div>

      {rows.length === 0 && <EmptyCard title="No featured events" body="Search for a published event below to feature it." />}

      {rows.map((e, i) => {
        const state = EVENT_STATES[e.state] || EVENT_STATES.showing
        return (
          <div key={e.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <MoveButtons index={i} count={rows.length} onMove={move} label={e.name} />
              <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: 'var(--navy-800)', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                {e.image ? <img src={e.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="ticket" size={22} />}
              </div>
              <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{e.name}</span>
                  <Badge status={state.badge}>{state.label}</Badge>
                  {i >= limit && e.state === 'showing' && <Badge status="neutral">Beyond the {limit} shown</Badge>}
                </div>
                <div style={hintStyle}>
                  {[e.category, e.location, e.nextDate ? `Next: ${fmtDate(e.nextDate)}` : 'No upcoming date',
                    e.ratingCount ? `${e.rating?.toFixed?.(1) ?? e.rating}★ (${e.ratingCount})` : 'Not rated yet'].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button type="button" style={dangerLinkBtn} onClick={() => run(() => adminApi.unfeatureEvent(e.id), `${e.name} removed from the homepage — the event itself is unchanged`)}>
                Remove from homepage
              </button>
            </div>
            <ScheduleRow event={e} run={run} />
          </div>
        )
      })}

      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>Add an event</div>
        <input className="bmva" style={inputStyle} placeholder="Search published events by name, category or place…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {candidates.length === 0 ? (
          <div style={hintStyle}>{events.some((e) => e.status === 'live') ? 'No other published events match.' : 'No published events yet — publish one on the Events page first.'}</div>
        ) : candidates.map((e) => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 220px', minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{e.name}</span>
              <span style={{ ...hintStyle, marginLeft: 8 }}>{[e.category, e.city || e.location].filter(Boolean).join(' · ')}</span>
            </span>
            <button
              type="button"
              style={{ ...linkBtn, opacity: rows.length >= maxFeatured ? 0.5 : 1 }}
              disabled={rows.length >= maxFeatured}
              title={rows.length >= maxFeatured ? `Up to ${maxFeatured} events can be featured — remove one first` : undefined}
              onClick={() => run(() => adminApi.featureEvent(e.id), `${e.name} is featured`)}
            >
              Feature
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
