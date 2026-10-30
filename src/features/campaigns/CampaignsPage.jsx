import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import DataErrorCard from '../../components/DataErrorCard.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { EmptyCard, hintStyle, linkBtn } from '../homepage/homepageUi.jsx'
import CampaignEditor from './CampaignEditor.jsx'
import CampaignReport from './CampaignReport.jsx'
import { isActive, statusBadge } from './campaignModel.js'

const n = (v) => (Number(v) || 0).toLocaleString('en-IN')
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

/** What the server will actually do with a send — said plainly, up top. */
function DeliveryNotice({ delivery }) {
  if (!delivery) return null
  const box = (tone, text) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, fontSize: 14.5, lineHeight: 1.5, background: `var(--${tone}-50)`, color: `var(--${tone}-700)` }}>
      <Icon name="alert-triangle" size={18} style={{ flex: '0 0 auto', marginTop: 2 }} />
      <span>{text}</span>
    </div>
  )
  if (delivery.mode === 'off') {
    return box('warning', 'Sending is OFF on this server (CAMPAIGN_DELIVERY=off). You can write, preview and save campaigns; test and real sends are disabled until the server is configured.')
  }
  if (delivery.mode === 'dry-run') {
    return box('warning', 'Dry-run mode: sends go through every step but no email is delivered. Use it to rehearse; switch the server to CAMPAIGN_DELIVERY=resend for real campaigns.')
  }
  if (!delivery.emailConfigured) return box('error', 'Resend is not configured on the server (RESEND_API_KEY is missing).')
  return null
}

