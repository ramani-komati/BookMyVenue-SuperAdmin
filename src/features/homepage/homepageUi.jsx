// Shared bits of the Homepage page: field styles (same as Platform Settings),
// labelled inputs, the small reorder buttons and the section heading.
import Icon from '../../components/ui/Icon.jsx'

export const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 42,
  padding: '0 12px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 11,
  width: '100%', boxSizing: 'border-box',
}
export const textareaStyle = { ...inputStyle, minHeight: 72, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }
export const labelStyle = { fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }
export const hintStyle = { fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5 }
export const sectionTitle = { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...style }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={hintStyle}>{hint}</span>}
    </label>
  )
}

export function Check({ checked, onChange, label, hint, disabled = false }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--brand-accent)' }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>{label}</span>
        {hint && <span style={hintStyle}>{hint}</span>}
      </span>
    </label>
  )
}

const arrowBtn = {
  width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-default)', background: 'var(--surface-card)',
  color: 'var(--text-heading)', cursor: 'pointer', fontSize: 16, fontWeight: 800, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
}

/** Up / down buttons for reordering a row. */
export function MoveButtons({ index, count, onMove, disabled = false, label }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, flex: '0 0 auto' }}>
      <button type="button" style={{ ...arrowBtn, opacity: index === 0 || disabled ? 0.4 : 1 }} disabled={index === 0 || disabled} onClick={() => onMove(index, -1)} aria-label={`Move ${label} up`}>↑</button>
      <button type="button" style={{ ...arrowBtn, opacity: index === count - 1 || disabled ? 0.4 : 1 }} disabled={index === count - 1 || disabled} onClick={() => onMove(index, 1)} aria-label={`Move ${label} down`}>↓</button>
    </span>
  )
}

export function EmptyCard({ title, body }) {
  return (
    <div style={{ padding: '28px 20px', textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <Icon name="image" size={24} />
      <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{title}</div>
      {body && <div style={{ ...hintStyle, maxWidth: 520 }}>{body}</div>}
    </div>
  )
}

export const linkBtn = {
  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--navy-700)', background: 'none',
  border: 'none', cursor: 'pointer', padding: 0,
}
export const dangerLinkBtn = { ...linkBtn, color: 'var(--error-600)' }
