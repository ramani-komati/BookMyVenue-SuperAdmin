import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '@/context/AdminContext.jsx'
import Button from '@/components/ui/Button.jsx'
import Icon from '@/components/ui/Icon.jsx'
import useRegisterVenue from './useRegisterVenue.js'
import { PRIMARY_CATEGORIES, PLAYZONE_SPORTS, TELANGANA_DISTRICTS, MAX_VENUE_PHOTOS, MAX_SERVICE_IMAGES } from '@/constants/venue'

// ---- Small field kit (super-admin styling) --------------------------------
const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 44,
  padding: '0 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)',
  borderRadius: 11, width: '100%', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 13.5, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6, display: 'block' }
const sectionTitle = { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4 }
const cardStyle = { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</span>}
    </label>
  )
}

function TextInput({ value, onChange, ...rest }) {
  return <input style={inputStyle} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
}

function TextArea({ value, onChange, ...rest }) {
  return (
    <textarea
      style={{ ...inputStyle, minHeight: 88, padding: '10px 14px', resize: 'vertical' }}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  )
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select style={inputStyle} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder || 'Select…'}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: 'none',
        background: 'none', padding: 0, fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', fontWeight: 600,
      }}
    >
      <span style={{
        width: 42, height: 24, borderRadius: 999, background: checked ? 'var(--brand-accent)' : 'var(--neutral-300)',
        position: 'relative', transition: 'background .15s', flex: '0 0 auto',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2, width: 20, height: 20, borderRadius: '50%',
          background: '#fff', transition: 'left .15s',
        }} />
      </span>
      {label}
    </button>
  )
}

function PhotoGrid({ gallery, list, max, onAdd, onRemove }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {(list || []).map((p) => (
          <div key={p.id} style={{ position: 'relative', width: 96, height: 96, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: p.uploading ? 0.5 : 1 }} />
            {!p.uploading && (
              <button
                type="button"
                onClick={() => onRemove(gallery, p.id)}
                aria-label="Remove"
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', cursor: 'pointer', fontWeight: 800, lineHeight: 1 }}
              >×</button>
            )}
          </div>
        ))}
      </div>
      {(list || []).length < max && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--brand-accent)' }}>
          <Icon name="image" size={18} />
          Add photos ({(list || []).length}/{max})
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { onAdd(gallery, e.target.files); e.target.value = '' }} />
        </label>
      )}
    </div>
  )
}

