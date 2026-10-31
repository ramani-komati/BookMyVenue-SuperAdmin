import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'

/**
 * Data review — records that LOOK like test data (backend
 * adminpanel/data_review.py). Nothing is changed automatically: the admin
 * confirms each one and uses the normal, reversible, audited actions —
 * pause a venue or unpublish an event. Orders are shown for information
 * only and are never altered (they are customer and payment history).
 */
export default function DataReviewPage() {
  const [state, setState] = useState({ status: 'loading' })
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }))
    try {
      setState({ status: 'ready', ...(await adminApi.dataReview()) })
    } catch (err) {
      setState({ status: 'error', error: err.message })
    }
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (kind, row) => {
    const what = kind === 'venue' ? `Pause the venue “${row.name}”? It disappears from the site; bookings and payments stay.`
      : `Unpublish the event “${row.name}”? It disappears from the site; tickets and payments stay.`
    if (!window.confirm(`${what}\n\nYou can make it live again at any time.`)) return
    setBusy(row.id)
    setNote('')
    try {
      if (kind === 'venue') await adminApi.updateVenue(row.id, { status: 'paused', reason: 'Confirmed test data (Data review)' })
      else await adminApi.updateEvent(row.id, { status: 'unpublish' })
      setNote(`${row.name} — done. The change is in the audit log.`)
      await load()
    } catch (err) {
      setNote(err.message)
    } finally {
      setBusy('')
    }
  }

  if (state.status === 'loading' && !state.venues) return <div className="card" style={{ padding: 24 }}>Checking for test data…</div>
  if (state.status === 'error') return <div className="card" style={{ padding: 24, color: 'var(--error-600)' }}>{state.error}</div>

  const section = (title, rows, render, empty) => (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({rows.length})</span></h2>
      {rows.length === 0 ? <div style={{ color: 'var(--text-muted)' }}>{empty}</div> : rows.map(render)}
    </div>
  )
  const reasons = (row) => <div style={{ fontSize: 13, color: 'var(--warning-700, #92400E)' }}>{row.reasons.join(' · ')}</div>
  const rowStyle = { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '75ch' }}>
        These records look like test data. Nothing here is changed automatically — check each one, then pause
        it if it really is a test. Pausing is reversible and keeps every booking, ticket and payment.
      </p>
      {note && <div role="status" className="card" style={{ padding: 12 }}>{note}</div>}
      {section('Venues', state.venues, (v) => (
        <div key={v.id} style={rowStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{v.name} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {v.status} · ₹{v.price} {v.unit} · {v.bookings} booking(s)</span></div>
            {reasons(v)}
          </div>
          {v.status === 'live' && <button type="button" className="bmva" disabled={busy === v.id} onClick={() => act('venue', v)}>Pause venue</button>}
        </div>
      ), 'No venue looks like test data.')}
      {section('Events', state.events, (e) => (
        <div key={e.id} style={rowStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{e.name} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {e.status} · venue “{e.venueName || '—'}” · {e.orders} order(s)</span></div>
            {reasons(e)}
          </div>
          {e.status === 'live' && <button type="button" className="bmva" disabled={busy === e.id} onClick={() => act('event', e)}>Unpublish event</button>}
        </div>
      ), 'No event looks like test data.')}
      {section('Event orders (information only — never changed)', state.orders, (o) => (
        <div key={o.id} style={rowStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{o.id} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>· {o.eventName} · {o.status} · ₹{o.amount} · {o.paid ? 'paid' : 'not paid'}</span></div>
            {reasons(o)}
          </div>
        </div>
      ), 'No order is linked to a flagged event or venue.')}
    </div>
  )
}
