import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'

const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 42,
  padding: '0 12px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 11,
}
const PAGE = 25

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

/**
 * Every customer rating & review (venue bookings and event tickets), newest
 * first. Ratings are genuine submissions — the admin can't write or edit
 * one, only HIDE it (with a reason; it then leaves every average, count and
 * public list) or restore it. The server audits both.
 */
export default function CustomerReviews() {
  const { openModal, showToast } = useAdmin()
  const { isMobile } = useViewport()
  const [filters, setFilters] = useState({ kind: 'all', visibility: 'all', written: '1', q: '' })
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [state, setState] = useState('loading')

  const load = useCallback(async (offset = 0) => {
    setState('loading')
    try {
      const res = await adminApi.listRatings({ ...filters, written: filters.written === '1' ? '1' : '', limit: PAGE, offset })
      setRows((prev) => (offset ? [...prev, ...res.ratings] : res.ratings))
      setTotal(res.total)
      setState('ready')
    } catch (err) {
      setState(err.status === 404 ? 'unavailable' : 'error')
    }
  }, [filters])
  useEffect(() => {
    const timer = setTimeout(() => load(0), 250)
    return () => clearTimeout(timer)
  }, [load])

  const apply = async (rating, patch, message) => {
    try {
      const row = await adminApi.updateRating(rating.id, patch)
      setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
      showToast(message)
    } catch (err) {
      showToast(err.message)
    }
  }
  const hide = (r) => openModal({
    title: 'Hide this review?',
    body: `It disappears from ${r.targetName || 'the listing'} and stops counting in its rating. The customer isn’t notified. You can restore it later.`,
    confirmLabel: 'Hide review', danger: true, needsReason: true,
    onConfirm: (reason) => apply(r, { hidden: true, reason }, 'Review hidden'),
  })

  // The venue / event owner's public reply is moderated the same way: hide
  // it (reason required) or restore it. The vendor can't rewrite a hidden one.
  const hideReply = (r) => openModal({
    title: 'Hide the vendor’s reply?',
    body: 'The reply disappears from the public review. The vendor sees it was hidden and why, and can delete it but not edit it. You can restore it later.',
    confirmLabel: 'Hide reply', danger: true, needsReason: true,
    onConfirm: (reason) => apply(r, { replyHidden: true, reason }, 'Reply hidden'),
  })

  if (state === 'unavailable') return null

  return (
    <div className="card" style={{ padding: isMobile ? 16 : 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', flex: 1 }}>Customer reviews</div>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{total} {total === 1 ? 'rating' : 'ratings'}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="bmva" style={{ ...inputStyle, flex: '1 1 220px' }} placeholder="Search text, venue, event, customer or booking ID…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <select className="bmva" style={inputStyle} value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value }))} aria-label="Type">
          <option value="all">Venues &amp; events</option>
          <option value="venue">Venues</option>
          <option value="event">Events</option>
        </select>
        <select className="bmva" style={inputStyle} value={filters.visibility} onChange={(e) => setFilters((f) => ({ ...f, visibility: e.target.value }))} aria-label="Visibility">
          <option value="all">Shown &amp; hidden</option>
          <option value="visible">Shown</option>
          <option value="hidden">Hidden</option>
        </select>
        <select className="bmva" style={inputStyle} value={filters.written} onChange={(e) => setFilters((f) => ({ ...f, written: e.target.value }))} aria-label="Written">
          <option value="1">With written review</option>
          <option value="">Including stars only</option>
        </select>
      </div>

      {state === 'error' && <div role="alert" style={{ color: 'var(--error-600)', fontWeight: 600 }}>Could not load reviews. <button type="button" onClick={() => load(0)} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>Retry</button></div>}
      {state === 'ready' && rows.length === 0 && <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>No ratings match.</div>}

      {rows.map((r) => (
        <div key={r.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 14, display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row', opacity: r.hidden ? 0.75 : 1 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{r.targetName || 'Removed listing'}</span>
              <Badge status="neutral">{r.kind === 'event' ? 'Event' : 'Venue'}</Badge>
              <span style={{ fontWeight: 800, color: 'var(--warning-600)' }}>{'★'.repeat(r.stars)}<span style={{ color: 'var(--neutral-300)' }}>{'★'.repeat(5 - r.stars)}</span></span>
              {r.hidden && <Badge status="warning">Hidden</Badge>}
            </div>
            {r.review ? <div style={{ fontSize: 15.5, color: 'var(--text-body)', lineHeight: 1.55, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>“{r.review}”</div> : <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Stars only</div>}
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              {[r.customerName || 'Customer', `Booking ${r.bookingId}`, r.bookingDate && `visited ${fmt(r.bookingDate)}`, `rated ${fmt(r.createdAt)}`].filter(Boolean).join(' · ')}
            </div>
            {r.hidden && r.hiddenReason && <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Hidden: {r.hiddenReason}</div>}
            {r.reply && (
              <div style={{ marginTop: 4, padding: '8px 12px', borderLeft: '3px solid var(--brand-accent, #F1252E)', background: 'var(--surface-sunken, #f6f6f6)', borderRadius: '0 8px 8px 0', opacity: r.replyHidden ? 0.7 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-heading)' }}>Vendor reply</span>
                  {r.repliedAt && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmt(r.repliedAt)}</span>}
                  {r.replyHidden && <Badge status="warning">Hidden</Badge>}
                  <span style={{ flex: 1 }} />
                  {r.replyHidden
                    ? <Button variant="secondary" size="sm" onClick={() => apply(r, { replyHidden: false }, 'Reply restored')}>Restore reply</Button>
                    : <Button variant="ghost" size="sm" onClick={() => hideReply(r)}>Hide reply</Button>}
                </div>
                <div style={{ fontSize: 14.5, color: 'var(--text-body)', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{r.reply}</div>
                {r.replyHidden && r.replyHiddenReason && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hidden: {r.replyHiddenReason}</div>}
              </div>
            )}
          </div>
          <div style={{ flex: '0 0 auto' }}>
            {r.hidden
              ? <Button variant="secondary" size="sm" onClick={() => apply(r, { hidden: false }, 'Review restored')}>Restore</Button>
              : <Button variant="danger" size="sm" onClick={() => hide(r)}>Hide</Button>}
          </div>
        </div>
      ))}
      {state === 'ready' && rows.length < total && (
        <div><Button variant="secondary" size="sm" onClick={() => load(rows.length)}>Show more</Button></div>
      )}
    </div>
  )
}