// ---- Page -----------------------------------------------------------------
export default function RegisterVenuePage() {
  const navigate = useNavigate()
  const { retryLoad, logAudit, showToast } = useAdmin()
  const reg = useRegisterVenue()
  const { draft, setField, patchSection } = reg
  const { basics, location, details, payout, photos } = draft

  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerName, setOwnerName] = useState('')

  const isPlayzone = details.primaryCategory === 'Playzone'

  const setScreen0 = (key, value) =>
    patchSection('details', (prev) => ({ ...prev, screenConfig: { ...prev.screenConfig, 0: { ...(prev.screenConfig?.[0] || {}), [key]: value } } }))

  const toggleSport = (sport) =>
    patchSection('details', (prev) => {
      const on = !prev.sports?.[sport]
      const sports = { ...prev.sports, [sport]: on }
      const sportConfig = { ...prev.sportConfig }
      if (on && !sportConfig[sport]) sportConfig[sport] = { price: '', units: '1' }
      return { ...prev, sports, sportConfig }
    })

  const setSportCfg = (sport, key, value) =>
    patchSection('details', (prev) => ({ ...prev, sportConfig: { ...prev.sportConfig, [sport]: { ...(prev.sportConfig?.[sport] || {}), [key]: value } } }))

  const setAmenities = (text) =>
    patchSection('details', (prev) => ({ ...prev, amenities: text.split(',').map((s) => s.trim()).filter(Boolean) }))

  const addPackage = () =>
    patchSection('details', (prev) => ({ ...prev, packages: [...(prev.packages || []), { label: '', price: '', duration: '' }] }))
  const setPackage = (i, key, value) =>
    patchSection('details', (prev) => ({ ...prev, packages: (prev.packages || []).map((p, idx) => (idx === i ? { ...p, [key]: value } : p)) }))
  const removePackage = (i) =>
    patchSection('details', (prev) => ({ ...prev, packages: (prev.packages || []).filter((_, idx) => idx !== i) }))

  const onPublish = async () => {
    const res = await reg.publish()
    if (res?.ok) {
      logAudit?.('Registered venue', res.listing.name, `Live · owner ${reg.owner?.vendor?.phone || ''}`)
      showToast?.(`"${res.listing.name}" is now live`)
      retryLoad?.()
    }
  }

  // ── Step 0: owner phone ──────────────────────────────────────────────────
  if (reg.phase === 'owner') {
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={cardStyle}>
          <div>
            <div style={sectionTitle}>Who owns this venue?</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Enter the owner's mobile number. If they already have a vendor account we'll attach the
              venue to it — otherwise a new vendor is created for that number.
            </p>
          </div>
          <Field label="Owner mobile number">
            <TextInput
              value={ownerPhone}
              onChange={(v) => setOwnerPhone(v.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile"
              inputMode="numeric"
            />
          </Field>
          <Field label="Owner name" hint="Used only if a new vendor is created.">
            <TextInput value={ownerName} onChange={setOwnerName} placeholder="Optional" />
          </Field>
          {reg.ownerError && <div style={{ color: 'var(--error-600)', fontSize: 14, fontWeight: 600 }}>{reg.ownerError}</div>}
          <div>
            <Button variant="navy" onClick={() => reg.resolveOwner(ownerPhone, ownerName)} disabled={reg.resolving}>
              {reg.resolving ? 'Checking…' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (reg.phase === 'done' && reg.published) {
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{ ...cardStyle, alignItems: 'flex-start' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', color: 'var(--success-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check-circle" size={30} />
          </div>
          <div style={sectionTitle}>Venue is live</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            <strong style={{ color: 'var(--text-heading)' }}>{reg.published.name}</strong> was registered and
            published live — no approval needed.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="navy" onClick={() => navigate('/venues')}>View live venues</Button>
            <Button variant="ghost" onClick={reg.reset}>Register another</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  const two = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }
  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Owner banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: reg.owner?.created ? 'var(--success-50)' : '#F4EAE5', border: '1px solid var(--border-subtle)' }}>
        <Icon name={reg.owner?.created ? 'user-plus' : 'user'} size={20} />
        <div style={{ fontSize: 14, color: 'var(--text-heading)', fontWeight: 600 }}>
          {reg.owner?.created ? 'New owner — vendor created for ' : 'Attaching to existing owner '}
          <strong>{reg.owner?.vendor?.name || reg.owner?.vendor?.phone}</strong>
          {reg.owner?.vendor?.name && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> · {reg.owner?.vendor?.phone}</span>}
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={reg.reset} style={{ border: 'none', background: 'none', color: 'var(--brand-accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13.5 }}>Change</button>
      </div>

      {/* Basics */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Basic info</div>
        <Field label="Venue name"><TextInput value={basics.venueName} onChange={(v) => setField('basics', 'venueName', v)} placeholder="e.g. Sunrise Banquet Hall" /></Field>
        <Field label="Short description"><TextInput value={basics.shortDescription} onChange={(v) => setField('basics', 'shortDescription', v)} placeholder="One line shown on the card" /></Field>
        <div style={two}>
          <Field label="Contact phone"><TextInput value={basics.phone} onChange={(v) => setField('basics', 'phone', v.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></Field>
          <Field label="Contact email"><TextInput value={basics.email} onChange={(v) => setField('basics', 'email', v)} placeholder="Optional" /></Field>
        </div>
      </div>

      {/* Location */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Location</div>
        <Field label="House no. / street"><TextInput value={location.houseStreet} onChange={(v) => setField('location', 'houseStreet', v)} /></Field>
        <div style={two}>
          <Field label="Area / locality"><TextInput value={location.area} onChange={(v) => setField('location', 'area', v)} /></Field>
          <Field label="District"><SelectInput value={location.district} onChange={(v) => setField('location', 'district', v)} options={TELANGANA_DISTRICTS} placeholder="Select district" /></Field>
        </div>
        <div style={two}>
          <Field label="City"><TextInput value={location.city} onChange={(v) => setField('location', 'city', v)} /></Field>
          <Field label="Pincode"><TextInput value={location.pincode} onChange={(v) => setField('location', 'pincode', v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" /></Field>
        </div>
        <Field label="Google Maps link" hint="Paste the venue's Google Maps share link."><TextInput value={location.mapsLink} onChange={(v) => setField('location', 'mapsLink', v)} placeholder="https://maps.app.goo.gl/…" /></Field>
      </div>

      {/* Photos */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Photos</div>
        <Field label="Venue photos" hint="First photo is the cover.">
          <PhotoGrid gallery="venuePhotos" list={photos.venuePhotos} max={MAX_VENUE_PHOTOS} onAdd={reg.addPhotos} onRemove={reg.removePhoto} />
        </Field>
        <Field label="Service / extra images">
          <PhotoGrid gallery="serviceImages" list={photos.serviceImages} max={MAX_SERVICE_IMAGES} onAdd={reg.addPhotos} onRemove={reg.removePhoto} />
        </Field>
        {reg.photoError && <div style={{ color: 'var(--error-600)', fontSize: 13.5 }}>{reg.photoError}</div>}
      </div>

      {/* Details */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Details</div>
        <Field label="Category"><SelectInput value={details.primaryCategory} onChange={(v) => setField('details', 'primaryCategory', v)} options={PRIMARY_CATEGORIES} placeholder="Select a category" /></Field>

        {isPlayzone ? (
          <>
            <Field label="Seating / spectator capacity"><TextInput value={details.seatingCapacity} onChange={(v) => setField('details', 'seatingCapacity', v)} inputMode="numeric" /></Field>
            <div>
              <span style={labelStyle}>Sports offered</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PLAYZONE_SPORTS.map((s) => {
                  const on = Boolean(details.sports?.[s])
                  return (
                    <div key={s} style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 12 }}>
                      <Toggle checked={on} onChange={() => toggleSport(s)} label={s} />
                      {on && (
                        <div style={{ ...two, marginTop: 10 }}>
                          <Field label="Rate per hour (₹)"><TextInput value={details.sportConfig?.[s]?.price} onChange={(v) => setSportCfg(s, 'price', v.replace(/\D/g, ''))} inputMode="numeric" /></Field>
                          <Field label="No. of pitches/courts"><TextInput value={details.sportConfig?.[s]?.units} onChange={(v) => setSportCfg(s, 'units', v.replace(/\D/g, '') || '1')} inputMode="numeric" /></Field>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={two}>
            <Field label="Capacity (persons)"><TextInput value={details.screenConfig?.[0]?.max} onChange={(v) => setScreen0('max', v.replace(/\D/g, ''))} inputMode="numeric" /></Field>
            <Field label="Price per booking (₹)"><TextInput value={details.screenConfig?.[0]?.price} onChange={(v) => setScreen0('price', v.replace(/\D/g, ''))} inputMode="numeric" /></Field>
          </div>
        )}

        <Field label="Amenities" hint="Comma-separated, e.g. Parking, Washroom, AC">
          <TextInput value={(details.amenities || []).join(', ')} onChange={setAmenities} placeholder="Parking, Washroom, Changing room" />
        </Field>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Toggle checked={details.parkingAvailable} onChange={(v) => setField('details', 'parkingAvailable', v)} label="Parking available" />
          <Toggle checked={details.diningAvailable} onChange={(v) => setField('details', 'diningAvailable', v)} label="Dining available" />
        </div>
        <Field label="Full description"><TextArea value={details.fullDescription} onChange={(v) => setField('details', 'fullDescription', v)} placeholder="Describe the venue, facilities and rules." /></Field>

        {/* Packages (optional) */}
        <div>
          <span style={labelStyle}>Packages <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(details.packages || []).map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr auto', gap: 8, alignItems: 'center' }}>
                <TextInput value={p.label} onChange={(v) => setPackage(i, 'label', v)} placeholder="Package name" />
                <TextInput value={p.price} onChange={(v) => setPackage(i, 'price', v.replace(/\D/g, ''))} placeholder="₹ price" inputMode="numeric" />
                <TextInput value={p.duration} onChange={(v) => setPackage(i, 'duration', v)} placeholder="Duration" />
                <button type="button" onClick={() => removePackage(i)} aria-label="Remove" style={{ border: 'none', background: 'var(--neutral-200)', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontWeight: 800 }}>×</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPackage} style={{ marginTop: 10, border: 'none', background: 'none', color: 'var(--brand-accent)', fontWeight: 700, cursor: 'pointer', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={16} /> Add package
          </button>
        </div>
      </div>

      {/* Payout */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Payout / bank</div>
        <div style={two}>
          <Field label="Account holder name"><TextInput value={payout.acctHolder} onChange={(v) => setField('payout', 'acctHolder', v)} /></Field>
          <Field label="Bank name"><TextInput value={payout.bankName} onChange={(v) => setField('payout', 'bankName', v)} /></Field>
        </div>
        <div style={two}>
          <Field label="Account number"><TextInput value={payout.acctNumber} onChange={(v) => setField('payout', 'acctNumber', v.replace(/\D/g, ''))} inputMode="numeric" /></Field>
          <Field label="IFSC"><TextInput value={payout.ifsc} onChange={(v) => setField('payout', 'ifsc', v.toUpperCase())} /></Field>
        </div>
        <div style={two}>
          <Field label="Payout phone"><TextInput value={payout.payoutPhone} onChange={(v) => setField('payout', 'payoutPhone', v.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" /></Field>
          <Field label="UPI ID" hint="Optional"><TextInput value={payout.upiId} onChange={(v) => setField('payout', 'upiId', v)} /></Field>
        </div>
        <Field label="PAN" hint="Optional"><TextInput value={payout.pan} onChange={(v) => setField('payout', 'pan', v.toUpperCase())} /></Field>
      </div>

      {reg.publishError && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--error-50)', color: 'var(--error-600)', fontSize: 14, fontWeight: 600 }}>
          {reg.publishError}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, position: 'sticky', bottom: 0, padding: '12px 0' }}>
        <Button variant="navy" onClick={onPublish} disabled={reg.publishing}>
          {reg.publishing ? 'Publishing…' : 'Publish venue (live)'}
        </Button>
        <Button variant="ghost" onClick={reg.reset} disabled={reg.publishing}>Cancel</Button>
      </div>
    </div>
  )
}
