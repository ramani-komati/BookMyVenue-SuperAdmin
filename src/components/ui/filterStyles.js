// Filter-bar controls, styled like the Bookings and Approvals pages' own.
export const selectStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)',
  minHeight: 40, padding: '0 12px', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', borderRadius: 10, cursor: 'pointer',
}

export const dateInputStyle = { ...selectStyle, fontWeight: 500, cursor: 'text' }

export const searchStyle = (compact) => ({
  fontFamily: 'var(--font-body)', fontSize: 15.5, color: 'var(--text-heading)', minHeight: 40,
  padding: '0 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)',
  borderRadius: 10, width: compact ? '100%' : 280,
})

export const countStyle = { fontSize: 14.5, fontWeight: 600, color: 'var(--text-muted)' }
