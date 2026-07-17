import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { APPROVAL_STATUS_META } from './approvalMeta.js'

const CHECK_DEFS = [
  { key: 'photos', label: 'Photos are clear & real' },
  { key: 'pricing', label: 'Pricing looks sane' },
  { key: 'payout', label: 'Payout account verified' },
]

const CHANGE_REASONS = [
  'Photos unclear or too few',
  'Pricing details incomplete',
  'Location pin looks wrong',
  'Payout details mismatch',
]

const checkStyle = (on) => on
  ? { boxBg: 'var(--success-500)', boxBorder: 'var(--success-500)', mark: '✓', bg: 'var(--success-50)', border: 'var(--success-500)' }
  : { boxBg: 'transparent', boxBorder: 'var(--border-strong)', mark: '', bg: 'var(--surface-card)', border: 'var(--border-default)' }

const fieldLabel = { fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 4 }

export default function ApprovalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { approvals, updateApproval, openModal, logAudit, showToast } = useAdmin()
  const { isNarrow } = useViewport()
  const [changesOpen, setChangesOpen] = useState(false)

  const sel = approvals.find((a) => a.id === Number(id))
  if (!sel) return <Navigate to="/approvals" replace />

  const [badge, statusLabel] = APPROVAL_STATUS_META[sel.status]
  const checksDone = sel.checks.photos && sel.checks.pricing && sel.checks.payout
  const reasonsSelected = sel._reqReasons || []
  const isDecidable = sel.status === 'pending'
  const decidedNote = sel.status === 'approved'
    ? 'Approved — venue is live and vendor was notified.'
    : sel.status === 'changes'
      ? 'Changes requested — waiting on the vendor to resubmit.'
      : 'Rejected — vendor was told why.'

  const approve = () => {
    updateApproval(sel.id, { status: 'approved', timeline: [...sel.timeline, { label: 'Approved by Anita', time: 'Just now' }] })
    logAudit('Approved venue', sel.name, 'pending → live')
    showToast(sel.name + ' is now live — vendor notified by SMS')
  }

  const sendChanges = () => {
    updateApproval(sel.id, { status: 'changes', timeline: [...sel.timeline, { label: 'Changes requested', time: 'Just now' }] })
    setChangesOpen(false)
    logAudit('Requested changes', sel.name, reasonsSelected.join('; '))
    showToast('Sent to ' + sel.vendor + ' — they can fix & resubmit')
  }

  const reject = () => openModal({
    title: 'Reject ' + sel.name + '?',
    body: 'The vendor will see your reason and can fix & resubmit. This is recorded in the audit log.',
    confirmLabel: 'Reject venue', danger: true, needsReason: true,
    onConfirm: (reason) => {
      updateApproval(sel.id, { status: 'rejected', timeline: [...sel.timeline, { label: 'Rejected: ' + reason, time: 'Just now' }] })
      logAudit('Rejected venue', sel.name, 'reason: ' + reason)
      showToast(sel.name + ' rejected — vendor notified')
    },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        onClick={() => navigate('/approvals')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
      >
        ← Back to queue
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.8fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left column: photos + facts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ height: 380, borderRadius: 12, backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${sel.photo.replace('w=800', 'w=1200')}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 104, borderRadius: 10, backgroundColor: 'var(--neutral-100)', backgroundImage: `url('${sel.photo.replace('w=800', 'w=400')}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-heading)' }}>{sel.name}</div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-50)', padding: '5px 13px', borderRadius: 999 }}>{sel.category}</span>
              <Badge status={badge} size="sm">{statusLabel}</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, fontSize: 16.5 }}>
              <div>
                <div style={fieldLabel}>Vendor</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{sel.vendor}</div>
                <div style={{ color: 'var(--text-muted)' }}>{sel.phone}</div>
              </div>
              <div>
                <div style={fieldLabel}>Location</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{sel.area}, {sel.city}</div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sel.name + ', ' + sel.area + ', ' + sel.city)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on map
                </a>
              </div>
              <div>
                <div style={fieldLabel}>Capacity</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{sel.capacity}</div>
              </div>
              <div>
                <div style={fieldLabel}>Pricing</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{sel.price} per slot</div>
                <div style={{ color: 'var(--text-muted)' }}>{sel.packages}</div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ ...fieldLabel, marginBottom: 6 }}>Amenities</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sel.amenities.map((am) => (
                    <span key={am} style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-body)', background: '#F4EAE5', padding: '7px 14px', borderRadius: 999 }}>{am}</span>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <div style={fieldLabel}>Payout account</div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{sel.payout}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: decision + timeline */}
        <div style={{ position: isNarrow ? 'static' : 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }}>Decision</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {CHECK_DEFS.map((c) => {
                const on = sel.checks[c.key]
                const st = checkStyle(on)
                return (
                  <button
                    key={c.key}
                    onClick={() => updateApproval(sel.id, { checks: { ...sel.checks, [c.key]: !on } })}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: `1px solid ${st.border}`, background: st.bg, borderRadius: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', textAlign: 'left', width: '100%', transition: '.15s ease' }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${st.boxBorder}`, background: st.boxBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flex: '0 0 auto' }}>{st.mark}</span>
                    {c.label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Internal notes</label>
              <textarea
                className="bmva" placeholder="Only admins see this…" value={sel.notes} rows={3}
                onChange={(e) => updateApproval(sel.id, { notes: e.target.value })}
                style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', padding: '10px 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 11, resize: 'vertical' }}
              />
            </div>

            {isDecidable ? (
              <>
                <Button variant="primary" block onClick={approve} disabled={!checksDone}>Approve venue</Button>
                {!checksDone && (
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginTop: -6 }}>Tick all three checks to enable approval</div>
                )}
                <Button variant="secondary" block onClick={() => setChangesOpen((o) => !o)}>Request changes</Button>
                {changesOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#F4EAE5', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>What should the vendor fix? (they'll see this)</div>
                    {CHANGE_REASONS.map((label) => {
                      const on = reasonsSelected.includes(label)
                      const st = checkStyle(on)
                      return (
                        <button
                          key={label}
                          onClick={() => updateApproval(sel.id, { _reqReasons: on ? reasonsSelected.filter((x) => x !== label) : [...reasonsSelected, label] })}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', border: `1px solid ${st.border}`, background: st.bg, borderRadius: 9, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', textAlign: 'left', width: '100%' }}
                        >
                          <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${st.boxBorder}`, background: st.boxBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flex: '0 0 auto' }}>{st.mark}</span>
                          {label}
                        </button>
                      )
                    })}
                    <Button variant="navy" size="sm" block onClick={sendChanges} disabled={reasonsSelected.length === 0}>Send to vendor</Button>
                  </div>
                )}
                <Button variant="danger" block onClick={reject}>Reject</Button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center', padding: 6 }}>{decidedNote}</div>
                <Button variant="ghost" block onClick={() => { updateApproval(sel.id, { status: 'pending' }); showToast('Review reopened') }}>Reopen review</Button>
              </>
            )}
          </div>

          <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>Timeline</div>
            {sel.timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: i === sel.timeline.length - 1 ? 'var(--red-500)' : 'var(--neutral-300)', marginTop: 4, flex: '0 0 auto' }} />
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{t.label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
