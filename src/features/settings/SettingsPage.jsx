import { useState } from 'react'
import { useAdmin } from '../../context/AdminContext.jsx'
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

  const [newCategory, setNewCategory] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newAmenity, setNewAmenity] = useState('')
  const [newBannerTitle, setNewBannerTitle] = useState('')
  const [newBannerText, setNewBannerText] = useState('')

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
    if (!newBannerTitle.trim()) return
    markSettings({
      banners: [...settings.banners, { id: Date.now(), title: newBannerTitle.trim(), text: newBannerText.trim() || '—' }],
    })
    setNewBannerTitle('')
    setNewBannerText('')
  }

  const save = () => {
    const fee = Number(settings.fee)
    const commission = Number(settings.commission)
    if (settings.fee === '' || Number.isNaN(fee) || fee < 0) {
      return showToast('Platform fee must be ₹0 or more')
    }
    if (settings.commission === '' || Number.isNaN(commission) || commission < 0 || commission > 100) {
      return showToast('Commission must be between 0 and 100%')
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
      {/* Fees & commission */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={sectionTitle}>Fees &amp; commission</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Platform fee (₹ per booking)</label>
            <input className="bmva" type="number" min="0" value={settings.fee} onChange={(e) => markSettings({ fee: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Effective from</label>
            <input className="bmva" type="date" value={settings.feeDate} onChange={(e) => markSettings({ feeDate: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--text-heading)' }}>Commission (%)</label>
            <input className="bmva" type="number" min="0" max="100" value={settings.commission} onChange={(e) => markSettings({ commission: e.target.value })} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Venue categories */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Venue categories</div>
        <ChipList items={settings.categories} onRemove={(label) => markSettings({ categories: settings.categories.filter((x) => x !== label) })} />
        <ChipAdder placeholder="Add a category…" value={newCategory} onChange={setNewCategory} onAdd={() => addChip(newCategory, 'categories', setNewCategory)} />
      </div>

      {/* Cities */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Cities &amp; localities</div>
        <ChipList items={settings.cities} onRemove={(label) => markSettings({ cities: settings.cities.filter((x) => x !== label) })} />
        <ChipAdder placeholder="Add a city…" value={newCity} onChange={setNewCity} onAdd={() => addChip(newCity, 'cities', setNewCity)} />
      </div>

      {/* Amenities */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Amenities master list</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: -8 }}>Vendors pick from this list when adding a venue.</div>
        <ChipList items={settings.amenities} onRemove={(label) => markSettings({ amenities: settings.amenities.filter((x) => x !== label) })} />
        <ChipAdder placeholder="Add an amenity…" value={newAmenity} onChange={setNewAmenity} onAdd={() => addChip(newAmenity, 'amenities', setNewAmenity)} />
      </div>

      {/* Homepage content */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionTitle}>Homepage content</div>
        {settings.banners.map((bn) => (
          <div key={bn.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-accent-soft)', color: 'var(--red-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
              <Icon name="image" size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>{bn.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{bn.text}</div>
            </div>
            <button
              onClick={() => markSettings({ banners: settings.banners.filter((x) => x.id !== bn.id) })}
              style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, fontWeight: 700, color: 'var(--error-600)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 8, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Banner title</label>
            <input className="bmva" type="text" placeholder="e.g. Weekend turf offer" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBanner()} style={{ ...inputStyle, minHeight: 42 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>Toast text (shown under the banner)</label>
            <input className="bmva" type="text" placeholder="e.g. 15% off till Sunday" value={newBannerText} onChange={(e) => setNewBannerText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBanner()} style={{ ...inputStyle, minHeight: 42 }} />
          </div>
          <Button variant="navy" size="sm" onClick={addBanner}>Add banner</Button>
        </div>
      </div>

      {settingsDirty && (
        <div style={{ position: 'sticky', bottom: 16, display: 'flex', alignItems: 'center', gap: 14, background: 'var(--navy-800)', color: '#fff', borderRadius: 14, padding: '12px 18px', boxShadow: 'var(--shadow-lg)' }}>
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
