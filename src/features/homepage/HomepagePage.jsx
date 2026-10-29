import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Button from '../../components/ui/Button.jsx'
import DataErrorCard from '../../components/DataErrorCard.jsx'
import BannersTab from './BannersTab.jsx'
import FeaturedEventsTab from './FeaturedEventsTab.jsx'
import FeaturedVenuesTab from './FeaturedVenuesTab.jsx'
import { moveItem } from './bannerSpec.js'
import { Check, Field, MoveButtons, hintStyle, inputStyle, sectionTitle } from './homepageUi.jsx'

const TABS = [
  { key: 'hero', label: 'Hero banners' },
  { key: 'events', label: 'Featured events' },
  { key: 'promotions', label: 'Featured promotions' },
  { key: 'venues', label: 'Featured venues' },
  { key: 'sections', label: 'Homepage sections' },
]

// Spotlight and Newly added used to repeat the main venue list; they are now
// part of it (backend MERGED_SECTIONS). The fallback covers a backend that
// predates the `mergedInto` field.
const MERGED_FALLBACK = new Set(['spotlight', 'newVenues'])
const isMerged = (s) => Boolean(s?.mergedInto) || (s?.mergedInto === undefined && MERGED_FALLBACK.has(s?.key))

const editable = (s) => ({ key: s.key, enabled: s.enabled, title: s.title, subtitle: s.subtitle, ...(s.limit != null ? { limit: s.limit } : {}) })

/**
 * Homepage sections: switch sections on/off, retitle them, set how many Top
 * events show, and reorder the venue-discovery sections. The first three
 * (hero, Top events, Featured promotions) keep their places. Changes are a
 * draft here — the outline on the right previews the order — until Publish.
 */