function CampaignList({ campaigns, onOpen, onDuplicate }) {
  const { isMobile } = useViewport()
  if (campaigns.length === 0) {
    return <EmptyCard title="No campaigns yet" body="Create one to email offers to customers who opted in. Nothing is sent until you confirm." />
  }
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {campaigns.map((c) => {
          const [badge, label] = statusBadge(c.status)
          const s = c.stats || {}
          return (
            <button key={c.id} type="button" className="card hover-wash" onClick={() => onOpen(c)} style={{ padding: 16, textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>{c.name}</span>
                <Badge status={badge}>{label}</Badge>
              </div>
              <span style={hintStyle}>{c.subject || 'No subject yet'}</span>
              <span style={hintStyle}>{day(c.createdAt)} · {n(s.recipients)} recipients · {n(s.sent)} sent · {n((s.failed || 0) + (s.bounced || 0))} failed</span>
            </button>
          )
        })}
      </div>
    )
  }
  const th = { padding: '10px 12px', fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }
  const td = { padding: '12px', borderBottom: '1px solid var(--border-subtle)', fontSize: 15, verticalAlign: 'top' }
  const num = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
  return (
    <div className="card" style={{ padding: '6px 12px 12px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
        <thead>
          <tr>
            <th style={th}>Campaign</th><th style={th}>Created</th><th style={th}>Status</th>
            <th style={{ ...th, textAlign: 'right' }}>Recipients</th><th style={{ ...th, textAlign: 'right' }}>Sent</th>
            <th style={{ ...th, textAlign: 'right' }}>Delivered</th><th style={{ ...th, textAlign: 'right' }}>Failed / bounced</th>
            <th style={{ ...th, textAlign: 'right' }}>Clicks</th><th style={th} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const [badge, label] = statusBadge(c.status)
            const s = c.stats || {}
            const draft = c.status === 'draft'
            return (
              <tr key={c.id}>
                <td style={td}>
                  <button type="button" onClick={() => onOpen(c)} style={{ ...linkBtn, textAlign: 'left' }}>{c.name}</button>
                  <div style={{ ...hintStyle, maxWidth: 340 }}>{c.subject || 'No subject yet'}</div>
                  {c.dryRun && <div style={{ ...hintStyle, color: 'var(--warning-600)' }}>Dry run</div>}
                </td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{day(c.createdAt)}</td>
                <td style={td}><Badge status={badge}>{label}</Badge></td>
                <td style={num}>{draft ? '—' : n(s.recipients)}</td>
                <td style={num}>{draft ? '—' : n(s.sent)}</td>
                <td style={num}>{draft ? '—' : n(s.delivered)}</td>
                <td style={{ ...num, color: (s.failed || s.bounced) ? 'var(--error-600)' : undefined }}>{draft ? '—' : n((s.failed || 0) + (s.bounced || 0))}</td>
                <td style={num}>{draft ? '—' : n(s.clicked)}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button type="button" style={linkBtn} onClick={() => onOpen(c)}>{draft ? 'Edit' : 'Report'}</button>
                  <span style={{ margin: '0 8px', color: 'var(--border-default)' }}>|</span>
                  <button type="button" style={linkBtn} onClick={() => onDuplicate(c)}>Duplicate</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Email Campaigns. /campaigns = history + "New campaign";
 * /campaigns/:campaignId = the draft editor, or the report once sent.
 */
export default function CampaignsPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useAdmin()
  const [list, setList] = useState({ status: 'loading', campaigns: [], delivery: null })
  const [options, setOptions] = useState(null)
  const [current, setCurrent] = useState({ status: 'idle', campaign: null })
  const [creating, setCreating] = useState(false)

  const loadList = useCallback(async () => {
    try {
      const res = await adminApi.listCampaigns()
      setList({ status: 'ready', campaigns: res.campaigns || [], delivery: res.delivery })
    } catch (err) {
      setList((l) => ({ ...l, status: l.campaigns.length ? 'ready' : 'error', error: err.message }))
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])
  useEffect(() => {
    adminApi.campaignOptions().then(setOptions).catch(() => setOptions(null))
  }, [])

  // While anything is sending, keep the history fresh.
  const anyActive = list.campaigns.some((c) => isActive(c.status))
  useEffect(() => {
    if (campaignId || !anyActive) return undefined
    const timer = setInterval(loadList, 5000)
    return () => clearInterval(timer)
  }, [campaignId, anyActive, loadList])

  useEffect(() => {
    if (!campaignId) { setCurrent({ status: 'idle', campaign: null }); return }
    let live = true
    setCurrent({ status: 'loading', campaign: null })
    adminApi.getCampaign(campaignId)
      .then((res) => live && setCurrent({ status: 'ready', campaign: res.campaign }))
      .catch((err) => live && setCurrent({ status: 'error', campaign: null, error: err.status === 404 ? 'This campaign no longer exists.' : err.message }))
    return () => { live = false }
  }, [campaignId])

  const onChanged = useCallback((campaign) => {
    setCurrent({ status: 'ready', campaign })
    setList((l) => ({ ...l, campaigns: l.campaigns.some((c) => c.id === campaign.id) ? l.campaigns.map((c) => (c.id === campaign.id ? campaign : c)) : [campaign, ...l.campaigns] }))
  }, [])

  const create = async () => {
    setCreating(true)
    try {
      const res = await adminApi.createCampaign({ name: 'Untitled campaign', audience: { segment: 'all' } })
      onChanged(res.campaign)
      navigate(`/campaigns/${res.campaign.id}`)
    } catch (err) {
      showToast(err.message || 'Could not create a campaign')
    } finally {
      setCreating(false)
    }
  }

  const duplicate = async (c) => {
    try {
      const res = await adminApi.duplicateCampaign(c.id)
      onChanged(res.campaign)
      navigate(`/campaigns/${res.campaign.id}`)
      showToast('Copied into a new draft')
    } catch (err) { showToast(err.message || 'Could not duplicate') }
  }

  const delivery = list.delivery || options?.delivery

  if (campaignId) {
    const c = current.campaign
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => navigate('/campaigns')} style={{ ...linkBtn, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="chevron-left" size={18} /> All campaigns
          </button>
          {c && <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: 'var(--text-heading)' }}>{c.name}</span>}
        </div>
        <DeliveryNotice delivery={delivery} />
        {current.status === 'loading' && <div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>Loading campaign…</div>}
        {current.status === 'error' && <div className="card" style={{ padding: 28, color: 'var(--error-600)' }}>{current.error}</div>}
        {c && (c.editable
          ? <CampaignEditor key={c.id} campaign={c} options={options} delivery={delivery} onSaved={onChanged} />
          : <CampaignReport key={c.id} campaign={c} delivery={delivery} onChanged={onChanged} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...hintStyle, maxWidth: 640 }}>
          Promotional emails go only to customers who opted in, and every email carries an unsubscribe link. Sign-in codes and booking confirmations are separate and never affected.
        </div>
        <Button variant="primary" size="sm" onClick={create} disabled={creating}>
          <Icon name="plus" size={18} /> {creating ? 'Creating…' : 'New campaign'}
        </Button>
      </div>
      <DeliveryNotice delivery={delivery} />
      {list.status === 'loading' && <div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>Loading campaigns…</div>}
      {list.status === 'error' && <DataErrorCard onRetry={loadList} />}
      {list.status === 'ready' && (
        <CampaignList campaigns={list.campaigns} onOpen={(c) => navigate(`/campaigns/${c.id}`)} onDuplicate={duplicate} />
      )}
    </div>
  )
}
