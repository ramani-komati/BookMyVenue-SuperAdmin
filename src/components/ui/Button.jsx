const VARIANTS = {
  primary: {
    base: { background: 'var(--brand-accent)', color: '#fff', border: '1px solid var(--brand-accent)' },
    hover: { background: 'var(--brand-accent-hover)', borderColor: 'var(--brand-accent-hover)' },
  },
  secondary: {
    base: { background: 'var(--surface-card)', color: 'var(--text-heading)', border: '1px solid var(--border-default)' },
    hover: { background: 'var(--neutral-100)' },
  },
  navy: {
    base: { background: 'var(--navy-800)', color: '#fff', border: '1px solid var(--navy-800)' },
    hover: { background: 'var(--navy-600)', borderColor: 'var(--navy-600)' },
  },
  danger: {
    base: { background: 'var(--error-500)', color: '#fff', border: '1px solid var(--error-500)' },
    hover: { background: 'var(--error-600)', borderColor: 'var(--error-600)' },
  },
  ghost: {
    base: { background: 'transparent', color: 'var(--text-heading)', border: '1px solid transparent' },
    hover: { background: 'var(--neutral-100)' },
  },
}

const SIZES = {
  sm: { minHeight: 38, padding: '0 16px', fontSize: 15 },
  md: { minHeight: 46, padding: '0 20px', fontSize: 15.5 },
}

export default function Button({ variant = 'primary', size = 'md', block = false, disabled = false, onClick, children, style }) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        width: block ? '100%' : undefined,
        transition: 'background .15s ease, border-color .15s ease, transform .05s ease',
        ...v.base,
        ...s,
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) Object.assign(e.currentTarget.style, v.hover) }}
      onMouseLeave={(e) => { Object.assign(e.currentTarget.style, v.base) }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'none' }}
    >
      {children}
    </button>
  )
}