function SectionsTab({ data, run }) {
  const { isMobile } = useViewport()
  const [draft, setDraft] = useState(() => data.sections.map(editable))
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) setDraft(data.sections.map(editable))
  }, [data.sections, dirty])

  const info = Object.fromEntries(data.sections.map((s) => [s.key, s]))
  const fixed = draft.filter((s) => info[s.key]?.fixed)
  const merged = draft.filter((s) => !info[s.key]?.fixed && isMerged(info[s.key]))
  const movable = draft.filter((s) => !info[s.key]?.fixed && !isMerged(info[s.key]))
  const patch = (key, change) => {
    setDraft((list) => list.map((s) => (s.key === key ? { ...s, ...change } : s)))
    setDirty(true)
  }
  const move = (index, delta) => {
    setDraft([...fixed, ...moveItem(movable, index, delta), ...merged])
    setDirty(true)
  }
  const publish = async () => {
    const ok = await run(() => adminApi.saveHomepageSections(data.revision, draft), 'Homepage layout published')
    if (ok) setDirty(false)
  }
  const discard = () => {
    setDraft(data.sections.map(editable))
    setDirty(false)
  }

  const row = (s, i, list, canMove) => {
    const meta = info[s.key] || {}
    return (
      <div key={s.key} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, opacity: s.enabled ? 1 : 0.7 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {canMove && <MoveButtons index={i} count={list.length} onMove={move} label={meta.label} />}
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <Check
              checked={s.enabled}
              disabled={meta.required}
              onChange={(v) => patch(s.key, { enabled: v })}
              label={meta.label}
              hint={meta.required ? `${meta.help}` : meta.help}
            />
          </div>
        </div>
        {s.key !== 'hero' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: 10 }}>
            <Field label="Title" hint={meta.defaultTitle ? `Default: ${meta.defaultTitle}` : s.key === 'venues' ? 'Blank = “Venues near you” / “Explore venues in {area}”' : undefined}>
              <input className="bmva" style={inputStyle} value={s.title} maxLength={80} onChange={(e) => patch(s.key, { title: e.target.value })} />
            </Field>
            <Field label="Subtitle" hint={s.key === 'spotlight' ? 'Blank = describe what the row holds' : undefined}>
              <input className="bmva" style={inputStyle} value={s.subtitle} maxLength={160} onChange={(e) => patch(s.key, { subtitle: e.target.value })} />
            </Field>
            {s.key === 'topEvents' && (
              <Field label="How many events to show">
                <input
                  className="bmva" type="number" min="1" max={data.limits.maxTopEvents} style={inputStyle} value={s.limit}
                  onChange={(e) => patch(s.key, { limit: Math.max(1, Math.min(data.limits.maxTopEvents, Number(e.target.value) || 1)) })}
                />
              </Field>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={sectionTitle}>Top of the page (fixed order)</div>
        {fixed.map((s, i) => row(s, i, fixed, false))}
        <div style={{ ...sectionTitle, marginTop: 8 }}>Venue discovery (reorder with the arrows)</div>
        <div style={hintStyle}>Use {'{area}'} in a title for the customer’s chosen area, e.g. “Venues in {'{area}'}”.</div>
        {movable.map((s, i) => row(s, i, movable, true))}
        {merged.length > 0 && (
          <>
            <div style={{ ...sectionTitle, marginTop: 8 }}>Merged into the venue list</div>
            <div style={hintStyle}>These used to be separate rows that repeated the same venues. Each venue is now listed once.</div>
            {merged.map((s) => {
              const meta = info[s.key] || {}
              return (
                <div key={s.key} className="card" style={{ padding: 14 }}>
                  {s.key === 'spotlight' ? (
                    <Check
                      checked={s.enabled}
                      onChange={(v) => patch(s.key, { enabled: v })}
                      label={meta.label}
                      hint={meta.help}
                    />
                  ) : (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{meta.label}</div>
                      <div style={hintStyle}>{meta.help}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
      <aside className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, position: isMobile ? 'static' : 'sticky', top: 16 }}>
        <div style={sectionTitle}>Preview of the order</div>
        <div style={hintStyle}>{dirty ? 'Unpublished changes — customers still see the saved layout.' : 'What customers see now.'}</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...fixed, ...movable].filter((s) => s.enabled).map((s) => (
            <li key={s.key} style={{ fontSize: 15, color: 'var(--text-heading)' }}>
              <strong>{info[s.key]?.label}</strong>
              {s.title && s.key !== 'hero' ? <span style={hintStyle}> — “{s.title.replace(/\{area\}/g, 'Warangal')}”</span> : null}
              {s.key === 'venues' && merged.find((m) => m.key === 'spotlight')?.enabled
                ? <span style={hintStyle}> · featured venues first</span>
                : null}
            </li>
          ))}
          <li style={{ ...hintStyle, listStyle: 'none', marginLeft: -20 }}>…then the trust strip and footer.</li>
        </ol>
        {dirty && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={publish}>Publish layout</Button>
            <Button variant="ghost" size="sm" onClick={discard}>Discard</Button>
          </div>
        )}
      </aside>
    </div>
  )
}

/**
 * Homepage — the super admin's control of the customer Explore page:
 * hero banners (image uploads), featured events (Top events), featured
 * promotions, featured venues (top of the venue list) and the section layout. All of it
 * is saved on the server and goes live on the customer site within moments,
 * with no deployment. Everything here works on the EXISTING records — the
 * platform promotions list, events and venues — and never creates, copies or
 * deletes an event or a venue.
 */
export default function HomepagePage() {
  const { showToast } = useAdmin()
  const { isMobile } = useViewport()
  const [tab, setTab] = useState('hero')
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error | unavailable

  const load = useCallback(async () => {
    setState('loading')
    try {
      setData(await adminApi.getHomepage())
      setState('ready')
    } catch (err) {
      setState(err.status === 404 ? 'unavailable' : 'error')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  // Run one write. Every homepage write answers with the whole page; a
  // conflict (another admin saved first) carries the latest copy, which
  // replaces what is shown so nobody keeps editing stale data.
  const run = useCallback(async (fn, okMessage) => {
    try {
      const res = await fn()
      const payload = res?.homepage || res
      if (payload && payload.revision != null) setData(payload)
      if (okMessage) showToast(okMessage)
      return true
    } catch (err) {
      if (err.detail?.homepage) setData(err.detail.homepage)
      showToast(err.message || 'Could not save — please try again')
      return false
    }
  }, [showToast])

  if (state === 'loading' && !data) {
    return <div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>Loading homepage content…</div>
  }
  if (state === 'unavailable') {
    return (
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={sectionTitle}>The homepage editor needs the updated server</div>
        <div style={hintStyle}>This server doesn’t have the homepage endpoints yet. Deploy the latest backend, then reload this page. Banners can still be viewed under Platform Settings.</div>
      </div>
    )
  }
  if (state === 'error' && !data) {
    return <DataErrorCard onRetry={load} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200 }}>
      <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
        Control the customer Explore page. Published changes appear on the site within about a minute — no deployment needed.
      </div>
      <div role="tablist" aria-label="Homepage content" style={{ display: 'flex', gap: 6, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', borderBottom: '1px solid var(--border-subtle)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, whiteSpace: 'nowrap',
              padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.key ? 'var(--red-600)' : 'var(--text-muted)',
              borderBottom: `3px solid ${tab === t.key ? 'var(--red-600)' : 'transparent'}`, marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'hero' && <BannersTab data={data} placement="hero" run={run} />}
        {tab === 'promotions' && <BannersTab data={data} placement="promotions" run={run} />}
        {tab === 'events' && <FeaturedEventsTab data={data} run={run} />}
        {tab === 'venues' && <FeaturedVenuesTab data={data} run={run} />}
        {tab === 'sections' && <SectionsTab data={data} run={run} />}
      </div>
    </div>
  )
}
