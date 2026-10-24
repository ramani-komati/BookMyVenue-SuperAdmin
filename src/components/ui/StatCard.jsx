import Icon from './Icon.jsx'

const TONES = {
  accent:  { iconBg: 'var(--surface-accent-soft)', iconColor: 'var(--red-600)' },
  navy:    { iconBg: 'var(--navy-50)',             iconColor: 'var(--navy-700)' },
  warning: { iconBg: 'var(--warning-50)',          iconColor: 'var(--warning-600)' },
  success: { iconBg: 'var(--success-50)',          iconColor: 'var(--success-600)' },
}

export default function StatCard({ label, value, prefix, icon, tone = 'accent', trend, trendLabel, onClick }) {
  const t = TONES[tone] || TONES.accent
  const hasTrend = typeof trend === 'number'
  const up = hasTrend && trend >= 0
  return (
    <div
      className={onClick ? 'card hover-wash' : 'card'}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 140, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</div>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: t.iconBg, color: t.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.01em' }}>
        {prefix}{value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>
        {hasTrend && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 800, color: up ? 'var(--success-600)' : 'var(--error-600)' }}>
            <Icon name={up ? 'trending-up' : 'trending-down'} size={15} />
            {Math.abs(trend)}%
          </span>
        )}
        {trendLabel && <span>{trendLabel}</span>}
      </div>
    </div>
  )
}
