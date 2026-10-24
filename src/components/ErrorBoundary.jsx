import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-body)' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', padding: 40, maxWidth: 460, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--error-50)', color: 'var(--error-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800 }}>!</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-heading)' }}>Something went wrong</div>
          <div style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            The panel hit an unexpected error. Your data is safe — reload to continue.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: '#fff', background: 'var(--brand-accent)', border: 'none', borderRadius: 12, padding: '12px 24px', cursor: 'pointer', marginTop: 6 }}
          >
            Reload panel
          </button>
        </div>
      </div>
    )
  }
}
