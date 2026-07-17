import { useAdmin } from '../../context/AdminContext.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

export default function ReviewsPage() {
  const { reviews, removeReview, openModal, logAudit, showToast, venues, openDrawer } = useAdmin()

  const openVenue = (name) => {
    const venue = venues.find((v) => v.name === name)
    if (venue) openDrawer('venue', venue.id)
  }

  const keep = (r) => {
    removeReview(r.id, { action: 'keep' })
    logAudit('Kept review', r.venue, 'report dismissed')
    showToast('Review kept public')
  }

  const remove = (r) => openModal({
    title: 'Remove this review?',
    body: 'It disappears from ' + r.venue + "'s page. The reviewer is not notified.",
    confirmLabel: 'Remove review', danger: true, needsReason: true,
    onConfirm: (reason) => {
      removeReview(r.id, { action: 'remove', reason })
      logAudit('Removed review', r.venue, 'reason: ' + reason)
      showToast('Review removed')
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>
        Reviews reported by vendors or users. Keep them public or remove them from the venue page.
      </div>

      {reviews.map((r) => (
        <div key={r.id} className="card" style={{ padding: 24, display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => openVenue(r.venue)}
                title="View venue details"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 800, color: 'var(--text-heading)', fontSize: 17.5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecorationLine: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 4 }}
              >
                {r.venue}
              </button>
              <span style={{ fontSize: 15, color: 'var(--text-muted)' }}>reviewed by {r.reviewer}</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--warning-600)' }}>{r.stars}</span>
            </div>
            <div style={{ fontSize: 16.5, color: 'var(--text-body)', lineHeight: 1.55 }}>"{r.text}"</div>
            <div style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 700, color: 'var(--error-700)', background: 'var(--error-50)', padding: '6px 13px', borderRadius: 999 }}>
              Reported: {r.reason}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 150, flex: '0 0 auto' }}>
            <Button variant="secondary" size="sm" block onClick={() => keep(r)}>Keep review</Button>
            <Button variant="danger" size="sm" block onClick={() => remove(r)}>Remove</Button>
          </div>
        </div>
      ))}

      {reviews.length === 0 && (
        <div className="card" style={{ padding: 44, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', color: 'var(--success-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check-circle" size={26} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>Moderation queue is clear</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>New reports will appear here.</div>
        </div>
      )}
    </div>
  )
}
