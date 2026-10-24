const STATUS_STYLES = {
  success:  { color: 'var(--status-success-fg)',  background: 'var(--status-success-bg)' },
  warning:  { color: 'var(--status-warning-fg)',  background: 'var(--status-warning-bg)' },
  error:    { color: 'var(--status-error-fg)',    background: 'var(--status-error-bg)' },
  info:     { color: 'var(--status-info-fg)',     background: 'var(--status-info-bg)' },
  neutral:  { color: 'var(--neutral-600)',        background: 'var(--neutral-100)' },
  draft:    { color: 'var(--status-draft-fg)',    background: 'var(--status-draft-bg)' },
  pending:  { color: 'var(--status-pending-fg)',  background: 'var(--status-pending-bg)' },
  live:     { color: 'var(--status-live-fg)',     background: 'var(--status-live-bg)' },
  rejected: { color: 'var(--status-rejected-fg)', background: 'var(--status-rejected-bg)' },
}

export default function Badge({ status = 'neutral', size = 'sm', children }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        fontWeight: 700,
        borderRadius: 999,
        fontSize: size === 'sm' ? 13 : 14,
        padding: size === 'sm' ? '4px 11px' : '6px 14px',
        ...s,
      }}
    >
      {children}
    </span>
  )
}
