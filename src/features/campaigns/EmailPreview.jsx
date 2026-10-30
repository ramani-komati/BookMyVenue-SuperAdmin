import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { hintStyle, sectionTitle } from '../homepage/homepageUi.jsx'

const WIDTHS = { desktop: 680, mobile: 375 }

const tabBtn = (on) => ({
  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
  border: `1px solid ${on ? 'var(--navy-800)' : 'var(--border-default)'}`,
  background: on ? 'var(--navy-800)' : 'var(--surface-card)', color: on ? '#fff' : 'var(--text-heading)',
})

/**
 * The email exactly as customers will get it: the SERVER renders it (same
 * code path as the real send) from the current, possibly unsaved, fields.
 * Shown in a sandboxed frame — no scripts, links open in a new tab.
 */
export default function EmailPreview({ payload, title = 'Preview' }) {
  const [mode, setMode] = useState('desktop')
  const [state, setState] = useState({ status: 'loading', html: '', subject: '', previewText: '', from: '', error: '' })
  const key = JSON.stringify(payload)
  const seq = useRef(0)

  useEffect(() => {
    const mine = ++seq.current
    const timer = setTimeout(async () => {
      try {
        const res = await adminApi.previewCampaign(JSON.parse(key))
        if (mine !== seq.current) return
        const html = String(res.html || '').replace('<head>', '<head><base target="_blank">')
        setState({ status: 'ready', html, subject: res.subject, previewText: res.previewText, from: res.from, error: '' })
      } catch (err) {
        if (mine !== seq.current) return
        setState((s) => ({ ...s, status: 'error', error: err.message || 'Preview unavailable' }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [key])

  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={sectionTitle}>{title}</div>
        <div role="group" aria-label="Preview width" style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={tabBtn(mode === 'desktop')} onClick={() => setMode('desktop')} aria-pressed={mode === 'desktop'}>Desktop</button>
          <button type="button" style={tabBtn(mode === 'mobile')} onClick={() => setMode('mobile')} aria-pressed={mode === 'mobile'}>Mobile</button>
        </div>
      </div>

      {/* Inbox line: what the customer sees before opening the email. */}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 11, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--surface-page)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.from ? `From ${state.from}` : 'Inbox view'}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.subject || 'No subject yet'}</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{state.previewText || 'No preview text — mail apps show the first words of the email instead.'}</div>
      </div>

      {state.status === 'error' && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{state.error}</div>}

      <div style={{ background: 'var(--neutral-100)', borderRadius: 12, padding: mode === 'mobile' ? '14px 0' : 0, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        {state.html ? (
          <iframe
            title="Email preview"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={state.html}
            style={{
              width: mode === 'mobile' ? WIDTHS.mobile : '100%', maxWidth: '100%', height: 720, border: 0,
              borderRadius: mode === 'mobile' ? 18 : 12, background: '#EEF1F6',
              boxShadow: mode === 'mobile' ? '0 0 0 8px var(--navy-800)' : 'none',
              opacity: state.status === 'loading' ? 0.6 : 1, transition: 'opacity .15s ease',
            }}
          />
        ) : (
          <div style={{ ...hintStyle, padding: 40 }}>{state.status === 'error' ? 'Preview unavailable.' : 'Rendering preview…'}</div>
        )}
      </div>
      <div style={hintStyle}>
        The unsubscribe link is inactive in the preview. {'{{first_name}}'} shows your own first name here; each customer sees theirs.
      </div>
    </div>
  )
}
