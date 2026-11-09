import { Field, hintStyle, inputStyle } from '../homepage/homepageUi.jsx'
import { KINDS, KIND_INFO, SERVICE_TOPICS } from './campaignModel.js'

/**
 * Promotional or Service / Transactional. The type decides who can receive
 * the campaign (the server enforces it: campaigns/audience.py), so each card
 * says so in plain words. A service email needs a topic and may not carry
 * offers; switching type resets a marketing-only audience (withKind).
 */
export default function KindPicker({ kind, serviceTopic, topics, onKind, onTopic, problems = {}, disabled }) {
  const topicList = topics?.length ? topics : SERVICE_TOPICS
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="radiogroup" aria-label="Campaign type" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {KINDS.map((key) => {
          const info = KIND_INFO[key]
          const on = kind === key
          return (
            <label
              key={key}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${on ? 'var(--brand-600, #C2410C)' : 'var(--border-default)'}`,
                background: on ? 'var(--brand-50, #FFF1EA)' : 'var(--surface-card, #fff)',
                cursor: disabled ? 'default' : 'pointer', minWidth: 0,
              }}
            >
              <input type="radio" name="campaign-kind" value={key} checked={on} disabled={disabled}
                onChange={() => onKind(key)} style={{ marginTop: 3 }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{info.label}</span>
                <span style={{ fontSize: 13.5, color: 'var(--text-body)' }}>{info.examples}</span>
              </span>
            </label>
          )
        })}
      </div>

      <div style={{ ...hintStyle, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--text-heading)' }}>Who can receive it: </strong>{KIND_INFO[kind]?.who}
      </div>

      {kind === 'service' && (
        <Field label="What is this service email about?">
          <select className="bmva" style={inputStyle} value={serviceTopic || ''} disabled={disabled}
            onChange={(e) => onTopic(e.target.value)}>
            <option value="">Choose a topic…</option>
            {topicList.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {problems.serviceTopic && <span style={{ ...hintStyle, color: 'var(--error-600)' }}>{problems.serviceTopic}</span>}
        </Field>
      )}

      {problems.kind && (
        <div role="alert" style={{ ...hintStyle, color: 'var(--error-600)', fontWeight: 600 }}>{problems.kind}</div>
      )}
    </div>
  )
}
