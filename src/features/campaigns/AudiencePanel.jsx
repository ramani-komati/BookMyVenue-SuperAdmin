import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { Field, hintStyle, inputStyle } from '../homepage/homepageUi.jsx'
import { SEGMENT_HELP, audienceProblem, cleanAudience } from './campaignModel.js'

const n = (v) => (Number(v) || 0).toLocaleString('en-IN')

/**
 * Who receives the campaign, with a live estimate. Consent is applied on the
 * server before any segment: only customers who opted in themselves, with
 * an address that has not bounced or complained, are ever counted.
 */
export default function AudiencePanel({ audience, onChange, options, disabled, onEstimate }) {
  const [estimate, setEstimate] = useState({ status: 'idle' })
  const seq = useRef(0)
  const cleaned = JSON.stringify(cleanAudience(audience))
  const problem = audienceProblem(audience)
  const estimateRef = useRef(onEstimate)
  estimateRef.current = onEstimate

  useEffect(() => {
    if (problem) { setEstimate({ status: 'idle' }); estimateRef.current?.(null); return undefined }
    const mine = ++seq.current
    setEstimate((e) => ({ ...e, status: 'loading' }))
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.estimateAudience(JSON.parse(cleaned))
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
  }, [cleaned, problem])

  const set = (change) => onChange({ ...audience, ...change })
  const segment = audience.segment || 'all'
  const states = options?.locations || []
  const cities = states.find((s) => s.state === audience.state)?.cities || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Send to" hint={SEGMENT_HELP[segment]}>
        <select className="bmva" style={inputStyle} value={segment} disabled={disabled}
          onChange={(e) => onChange({ segment: e.target.value })}>
          {(options?.segments || [{ key: 'all', label: 'All eligible customers' }]).map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
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

      {(segment === 'booked' || segment === 'lapsed') && (
        <Field
          label={segment === 'booked' ? 'Booked within the last … days (optional)' : 'No booking in the last … days'}
          hint={segment === 'booked' ? 'Leave empty for anyone who ever booked.' : 'Default 90 days.'}
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
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>estimated recipients</span>
          </div>
          {estimate.status === 'ready' && (
            <div style={hintStyle}>
              Of {n(estimate.customers)} customers, {n(estimate.withEmail)} have an email and {n(estimate.optedIn)} opted in to offers
              {estimate.suppressed ? ` (${n(estimate.suppressed)} of them excluded after a bounce or spam report)` : ''}.
              {' '}Only opted-in customers can ever receive a campaign.
            </div>
          )}
          {estimate.status === 'error' && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{estimate.error}</div>}
        </div>
      )}
    </div>
  )
}
