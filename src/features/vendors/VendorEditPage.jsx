import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { adminApi } from '../../services/adminApi.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { PROFILE_FIELDS, formFromPayload, profileChanges, profileErrors, profileRequest } from './vendorProfile.js'

const fieldInput = (bad) => ({
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 44, padding: '0 14px',
  background: 'var(--surface-card)', border: `1px solid ${bad ? 'var(--error-500)' : 'var(--border-default)'}`, borderRadius: 11, width: '100%',
})

/**
 * VendorEditPage — Vendors → (vendor) → Edit vendor details. The super admin
 * corrects the contact name / email and the business name, phone, email,
 * address, city and state (the same business details the vendor sees under
 * their own Settings).
 *
 * Bank and payout details are not part of this page at all: the server
 * neither returns nor accepts them (adminpanel/vendor_profile.py). The
 * sign-in phone is the vendor's login and is shown read-only.
 */
export default function VendorEditPage() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const { setVendors, setVenues, showToast, openModal } = useAdmin()

  const [state, setState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [payload, setPayload] = useState(null)
  const [form, setForm] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const data = await adminApi.getVendorProfile(vendorId)
      setPayload(data)
      setForm(formFromPayload(data))
      setSaveError(null)
      setShowErrors(false)
      setState('ready')
    } catch (err) {
      setLoadError(err.message || 'Could not load this vendor.')
      setState('error')
    }
  }, [vendorId])

  useEffect(() => { load() }, [load])

  const saved = useMemo(() => (payload ? formFromPayload(payload) : null), [payload])
  const errors = useMemo(() => (form ? profileErrors(form) : {}), [form])
  const changes = useMemo(() => (saved && form ? profileChanges(saved, form) : []), [saved, form])

  const commit = async () => {
    setSaving(true)
    setSaveError(null)
    const oldName = saved.profile.name
    try {
      const data = await adminApi.saveVendorProfile(vendorId, profileRequest(form, payload.version))
      setPayload(data)
      setForm(formFromPayload(data))
      const name = data.profile.name
      setVendors((list) => list.map((v) => (String(v.id) === String(vendorId) ? { ...v, name, email: data.profile.email } : v)))
      // The panel lists a venue's vendor by name.
      if (name !== oldName) setVenues((list) => list.map((v) => (v.vendor === oldName ? { ...v, vendor: name } : v)))
      showToast('Vendor details saved')
    } catch (err) {
      setSaveError({ message: err.message || 'Could not save the vendor.', code: err.code || '' })
    } finally {
      setSaving(false)
    }
  }

  const save = () => {
    if (saving || !changes.length) return
    if (Object.keys(errors).length) {
      setShowErrors(true)
      setSaveError({ message: 'Fix the highlighted fields first.', code: 'INVALID' })
      return
    }
    openModal({
      title: 'Save these vendor details?',
      body: (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {changes.map((c) => <li key={c.label}><b>{c.label}:</b> {c.from || '—'} → {c.to || '—'}</li>)}
          </ul>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Recorded in the audit log. Bank details, the sign-in phone, venues and bookings are not changed.
          </span>
        </span>
      ),
      confirmLabel: 'Save details',
      onConfirm: () => { commit() },
    })
  }

  if (state === 'loading') {
    return <div className="card" style={{ padding: 28, color: 'var(--text-muted)', fontSize: 15 }}>Loading the vendor…</div>
  }
  if (state === 'error') {
    return (
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{loadError}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={load}>Try again</Button>
          <Button variant="ghost" onClick={() => navigate('/vendors')}>Back to Vendors</Button>
        </div>
      </div>
    )
  }

  const field = (f) => {
    const id = `${f.group}.${f.key}`
    const error = showErrors ? errors[id] : ''
    return (
      <label key={id} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>
        {f.label}{f.required ? ' *' : ''}
        <input
          className="bmva"
          type={f.type === 'email' ? 'email' : 'text'}
          inputMode={f.type === 'phone' ? 'numeric' : undefined}
          maxLength={f.max}
          value={form[f.group][f.key]}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            const value = f.type === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value
            setForm((prev) => ({ ...prev, [f.group]: { ...prev[f.group], [f.key]: value } }))
          }}
          style={fieldInput(error)}
        />
        {error && <span role="alert" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--error-600)' }}>{error}</span>}
      </label>
    )
  }

  const v = payload.vendor || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          style={{ border: 0, background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 700, fontSize: 14.5, padding: 0 }}
        >
          <Icon name="chevron-left" size={18} /> Vendors
        </button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>{saved.profile.name || 'Vendor'}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Sign-in phone +91 {v.phone} (read-only) · KYC {v.kyc} · {v.acc === 'active' ? 'Active' : 'Suspended'}
          </div>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: changes.length ? 'var(--warning-700, #b45309)' : 'var(--text-muted)' }}>
          {changes.length ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>

      <div role="note" className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        <Icon name="lock" size={17} style={{ flex: '0 0 auto', marginTop: 2 }} />
        <span>
          Bank account, IFSC and payout details are not shown or editable here — they stay with the vendor’s payout details.
          The sign-in phone is the vendor’s login; set a business phone for contact instead. KYC and suspension stay on the vendor’s drawer.
        </span>
      </div>

      <div className="card" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{ gridColumn: '1 / -1', fontSize: 15, fontWeight: 800, color: 'var(--text-heading)' }}>Contact person</div>
        {PROFILE_FIELDS.filter((f) => f.group === 'profile').map(field)}
        <div style={{ gridColumn: '1 / -1', fontSize: 15, fontWeight: 800, color: 'var(--text-heading)', marginTop: 6 }}>Business</div>
        {PROFILE_FIELDS.filter((f) => f.group === 'business').map(field)}
      </div>

      {saveError && (
        <div role="alert" className="card" style={{ padding: '12px 16px', color: 'var(--error-700)', fontWeight: 700, fontSize: 14.5, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 200 }}>{saveError.message}</span>
          {saveError.code === 'STALE_VERSION' && <Button variant="secondary" size="sm" onClick={load}>Reload latest</Button>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="ghost" onClick={() => navigate('/vendors')}>{changes.length ? 'Discard changes' : 'Close'}</Button>
        <Button onClick={save} disabled={saving || !changes.length}>{saving ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </div>
  )
}
