import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { selectStyle } from '../../components/ui/filterStyles.js'
import { hintStyle, sectionTitle } from '../homepage/homepageUi.jsx'
import EmailPreview from './EmailPreview.jsx'
import { isActive, rate, statusBadge, toPayload, formFromCampaign } from './campaignModel.js'

const n = (v) => (Number(v) || 0).toLocaleString('en-IN')
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—')

const RECIPIENT_BADGE = {
  pending: 'pending', sending: 'info', sent: 'info', delivered: 'success',
  bounced: 'error', complained: 'error', failed: 'error', skipped: 'neutral',
}

function Tile({ label, value, sub, tone }) {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: tone || 'var(--text-heading)' }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function Recipients({ campaignId, refreshKey }) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    adminApi.campaignRecipients(campaignId, { status: filter, page })
      .then((res) => { if (live) { setData(res); setError('') } })
      .catch((err) => live && setError(err.message))
    return () => { live = false }
  }, [campaignId, filter, page, refreshKey])

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const cell = { padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', fontSize: 14.5, textAlign: 'left', verticalAlign: 'top' }

  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={sectionTitle}>Delivery by recipient</div>
        <select className="bmva" style={selectStyle} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1) }} aria-label="Filter recipients">
          <option value="">Everyone</option>
          <option value="problems">Problems (failed, bounced, spam)</option>
          <option value="delivered">Delivered</option>
          <option value="sent">Sent, not yet confirmed</option>
          <option value="pending">Waiting</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>
      <div style={hintStyle}>Addresses are partly hidden. Customers who unsubscribed before their turn were skipped.</div>
      {error && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{error}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <th style={cell}>Customer</th><th style={cell}>Status</th><th style={cell}>Activity</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recipients || []).map((r) => (
              <tr key={r.id}>
                <td style={cell}>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{r.name || 'Customer'}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{r.email}</div>
                </td>
                <td style={cell}>
                  <Badge status={RECIPIENT_BADGE[r.status] || 'neutral'}>{r.statusLabel}</Badge>
                  {r.error && <div style={{ ...hintStyle, marginTop: 4 }}>{r.error}</div>}
                </td>
                <td style={{ ...cell, color: 'var(--text-muted)' }}>
                  {[r.openedAt && 'Opened', r.clickedAt && 'Clicked', r.unsubscribedAt && 'Unsubscribed'].filter(Boolean).join(' · ') || '—'}
                </td>
              </tr>
            ))}
            {data && data.recipients.length === 0 && (
              <tr><td colSpan={3} style={{ ...cell, color: 'var(--text-muted)' }}>Nobody here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span style={hintStyle}>Page {page} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </section>
  )
}

/** A campaign that has left the draft stage: progress, results, content. */
export default function CampaignReport({ campaign, delivery, onChanged }) {
  const { showToast, openModal } = useAdmin()
  const navigate = useNavigate()
  const s = campaign.stats || {}
  const active = isActive(campaign.status)
  const [badge, label] = statusBadge(campaign.status)
  const done = (s.recipients || 0) - (s.pending || 0)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(async () => {
    try {
      const res = await adminApi.getCampaign(campaign.id)
      onChanged(res.campaign)
      setRefreshKey((k) => k + 1)
    } catch { /* keep the last copy on screen */ }
  }, [campaign.id, onChanged])

  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(reload, 4000)
    return () => clearInterval(timer)
  }, [active, reload])

  const duplicate = async () => {
    try {
      const res = await adminApi.duplicateCampaign(campaign.id)
      showToast('Copied into a new draft')
      navigate(`/campaigns/${res.campaign.id}`)
    } catch (err) { showToast(err.message || 'Could not duplicate') }
  }

  const cancel = () => openModal({
    title: 'Stop sending?',
    body: 'Emails already sent cannot be recalled. Everyone still waiting will be skipped.',
    confirmLabel: 'Stop sending', danger: true,
    onConfirm: async () => {
      try {
        const res = await adminApi.cancelCampaign(campaign.id)
        onChanged(res.campaign)
        showToast('Campaign stopped')
      } catch (err) { showToast(err.message || 'Could not stop it') }
    },
  })

  const tracking = delivery?.webhookConfigured

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge status={badge} size="md">{label}</Badge>
            {campaign.dryRun && <Badge status="warning" size="md">Dry run — nothing was emailed</Badge>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {active && <Button variant="danger" size="sm" onClick={cancel}>Stop sending</Button>}
            <Button variant="secondary" size="sm" onClick={reload}>Refresh</Button>
            <Button variant="navy" size="sm" onClick={duplicate}>Duplicate as new draft</Button>
          </div>
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-body)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div><strong>Subject:</strong> {campaign.subject}</div>
          <div><strong>Audience:</strong> {campaign.audienceLabel}</div>
          <div style={hintStyle}>
            Created {when(campaign.createdAt)}{campaign.createdBy ? ` by ${campaign.createdBy}` : ''} · Sent {when(campaign.queuedAt)}{campaign.sentBy ? ` by ${campaign.sentBy}` : ''}
            {campaign.finishedAt ? ` · Finished ${when(campaign.finishedAt)}` : ''}
          </div>
        </div>
        {active && (
          <div>
            <div style={{ height: 10, background: 'var(--neutral-100)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.recipients ? (done / s.recipients) * 100 : 0}%`, background: 'var(--brand-accent)', transition: 'width .4s ease' }} />
            </div>
            <div style={{ ...hintStyle, marginTop: 6 }}>{n(done)} of {n(s.recipients)} processed — this page updates by itself.</div>
          </div>
        )}
        {campaign.lastError && active && <div style={{ ...hintStyle, color: 'var(--warning-600)' }}>Last delivery problem (retrying automatically): {campaign.lastError}</div>}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <Tile label="Recipients" value={n(s.recipients)} />
        <Tile label="Sent" value={n(s.sent)} sub={rate(s.sent, s.recipients)} />
        <Tile label="Delivered" value={tracking ? n(s.delivered) : '—'} sub={tracking ? rate(s.delivered, s.sent) : 'Needs the Resend webhook'} />
        <Tile label="Opened" value={tracking ? n(s.opened) : '—'} sub={tracking ? rate(s.opened, s.delivered) : 'Needs open tracking'} />
        <Tile label="Clicked" value={tracking ? n(s.clicked) : '—'} sub={tracking ? rate(s.clicked, s.delivered) : 'Needs click tracking'} />
        <Tile label="Failed / bounced" value={n((s.failed || 0) + (s.bounced || 0))} tone={(s.failed || s.bounced) ? 'var(--error-600)' : undefined} sub={s.complained ? `${n(s.complained)} marked as spam` : undefined} />
        <Tile label="Unsubscribed" value={n(s.unsubscribed)} />
        <Tile label="Skipped" value={n(s.skipped)} sub="Opted out before their turn" />
      </div>
      {!tracking && (
        <div style={hintStyle}>
          Delivered, opened and clicked counts appear once the Resend webhook is connected (RESEND_WEBHOOK_SECRET on the server). Opens and clicks also need open/click tracking switched on for the sending domain in Resend.
        </div>
      )}

      <Recipients campaignId={campaign.id} refreshKey={refreshKey} />

      <EmailPreview payload={toPayload(formFromCampaign(campaign))} title="Email that was sent" />
    </div>
  )
}
