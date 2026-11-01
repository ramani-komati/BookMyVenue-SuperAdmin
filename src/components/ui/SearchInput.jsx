import { searchStyle } from './filterStyles.js'

/**
 * The filter bar's search box (same look as the Users / Vendors search) with
 * an explicit clear button (a plain text input, so browsers that draw their
 * own ✕ on type="search" don't show two). Escape clears too.
 */
export default function SearchInput({ value, onChange, placeholder, label, compact }) {
  return (
    <div style={{ position: 'relative', width: compact ? '100%' : 300, flex: compact ? '1 1 100%' : '0 0 auto' }}>
      <input
        className="bmva"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        role="searchbox"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange('') } }}
        style={{ ...searchStyle(compact), width: '100%', paddingRight: value ? 40 : 14 }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          title="Clear search"
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30,
            border: 0, borderRadius: 999, background: 'var(--neutral-100)', color: 'var(--text-heading)',
            fontSize: 18, lineHeight: 1, cursor: 'pointer',
          }}
        >
          &times;
        </button>
      )}
    </div>
  )
}
