import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import Button from '../../components/ui/Button.jsx'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock.js'
import { hintStyle, inputStyle } from '../homepage/homepageUi.jsx'
import { SEND_ALL_PHRASE, cleanAudience, needsAllConfirm } from './campaignModel.js'

const n = (v) => (Number(v) || 0).toLocaleString('en-IN')

/**
 * The last step before real email goes out. Re-counts the audience when it
 * opens and sends THAT count to the server, which refuses if it changed in
 * between. Sending to everyone also needs the phrase typed out.
 */
export default function SendDialog({ campaign, audience, delivery, onClose, onSent }) {
  const [count, setCount] = useState(null)
  const [label, setLabel] = useState('')
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const everyone = needsAllConfirm(audience)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const recount = async () => {
    setCount(null)
    try {
      const res = await adminApi.estimateAudience(cleanAudience(audience))
      setCount(res.count)
      setLabel(res.label)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    recount()
    const onKey = (e) => { if (e.key === 'Escape' && !busy) closeRef.current() }
    document.addEventListener('keydown', onKey)
    lockBodyScroll()
    return () => { document.removeEventListener('keydown', onKey); unlockBodyScroll() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const blocked = busy || count == null || count === 0 || (everyone && phrase.trim().toUpperCase() !== SEND_ALL_PHRASE)

  const send = async () => {
    if (blocked) return
    setBusy(true)
    setError('')
    try {
      const res = await adminApi.sendCampaign(campaign.id, {
        confirm: true, confirmAll: everyone, expectedCount: count, version: campaign.version,
      })
      onSent(res.campaign)
    } catch (err) {
      if (err.code === 'COUNT_CHANGED' && err.detail?.count != null) setCount(err.detail.count)
      setError(err.message)
      setBusy(false)
    }
  }

  const dryRun = delivery?.mode === 'dry-run'

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="send-title" style={{ position: 'fixed', inset: 0, background: 'rgba(6,21,44,.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface-card)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', width: 480, maxWidth: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'var(--font-body)' }}>
        <div id="send-title" style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>
          {dryRun ? 'Run a dry-run send?' : 'Send this campaign?'}
        </div>
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15 }}>
          <div><strong>Subject:</strong> {campaign.subject}</div>
          <div><strong>Audience:</strong> {label || '…'}</div>
          <div><strong>Recipients:</strong> {count == null ? 'counting…' : n(count)}</div>
          {delivery?.from && <div><strong>From:</strong> {delivery.from}</div>}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-body)', lineHeight: 1.5 }}>
          {dryRun
            ? 'This server is in dry-run mode: the whole send runs, but no email is actually delivered.'
            : 'Emails start going out right away and cannot be recalled. You can stop the remainder while it is still sending.'}
        </div>
        {everyone && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>
              This goes to ALL eligible customers. Type <strong>{SEND_ALL_PHRASE}</strong> to confirm.
            </span>
            <input className="bmva" style={inputStyle} value={phrase} onChange={(e) => setPhrase(e.target.value)} autoFocus aria-label={`Type ${SEND_ALL_PHRASE}`} />
          </label>
        )}
        {count === 0 && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>No customers match this audience right now.</div>}
        {error && <div role="alert" style={{ ...hintStyle, color: 'var(--error-600)', fontWeight: 600 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={send} disabled={blocked}>
            {busy ? 'Sending…' : count ? `Send to ${n(count)} customer${count === 1 ? '' : 's'}` : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  )
}
