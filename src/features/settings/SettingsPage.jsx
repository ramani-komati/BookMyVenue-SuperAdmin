import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const cardPad = isMobile ? 16 : 24

  const [newCategory, setNewCategory] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newAmenity, setNewAmenity] = useState('')
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

      {/* Homepage content — banners & promotions are now managed one at a
          time on the Homepage page (image uploads, placements, publishing,
          order). This card keeps the list visible; editing here used to
          re-save the whole list, which could overwrite another admin's
          changes, so it now links there instead. */}
      <div className="card" style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...sectionTitle, flex: 1 }}>Homepage content</div>
          <Button variant="navy" size="sm" onClick={() => navigate('/homepage')}>Manage on the Homepage page</Button>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: -6 }}>
          Hero banners, platform promotions and their codes, featured events and venues, and the section layout.
        </div>
        {settings.banners.length === 0 && (
          <div style={{ fontSize: 14.5, color: 'var(--text-muted)' }}>No banners or promotions yet.</div>
        )}
        {settings.banners.map((bn) => (
          <div key={bn.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-accent-soft)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', overflow: 'hidden' }}>
              {bn.image ? <img src={bn.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="image" size={18} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
                {bn.title}
                {bn.published === false && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 8 }}>Unpublished</span>}
              </div>
              {bn.text && <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{bn.text}</div>}
              {bannerSummary(bn) && (
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--red-600)' }}>{bannerSummary(bn)}</div>
              )}
            </div>
          </div>
        ))}
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
