import { useAdmin } from '../../context/AdminContext.jsx'
import { placeOf } from '../../utils/format.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

const dateLabel = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return String(iso) }
}

/**
 * DeletionRequestsPage — the queue of venues a vendor asked to delete. Each
 * stays LIVE until an admin decides here: Approve runs the (soft) delete,
 * Reject returns it to live. Row click opens the full venue drawer.
 */
export default function DeletionRequestsPage() {
  const { venues, updateVenue, openModal, logAudit, showToast, openDrawer } = useAdmin()
  const requests = venues.filter((v) => v.status === 'deletion_requested')

  const approve = (v) => openModal({
    title: 'Approve deletion of ' + v.name + '?',
    body: 'The venue is removed from BookMyVenues and no longer bookable. Its booking & revenue history is kept. Upcoming bookings must be cleared first.',
    confirmLabel: 'Approve deletion', danger: true,
    onConfirm: () => {
      updateVenue(v.id, { status: 'deleted' })
      logAudit('Approved venue deletion', v.name, 'deletion_requested → deleted')
      showToast(v.name + ' deleted')
    },
  })

  const reject = (v) => {
    updateVenue(v.id, { status: 'live' })
    logAudit('Rejected venue deletion', v.name, 'deletion_requested → live')
    showToast('Deletion request for ' + v.name + ' rejected')
  }

  if (requests.length === 0) {
    return (
      <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-50)', color: 'var(--success-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon name="check-circle" size={30} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>No deletion requests</div>
        <div style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 6 }}>When a vendor asks to delete a venue, it&apos;ll appear here for your approval.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-muted)' }}>
        {requests.length} venue{requests.length === 1 ? '' : 's'} awaiting your decision · each stays live until you approve or reject
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map((v) => (
          <div key={v.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => openDrawer('venue', v.id)}
              title="View venue details"
              style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 260px', minWidth: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}
            >
              <div style={{ width: 64, height: 48, borderRadius: 10, flex: '0 0 auto', backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${v.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.vendor} · {placeOf(v)}</div>
                {v.deletionRequestedAt && (
                  <div style={{ fontSize: 13, color: 'var(--warning-700)', fontWeight: 700, marginTop: 2 }}>Requested {dateLabel(v.deletionRequestedAt)}</div>
                )}
              </div>
            </button>

            <Badge status="warning" size="sm">Deletion requested</Badge>

            <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
              <Button variant="secondary" size="sm" onClick={() => reject(v)}>Reject</Button>
              <Button variant="danger" size="sm" onClick={() => approve(v)}>Approve deletion</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
