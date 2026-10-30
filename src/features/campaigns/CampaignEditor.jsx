import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { Field, hintStyle, inputStyle, sectionTitle, textareaStyle } from '../homepage/homepageUi.jsx'
import AudiencePanel from './AudiencePanel.jsx'
import CampaignImages from './CampaignImages.jsx'
import EmailPreview from './EmailPreview.jsx'
import SendDialog from './SendDialog.jsx'
import { LIMITS, formFromCampaign, sameForm, sendProblems, toPayload } from './campaignModel.js'

function Counter({ value, max }) {
  const over = value.length > max
  return <span style={{ ...hintStyle, color: over ? 'var(--error-600)' : 'var(--text-muted)' }}>{value.length}/{max}</span>
}

const errorText = (msg) => msg && <span style={{ ...hintStyle, color: 'var(--error-600)' }}>{msg}</span>

/**
 * Draft editor: details, content (text, images, button), audience — with the
 * server-rendered preview beside it. Save draft, send a test, send for real.
 * Edits stay local until saved; leaving with unsaved edits asks first.
 */
export default function CampaignEditor({ campaign, options, delivery, onSaved }) {
  const { showToast, openModal, admin } = useAdmin()
  const navigate = useNavigate()
  const { isNarrow } = useViewport()
  const [form, setForm] = useState(() => formFromCampaign(campaign))
  const [saved, setSaved] = useState(() => formFromCampaign(campaign))
  const [busy, setBusy] = useState('')
  const [testTo, setTestTo] = useState(admin?.email || '')
  const [sending, setSending] = useState(false)
  const [showProblems, setShowProblems] = useState(false)

  useEffect(() => {
    // A newer copy arrived (our own save, or a reload after a conflict).
    const next = formFromCampaign(campaign)
    setSaved(next)
    setForm((current) => (sameForm(current, saved) ? next : current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.version, campaign.id])

  const dirty = !sameForm(form, saved)
  const problems = sendProblems(form)
  const shown = showProblems ? problems : {}
  const payload = useMemo(() => toPayload(form), [form])
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = async ({ quiet = false } = {}) => {
    if (!form.name.trim()) {
      setShowProblems(true)
      showToast('Give the campaign a name first')
      return null
    }
    setBusy('save')
    try {
      const res = await adminApi.saveCampaign(campaign.id, { ...payload, version: campaign.version })
      // The server normalises some values (site paths become full links).
      setForm(formFromCampaign(res.campaign))
      onSaved(res.campaign)
      if (!quiet) showToast('Draft saved')
      return res.campaign
    } catch (err) {
      if (err.code === 'STALE' && err.detail?.campaign) {
        openModal({
          title: 'Someone else saved this campaign',
          body: 'Another admin saved changes after you opened it. Load their version? Your unsaved edits here will be replaced.',
          confirmLabel: 'Load latest',
          onConfirm: () => { setForm(formFromCampaign(err.detail.campaign)); onSaved(err.detail.campaign) },
        })
      } else {
        showToast(err.message || 'Could not save')
      }
      return null
    } finally {
      setBusy('')
    }
  }

  const ensureSaved = async () => (dirty ? save({ quiet: true }) : campaign)

  const ready = () => {
    if (Object.keys(problems).length) {
      setShowProblems(true)
      showToast(Object.values(problems)[0])
      return false
    }
    return true
  }

  const sendTest = async () => {
    if (!ready()) return
    const current = await ensureSaved()
    if (!current) return
    setBusy('test')
    try {
      const to = testTo.split(/[,;\s]+/).filter(Boolean)
      const res = await adminApi.sendCampaignTest(current.id, to)
      showToast(res.dryRun ? `Dry run — a test to ${res.to.join(', ')} was rendered but not delivered` : `Test sent to ${res.to.join(', ')}`)
    } catch (err) {
      showToast(err.message || 'Test failed')
    } finally {
      setBusy('')
    }
  }

  const startSend = async () => {
    if (!ready()) return
    const current = await ensureSaved()
    if (current) setSending(true)
  }

  const remove = () => openModal({
    title: `Delete “${campaign.name}”?`,
    body: 'This draft is removed for good. Sent campaigns are never deleted.',
    confirmLabel: 'Delete draft', danger: true,
    onConfirm: async () => {
      try {
        await adminApi.deleteCampaign(campaign.id)
        showToast('Draft deleted')
        navigate('/campaigns')
      } catch (err) { showToast(err.message || 'Could not delete') }
    },
  })

  const off = delivery?.mode === 'off'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={sectionTitle}>Campaign</div>
            <Field label="Campaign name" hint="Only admins see this.">
              <input className="bmva" style={inputStyle} value={form.name} maxLength={LIMITS.name} onChange={set('name')} placeholder="e.g. Diwali 2026 — party halls" />
              {errorText(shown.name)}
            </Field>
            <Field label="Email subject">
              <input className="bmva" style={inputStyle} value={form.subject} onChange={set('subject')} placeholder="e.g. 20% off party halls this Diwali" />
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>{errorText(shown.subject) || <span />}<Counter value={form.subject} max={LIMITS.subject} /></span>
            </Field>
            <Field label="Preview text (optional)" hint="The grey line mail apps show after the subject.">
              <input className="bmva" style={inputStyle} value={form.previewText} onChange={set('previewText')} placeholder="e.g. Book before 25 Oct and save on your celebration" />
              <span style={{ alignSelf: 'flex-end' }}><Counter value={form.previewText} max={LIMITS.previewText} /></span>
            </Field>
          </section>

          <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={sectionTitle}>Content</div>
            <Field label="Heading">
              <input className="bmva" style={inputStyle} value={form.heading} onChange={set('heading')} placeholder="e.g. Hi {{first_name}}, celebrate for less" />
              {errorText(shown.heading)}
            </Field>
            <Field label="Message" hint="Blank line = new paragraph · **bold** · lines starting with “- ” become a list · {{first_name}} = the customer’s first name.">
              <textarea className="bmva" style={{ ...textareaStyle, minHeight: 170 }} value={form.body} onChange={set('body')} placeholder={'Book any party hall before 25 Oct and get **20% off**.\n\n- Free decoration\n- Flexible slots'} />
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>{errorText(shown.body) || <span />}<Counter value={form.body} max={LIMITS.body} /></span>
            </Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-heading)' }}>Images and banners</span>
              <CampaignImages images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} showToast={showToast} problem={shown.images} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Field label="Button text (optional)">
                <input className="bmva" style={inputStyle} value={form.ctaLabel} maxLength={LIMITS.ctaLabel} onChange={set('ctaLabel')} placeholder="Book now" />
                {errorText(shown.ctaLabel)}
              </Field>
              <Field label="Button link" hint="https:// link, or a site path like /venues/grand-hall">
                <input className="bmva" style={inputStyle} value={form.ctaUrl} maxLength={LIMITS.ctaUrl} onChange={set('ctaUrl')} placeholder="/explore" />
                {errorText(shown.ctaUrl)}
              </Field>
            </div>
          </section>

          <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={sectionTitle}>Audience</div>
            <AudiencePanel audience={form.audience} options={options} onChange={(audience) => setForm((f) => ({ ...f, audience }))} />
          </section>
        </div>

        <div style={{ position: isNarrow ? 'static' : 'sticky', top: 16, minWidth: 0 }}>
          <EmailPreview payload={payload} />
        </div>
      </div>

      {/* Action bar */}
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', bottom: 12, zIndex: 5, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => save()} disabled={!!busy || !dirty}>
            {busy === 'save' ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}
          </Button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 300px', minWidth: 0 }}>
            <input className="bmva" style={{ ...inputStyle, minHeight: 38 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Test address(es), comma-separated" aria-label="Test email addresses" />
            <Button variant="navy" size="sm" onClick={sendTest} disabled={!!busy || off} style={{ flex: '0 0 auto' }}>
              {busy === 'test' ? 'Sending…' : 'Send test'}
            </Button>
          </div>
          <Button variant="primary" size="sm" onClick={startSend} disabled={!!busy || off}>
            <Icon name="send" size={17} /> Send campaign
          </Button>
          <button type="button" onClick={remove} disabled={!!busy} style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, color: 'var(--error-600)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete draft</button>
        </div>
        {off && <div style={hintStyle}>Sending is switched off on this server, so test and campaign sends are disabled. Drafts and previews still work.</div>}
      </div>

      {sending && (
        <SendDialog
          campaign={campaign}
          audience={form.audience}
          delivery={delivery}
          onClose={() => setSending(false)}
          onSent={(next) => { setSending(false); onSaved(next); showToast(next.dryRun ? 'Dry run started' : 'Campaign is sending') }}
        />
      )}
    </div>
  )
}
