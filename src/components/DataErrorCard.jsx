import Icon from './ui/Icon.jsx'
import Button from './ui/Button.jsx'

// Design: "Error state with retry" — shown when loading admin data fails.
export default function DataErrorCard({ onRetry }) {
  return (
    <div className="card" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--error-50)', color: 'var(--error-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="wifi-off" size={26} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text-heading)' }}>Couldn't load this data</div>
      <div style={{ fontSize: 14.5, color: 'var(--text-muted)', maxWidth: 380 }}>
        Something went wrong on our side. Your changes are safe — try again in a moment.
      </div>
      <Button variant="navy" size="sm" onClick={onRetry}>Retry</Button>
    </div>
  )
}
