import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { Field, hintStyle, inputStyle } from '../homepage/homepageUi.jsx'
import { DAY_SEGMENTS, KIND_INFO, audienceProblem, cleanAudience, emptyAudienceReason, segmentAllowed, segmentHelp } from './campaignModel.js'

const n = (v) => (Number(v) || 0).toLocaleString('en-IN')

/**
 * Who receives the campaign, with a live count and the actual list. The
 * campaign KIND is applied on the server before any segment: promotional
 * mail reaches only customers who opted in themselves; service mail reaches
 * every registered customer — in both cases with a valid address that has
 * not bounced or complained, one per address. Everyone else is counted
 * under the reason they are left out. The count, this list and the list a
 * send freezes all come from the same server function (campaigns/audience.py
 * recipients), so they always agree. Choosing an audience never sends.
 */
export default function AudiencePanel({ kind = 'promotional', audience, onChange, options, disabled, onEstimate }) {
  const [estimate, setEstimate] = useState({ status: 'idle' })
  const [showList, setShowList] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const seq = useRef(0)
  const cleaned = JSON.stringify(cleanAudience(audience))
  const problem = audienceProblem(audience, kind)
  const estimateRef = useRef(onEstimate)
  estimateRef.current = onEstimate

  useEffect(() => {
    if (problem) { setEstimate({ status: 'idle' }); estimateRef.current?.(null); return undefined }
    const mine = ++seq.current
    setEstimate((e) => ({ ...e, status: 'loading' }))
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.estimateAudience(JSON.parse(cleaned), kind)
        if (mine !== seq.current) return
        setEstimate({ status: 'ready', ...res })
        estimateRef.current?.(res)
      } catch (err) {
        if (mine !== seq.current) return
        setEstimate({ status: 'error', error: err.message })
        estimateRef.current?.(null)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [cleaned, problem, kind])

  const set = (change) => onChange({ ...audience, ...change })
  const segment = audience.segment || 'all'
  const states = options?.locations || []
  const cities = states.find((s) => s.state === audience.state)?.cities || []
  const interests = options?.interests || { categories: [], cities: [] }
  const empty = estimate.status === 'ready' ? emptyAudienceReason(estimate, kind) : ''
  const segments = (options?.segments || [{ key: 'all', label: 'All eligible customers' }])
    .filter((s) => segmentAllowed(kind, s.key))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Send to" hint={segmentHelp(kind, segment)}>
        <select className="bmva" style={inputStyle} value={segment} disabled={disabled}
          onChange={(e) => onChange({ segment: e.target.value })}>
          {segments.map((s) => (
            <option key={s.key} value={s.key}>{s.key === 'all' && kind === 'service' ? 'All registered customers' : s.label}</option>
          ))}
        </select>
      </Field>

      {segment === 'location' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Field label="State">
            <select className="bmva" style={inputStyle} value={audience.state || ''} disabled={disabled}
              onChange={(e) => set({ state: e.target.value, city: '' })}>
              <option value="">Choose a state…</option>
              {states.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
            </select>
          </Field>
          <Field label="City / district (optional)">
            <select className="bmva" style={inputStyle} value={audience.city || ''} disabled={disabled || !audience.state}
              onChange={(e) => set({ city: e.target.value })}>
              <option value="">Whole state</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {states.length === 0 && <div style={hintStyle}>No booked venues have a known state yet.</div>}
        </div>
      )}

      {segment === 'category' && (
        <Field label="Venue category">
          <select className="bmva" style={inputStyle} value={audience.category || ''} disabled={disabled}
            onChange={(e) => set({ category: e.target.value })}>
            <option value="">Choose a category…</option>
            {(options?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      )}

      {segment === 'interest_category' && (
        <ChoiceList
          label="Interested in these venue categories"
          hint="From the categories customers booked or saved to favourites."
          choices={interests.categories}
          picked={audience.categories || []}
          disabled={disabled}
          emptyText="No customer has booked or saved a venue yet, so no category interests are recorded."
          onChange={(categories) => set({ categories })}
        />
      )}

      {segment === 'interest_city' && (
        <ChoiceList
          label="Interested in these cities"
          hint="From where customers booked, saved venues or bought event tickets."
          choices={interests.cities}
          picked={audience.cities || []}
          disabled={disabled}
          emptyText="No customer activity has a known city yet."
          onChange={(list) => set({ cities: list })}
        />
      )}

      {DAY_SEGMENTS.includes(segment) && (
        <Field
          label={segment === 'lapsed' ? 'No booking in the last … days' : 'Within the last … days (optional)'}
          hint={segment === 'lapsed' ? 'Default 90 days.' : 'Leave empty for any time.'}
        >
          <input className="bmva" style={{ ...inputStyle, maxWidth: 200 }} type="number" min="1" max="3650"
            value={audience.days ?? ''} disabled={disabled}
            placeholder={segment === 'lapsed' ? '90' : 'Any time'}
            onChange={(e) => set({ days: e.target.value === '' ? '' : e.target.value })} />
        </Field>
      )}

      {problem && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{problem}</div>}

      {!problem && (
        <div aria-live="polite" style={{ background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-heading)' }}>
              {estimate.status === 'ready' ? n(estimate.count) : '…'}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>eligible recipients</span>
          </div>
          {estimate.status === 'ready' && (
            <Eligibility
              kind={kind}
              estimate={estimate}
              allSelected={segment === 'all'}
              disabled={disabled}
              onSelectAll={() => onChange({ segment: 'all' })}
              showWhy={showWhy}
              onToggleWhy={() => setShowWhy((v) => !v)}
            />
          )}
          {empty && (
            <div role="status" style={{ ...hintStyle, color: 'var(--text-heading)', background: 'var(--warning-50, #FFF8E6)', border: '1px solid var(--warning-500, #E5A50A)', borderRadius: 8, padding: '8px 10px' }}>
              <b>Nobody qualifies yet.</b> {empty}
            </div>
          )}
          {estimate.status === 'error' && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{estimate.error}</div>}
          {estimate.status === 'ready' && estimate.count > 0 && (
            <div>
              <button type="button" className="bmva" onClick={() => setShowList((v) => !v)} aria-expanded={showList}
                style={{ marginTop: 4, background: 'none', border: 'none', padding: 0, color: 'var(--brand-600, #C2410C)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                {showList ? 'Hide the customers' : `See who qualifies (${n(estimate.count)})`}
              </button>
            </div>
          )}
          {showList && estimate.status === 'ready' && estimate.count > 0 && (
            <RecipientList audienceJson={cleaned} kind={kind} />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Eligible vs not eligible for this campaign TYPE across every customer
 * account (before the segment narrows it), with the reason each group is
 * left out, and a one-click "select all eligible recipients".
 */
function Eligibility({ kind, estimate, allSelected, disabled, onSelectAll, showWhy, onToggleWhy }) {
  const eligible = estimate.eligibleAccounts ?? estimate.eligibleTotal
  const reasons = (estimate.ineligible || []).filter((r) => r.count > 0)
  const box = { border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '8px 12px', background: 'var(--surface-card, #fff)', minWidth: 0 }
  const link = { background: 'none', border: 'none', padding: 0, color: 'var(--brand-600, #C2410C)', fontWeight: 700, cursor: 'pointer', fontSize: 14, textAlign: 'left' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <div style={box}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success-700, #15803D)' }}>{n(eligible)}</div>
          <div style={hintStyle}>eligible for {KIND_INFO[kind].label.toLowerCase()} email</div>
        </div>
        <div style={box}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-heading)' }}>{n(estimate.ineligibleTotal)}</div>
          <div style={hintStyle}>not eligible</div>
        </div>
      </div>
      <div style={{ ...hintStyle, lineHeight: 1.5 }}>
        {kind === 'service'
          ? 'Service emails go to registered customers without asking for marketing consent, because they are not marketing. Unsubscribing from offers does not stop them; bounced or spam-reported addresses and deactivated accounts are always left out.'
          : 'Promotional emails go only to customers who opted in themselves. Nobody is ever added without their consent, and an unsubscribe is always honoured.'}
      </div>
      <div style={{ display: 'flex', gap: '6px 16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {allSelected ? (
          <span style={{ ...hintStyle, color: 'var(--success-700, #15803D)', fontWeight: 600 }}>All {n(eligible)} eligible recipients are selected.</span>
        ) : (
          <button type="button" className="bmva" onClick={onSelectAll} disabled={disabled || !eligible} style={link}>
            Select all eligible recipients ({n(eligible)})
          </button>
        )}
        {reasons.length > 0 && (
          <button type="button" className="bmva" onClick={onToggleWhy} aria-expanded={showWhy} style={link}>
            {showWhy ? 'Hide why customers are not eligible' : 'Why are some customers not eligible?'}
          </button>
        )}
      </div>
      {showWhy && reasons.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {reasons.map((r) => (
            <li key={r.key} style={box}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: 700, color: 'var(--text-heading)' }}>
                <span>{r.label}</span><span>{n(r.count)}</span>
              </div>
              <div style={{ ...hintStyle, marginTop: 2 }}>{r.explanation}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Tick-box list for the interest segments (wraps on narrow screens). */
function ChoiceList({ label, hint, choices, picked, onChange, disabled, emptyText }) {
  const has = (c) => picked.some((p) => p.toLowerCase() === c.toLowerCase())
  const toggle = (c) => onChange(has(c) ? picked.filter((p) => p.toLowerCase() !== c.toLowerCase()) : [...picked, c])
  return (
    <Field label={label} hint={hint}>
      {choices.length === 0 ? (
        <div style={hintStyle}>{emptyText}</div>
      ) : (
        <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {choices.map((c) => (
            <label key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, border: `1px solid ${has(c) ? 'var(--brand-600, #C2410C)' : 'var(--border-default)'}`, background: has(c) ? 'var(--brand-50, #FFF1EA)' : 'var(--surface-card, #fff)', fontSize: 14, cursor: disabled ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={has(c)} disabled={disabled} onChange={() => toggle(c)} />
              {c}
            </label>
          ))}
        </div>
      )}
    </Field>
  )
}

/**
 * The eligible customers, 25 per page, searchable by name or email. Full
 * addresses are shown to the super admin only (the endpoint is IsAdmin).
 */
function RecipientList({ audienceJson, kind }) {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => { setPage(1) }, [audienceJson, search, kind])
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, status: 'loading' }))
    adminApi.audienceRecipients(JSON.parse(audienceJson), { page, search, kind })
      .then((res) => { if (alive) setState({ status: 'ready', ...res }) })
      .catch((err) => { if (alive) setState({ status: 'error', error: err.message }) })
    return () => { alive = false }
  }, [audienceJson, page, search, kind])

  const rows = state.recipients || []
  const pages = Math.max(1, Math.ceil((state.matched ?? state.total ?? 0) / (state.pageSize || 25)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
      <input className="bmva" style={inputStyle} type="search" placeholder="Search by name or email"
        value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search eligible customers" />
      {state.status === 'error' && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{state.error}</div>}
      {state.status !== 'error' && rows.length === 0 && state.status === 'ready' && (
        <div style={hintStyle}>{search ? `No eligible customer matches “${search}”.` : 'No eligible customers.'}</div>
      )}
      <div className="bmva-aud-list" aria-busy={state.status === 'loading'} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, opacity: state.status === 'loading' ? 0.6 : 1 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface-card, #fff)', minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)', overflowWrap: 'anywhere' }}>{r.name || 'Unnamed customer'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{r.email}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{[r.city, r.state].filter(Boolean).join(', ') || 'Location not known'}</div>
            <div style={{ fontSize: 13, marginTop: 2, color: r.hasInterests ? 'var(--text-body)' : 'var(--text-muted)' }}>
              {r.interests.join(', ')}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--success-700, #15803D)', fontWeight: 600 }}>{r.reason}</div>
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="bmva" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span style={hintStyle}>Page {page} of {pages} · {n(state.matched)} customer{state.matched === 1 ? '' : 's'}</span>
          <button type="button" className="bmva" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
