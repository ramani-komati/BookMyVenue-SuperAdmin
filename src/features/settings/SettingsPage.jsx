import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'

const inputStyle = {
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)', minHeight: 44,
  padding: '0 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 11,
}

const smallInputStyle = { ...inputStyle, minHeight: 42, flex: '0 1 260px' }

const sectionTitle = { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-heading)' }

function ChipList({ items, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map((label) => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)', background: '#F4EAE5', padding: '8px 8px 8px 14px', borderRadius: 999 }}>
          {label}
          <button
            onClick={() => onRemove(label)}
            aria-label="Remove"
            style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--neutral-200)', color: 'var(--neutral-600)', cursor: 'pointer', fontSize: 15, fontWeight: 800, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

function ChipAdder({ placeholder, value, onChange, onAdd }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        className="bmva" type="text" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        style={smallInputStyle}
      />
      <Button variant="navy" size="sm" onClick={onAdd}>Add</Button>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, markSettings, settingsDirty, commitSettings, discardSettings, logAudit, showToast } = useAdmin()

  const { isMobile } = useViewport()
  const cardPad = isMobile ? 16 : 24

  const [newCategory, setNewCategory] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newAmenity, setNewAmenity] = useState('')
  const [newBannerTitle, setNewBannerTitle] = useState('')
  const [newBannerText, setNewBannerText] = useState('')
  const [newBannerType, setNewBannerType] = useState('none') // none | percent | flat
  const [newBannerValue, setNewBannerValue] = useState('')
  const [newBannerCode, setNewBannerCode] = useState('') // promo code customers apply at checkout
  const [newBannerMin, setNewBannerMin] = useState('') // min spend to be eligible (₹, optional)
  const [newBannerMax, setNewBannerMax] = useState('') // cap on % discounts (₹, optional)
  const [newBannerPerUser, setNewBannerPerUser] = useState('') // times ONE user may redeem (0/blank = unlimited)
  const [newBannerFrom, setNewBannerFrom] = useState('')
  const [newBannerTo, setNewBannerTo] = useState('')

  const addChip = (value, key, clear) => {
    const v = value.trim()
    if (!v) return
    if (settings[key].some((x) => x.toLowerCase() === v.toLowerCase())) {
      showToast('"' + v + '" is already in the list')
      clear('')
      return
    }
    markSettings({ [key]: [...settings[key], v] })
    clear('')
  }

  const addBanner = () => {
    const title = newBannerTitle.trim()
    if (!title) return showToast('Banner title is required')
    const value = Number(newBannerValue)
    // "none" (plain announcement) and "complimentary" (something free) carry no
    // discount — they need only a title + text and are added straight away.
    const isAnnouncement = newBannerType === 'none' || newBannerType === 'complimentary'
    if (!isAnnouncement) {
      if (newBannerValue === '' || Number.isNaN(value) || value <= 0) {
        return showToast(newBannerType === 'percent' ? 'Enter the % discount for this offer' : 'Enter the ₹ discount for this offer')
      }
      if (newBannerType === 'percent' && value > 100) return showToast('Percent discount can’t exceed 100')
      // A discount without a code can't be applied at checkout — require one.
      if (!newBannerCode.trim()) return showToast('Enter a promo code — customers apply it at checkout')
      // One code = one discount: a duplicate would make checkout ambiguous.
      const code = newBannerCode.trim().toUpperCase()
      if (settings.banners.some((x) => String(x.code || '').toUpperCase() === code)) {
        return showToast('Code ' + code + ' is already used by another banner')
      }
    }
    if (newBannerFrom && newBannerTo && newBannerFrom > newBannerTo) {
      return showToast('"Valid from" must be on or before "Valid to"')
    }
    markSettings({
      banners: [...settings.banners, {
        id: Date.now(),
        title,
        text: newBannerText.trim(),
        type: newBannerType, // 'none' | 'complimentary' | 'percent' | 'flat'
        value: isAnnouncement ? 0 : value,
        // Promo code (discount banners only) — customers apply it at checkout;
        // it also shows on the home hero as "Use code X".
        code: isAnnouncement ? '' : newBannerCode.trim().toUpperCase(),
        // Guardrails (backend enforces them in the booking recompute): min
        // spend to qualify, and a ₹ cap on percent discounts.
        minAmount: isAnnouncement ? 0 : Math.max(0, Number(newBannerMin) || 0),
        maxDiscount: newBannerType === 'percent' ? Math.max(0, Number(newBannerMax) || 0) : 0,
        // Per-user redemption cap (0 = unlimited). Enforced server-side.
        perUserLimit: isAnnouncement ? 0 : Math.max(0, Number(newBannerPerUser) || 0),
        from: newBannerFrom || '',
        to: newBannerTo || '',
      }],
    })
    setNewBannerTitle('')
    setNewBannerText('')
    setNewBannerType('none')
    setNewBannerValue('')
    setNewBannerCode('')
    setNewBannerMin('')
    setNewBannerMax('')
    setNewBannerPerUser('')
    setNewBannerFrom('')
    setNewBannerTo('')
  }

  // Load a banner into the add-form for editing (e.g. adding a promo code to
  // a banner saved before the code field existed). The row is removed from
  // the list; "Add banner" re-adds the updated version, then Save persists.
  // Discard restores the original if the admin abandons the edit.
  const editBanner = (bn) => {
    setNewBannerTitle(bn.title || '')
    setNewBannerText(bn.text || '')
    setNewBannerType(bn.type || 'none')
    setNewBannerValue(bn.value ? String(bn.value) : '')
    setNewBannerCode(bn.code || '')
    setNewBannerMin(Number(bn.minAmount) > 0 ? String(bn.minAmount) : '')
    setNewBannerMax(Number(bn.maxDiscount) > 0 ? String(bn.maxDiscount) : '')
    setNewBannerPerUser(Number(bn.perUserLimit) > 0 ? String(bn.perUserLimit) : '')
    setNewBannerFrom(bn.from || '')
    setNewBannerTo(bn.to || '')
    markSettings({ banners: settings.banners.filter((x) => x.id !== bn.id) })
    showToast('Editing "' + bn.title + '" — update the fields, press Add banner, then Save')
  }

  // "20% OFF · 1 Aug → 15 Aug" summary line for a saved banner.
  const bannerSummary = (bn) => {
    const d = (iso) => (iso ? new Date(iso + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')
    const bits = []
    if (bn.type === 'complimentary') bits.push('Complimentary')
    if (bn.type === 'percent' && bn.value) bits.push(bn.value + '% OFF' + (Number(bn.maxDiscount) > 0 ? ' up to ₹' + bn.maxDiscount : ''))
    if (bn.type === 'flat' && bn.value) bits.push('₹' + bn.value + ' OFF')
    if (bn.code) bits.push('Code ' + bn.code)
    if (Number(bn.minAmount) > 0) bits.push('Min ₹' + bn.minAmount)
    if (bn.from || bn.to) bits.push((d(bn.from) || 'now') + ' → ' + (d(bn.to) || 'no end date'))
    return bits.join(' · ')
  }

  const save = () => {
    const fee = Number(settings.fee)
    if (settings.fee === '' || Number.isNaN(fee) || fee < 0) {
      return showToast('Platform fee must be ₹0 or more')
    }
    if (!settings.feeDate) {
      return showToast('Pick an effective-from date for the fee')
    }
    commitSettings()
    logAudit('Updated platform settings', 'Fees, categories, content', 'fee ₹' + settings.fee + ' eff. ' + settings.feeDate)
    showToast('Settings saved — fee changes apply from the effective date')
  }

  const discard = () => {
    discardSettings()
    showToast('Changes discarded')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>
      {/* Booking fee — the platform's ONLY charge: a flat ₹ fee added to each
          online booking. There is no percentage commission. */}
      <div className="card" style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={sectionTitle}>Booking fee</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Platform fee (₹ per booking)</label>
            <input className="bmva" type="number" min="0" value={settings.fee} onChange={(e) => markSettings({ fee: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Effective from</label>
            <input className="bmva" type="date" value={settings.feeDate} onChange={(e) => markSettings({ feeDate: e.target.value })} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Venue categories */}
      <div className="card" style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Venue categories</div>
        <ChipList items={settings.categories} onRemove={(label) => markSettings({ categories: settings.categories.filter((x) => x !== label) })} />
        <ChipAdder placeholder="Add a category…" value={newCategory} onChange={setNewCategory} onAdd={() => addChip(newCategory, 'categories', setNewCategory)} />
      </div>

      {/* Cities */}
      <div className="card" style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Cities &amp; localities</div>
        <ChipList items={settings.cities} onRemove={(label) => markSettings({ cities: settings.cities.filter((x) => x !== label) })} />
        <ChipAdder placeholder="Add a city…" value={newCity} onChange={setNewCity} onAdd={() => addChip(newCity, 'cities', setNewCity)} />
      </div>

      {/* Amenities */}
      <div className="card" style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Amenities master list</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: -8 }}>Vendors pick from this list when adding a venue.</div>
        <ChipList items={settings.amenities} onRemove={(label) => markSettings({ amenities: settings.amenities.filter((x) => x !== label) })} />
        <ChipAdder placeholder="Add an amenity…" value={newAmenity} onChange={setNewAmenity} onAdd={() => addChip(newAmenity, 'amenities', setNewAmenity)} />
      </div>

      {/* Homepage content */}
      <div className="card" style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Homepage content</div>
        {settings.banners.map((bn) => (
          <div key={bn.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-accent-soft)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <Icon name="image" size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{bn.title}</div>
              {bn.text && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{bn.text}</div>}
              {bannerSummary(bn) && (
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--red-600)' }}>{bannerSummary(bn)}</div>
              )}
            </div>
            <button
              onClick={() => editBanner(bn)}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--navy-700)', background: 'none', border: 'none', cursor: 'pointer', flex: '0 0 auto' }}
            >
              Edit
            </button>
            <button
              onClick={() => markSettings({ banners: settings.banners.filter((x) => x.id !== bn.id) })}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--error-600)', background: 'none', border: 'none', cursor: 'pointer', flex: '0 0 auto' }}
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Banner title</label>
            <input className="bmva" type="text" placeholder="e.g. Weekend turf offer" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} style={{ ...inputStyle, minHeight: 42 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Details (shown under the title)</label>
            <input className="bmva" type="text" placeholder="e.g. On all box cricket turfs" value={newBannerText} onChange={(e) => setNewBannerText(e.target.value)} style={{ ...inputStyle, minHeight: 42 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Discount type</label>
            <select className="bmva" value={newBannerType} onChange={(e) => setNewBannerType(e.target.value)} style={{ ...inputStyle, minHeight: 42, cursor: 'pointer' }}>
              <option value="none">No discount (announcement)</option>
              <option value="complimentary">Complimentary (free)</option>
              <option value="percent">% off</option>
              <option value="flat">₹ off</option>
            </select>
          </div>
          {newBannerType === 'complimentary' ? (
            <div style={{ gridColumn: '1 / -1', fontSize: 14.5, color: 'var(--text-muted)', alignSelf: 'center' }}>
              Complimentary banner — just a title and description. Press “Add banner” to publish it.
            </div>
          ) : (
          <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: newBannerType === 'none' ? 'var(--text-muted)' : 'var(--text-heading)' }}>
              {newBannerType === 'flat' ? 'Discount (₹)' : 'Discount (%)'}
            </label>
            <input
              className="bmva" type="number" min="1" max={newBannerType === 'percent' ? 100 : undefined}
              placeholder={newBannerType === 'flat' ? 'e.g. 100' : 'e.g. 15'}
              value={newBannerValue} onChange={(e) => setNewBannerValue(e.target.value)}
              disabled={newBannerType === 'none'}
              style={{ ...inputStyle, minHeight: 42, opacity: newBannerType === 'none' ? 0.5 : 1 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: newBannerType === 'none' ? 'var(--text-muted)' : 'var(--text-heading)' }}>
              {newBannerType === 'none' ? 'Promo code (needs a discount)' : 'Promo code'}
            </label>
            <input
              className="bmva" type="text" placeholder="e.g. AUG15"
              value={newBannerCode} onChange={(e) => setNewBannerCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              disabled={newBannerType === 'none'}
              style={{ ...inputStyle, minHeight: 42, opacity: newBannerType === 'none' ? 0.5 : 1, textTransform: 'uppercase' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: newBannerType === 'none' ? 'var(--text-muted)' : 'var(--text-heading)' }}>Min spend ₹ (optional)</label>
            <input
              className="bmva" type="number" min="0" placeholder="e.g. 500"
              value={newBannerMin} onChange={(e) => setNewBannerMin(e.target.value)}
              disabled={newBannerType === 'none'}
              style={{ ...inputStyle, minHeight: 42, opacity: newBannerType === 'none' ? 0.5 : 1 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: newBannerType === 'percent' ? 'var(--text-heading)' : 'var(--text-muted)' }}>Max discount ₹ (% offers)</label>
            <input
              className="bmva" type="number" min="0" placeholder="e.g. 200"
              value={newBannerMax} onChange={(e) => setNewBannerMax(e.target.value)}
              disabled={newBannerType !== 'percent'}
              style={{ ...inputStyle, minHeight: 42, opacity: newBannerType === 'percent' ? 1 : 0.5 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: newBannerType === 'none' ? 'var(--text-muted)' : 'var(--text-heading)' }}>Uses per user (optional)</label>
            <input
              className="bmva" type="number" min="0" placeholder="Blank = unlimited"
              value={newBannerPerUser} onChange={(e) => setNewBannerPerUser(e.target.value)}
              disabled={newBannerType === 'none'}
              style={{ ...inputStyle, minHeight: 42, opacity: newBannerType === 'none' ? 0.5 : 1 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Valid from</label>
            <input className="bmva" type="date" value={newBannerFrom} onChange={(e) => setNewBannerFrom(e.target.value)} style={{ ...inputStyle, minHeight: 42 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Valid to</label>
            <input className="bmva" type="date" value={newBannerTo} onChange={(e) => setNewBannerTo(e.target.value)} style={{ ...inputStyle, minHeight: 42 }} />
          </div>
          </>
          )}
        </div>
        <div>
          <Button variant="navy" size="sm" onClick={addBanner}>Add banner</Button>
        </div>
      </div>

      {settingsDirty && (
        <div style={{ position: 'sticky', bottom: 16, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, flexWrap: 'wrap', background: 'var(--navy-800)', color: '#fff', borderRadius: 14, padding: '12px 18px', boxShadow: 'var(--shadow-lg)' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--warning-500)' }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Unsaved changes</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={discard}
            style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--navy-200)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Discard
          </button>
          <Button variant="primary" size="sm" onClick={save}>Save changes</Button>
        </div>
      )}
    </div>
  )
}
