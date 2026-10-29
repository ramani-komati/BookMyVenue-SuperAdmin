import { useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import BannerEditor from './BannerEditor.jsx'
import { BANNER_STATES, moveItem } from './bannerSpec.js'
import { EmptyCard, MoveButtons, dangerLinkBtn, hintStyle, linkBtn, sectionTitle } from './homepageUi.jsx'

const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

function offerLine(b) {
  const bits = []
  if (b.type === 'complimentary') bits.push('Complimentary')
  if (b.type === 'percent' && b.value) bits.push(`${b.value}% off${Number(b.maxDiscount) > 0 ? ` up to ₹${b.maxDiscount}` : ''}`)
  if (b.type === 'flat' && b.value) bits.push(`₹${b.value} off`)
  if (b.code) bits.push(`Code ${b.code}`)
  if (Number(b.minAmount) > 0) bits.push(`Min ₹${b.minAmount}`)
  if (b.from || b.to) bits.push(`${fmtDate(b.from) || 'now'} → ${fmtDate(b.to) || 'no end date'}`)
  return bits.join(' · ')
}

/**
 * Hero banners (placement 'hero') or Featured promotions ('promotions') —
 * the same platform promotion records, listed in that placement's order.
 * Each row: preview, status, problems to fix, reorder, publish switch,
 * edit and (only while unused) delete.
 */
export default function BannersTab({ data, placement, run }) {
  const { openModal } = useAdmin()
  const [editing, setEditing] = useState(null) // banner | 'new' | null
  const hero = placement === 'hero'
  const orderKey = hero ? 'heroOrder' : 'promoOrder'
  const inPlace = (b) => (hero ? b.showInHero : b.featuredPromotion)
  const rows = data.banners.filter(inPlace).sort((a, b) => a[orderKey] - b[orderKey])
  const elsewhere = data.banners.filter((b) => !inPlace(b))
  const otherCodes = (except) => data.banners.filter((b) => b.id !== except?.id && b.code).map((b) => b.code)

  const move = (index, delta) => {
    const ids = moveItem(rows, index, delta).map((b) => b.id)
    run(() => adminApi.reorderBanners(data.revision, placement, ids), 'Order saved')
  }

  const togglePublish = (b) => run(
    () => adminApi.updateBanner(b.id, { published: !b.published, expectedUpdatedAt: b.updatedAt || '' }),
    b.published ? `“${b.title}” is unpublished — hidden from the homepage` : `“${b.title}” is live`,
  )

  const remove = (b) => openModal({
    title: `Delete “${b.title}”?`,
    body: b.code
      ? `It disappears from the homepage and its code ${b.code} stops working at checkout. This can’t be undone. To pause it instead, unpublish it.`
      : 'It disappears from the homepage. This can’t be undone. To pause it instead, unpublish it.',
    confirmLabel: 'Delete', danger: true,
    onConfirm: () => run(() => adminApi.deleteBanner(b.id), `“${b.title}” deleted`),
  })

  const addTo = (b) => run(
    () => adminApi.updateBanner(b.id, { [hero ? 'showInHero' : 'featuredPromotion']: true, expectedUpdatedAt: b.updatedAt || '' }),
    hero ? `“${b.title}” added to the hero` : `“${b.title}” added to Featured promotions`,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={sectionTitle}>{hero ? 'Hero banners' : 'Featured promotions'}</div>
          <div style={hintStyle}>
            {hero
              ? 'Image banners that rotate at the top of Explore, in this order. Only published banners inside their dates show.'
              : 'Platform offers shown after Top events, in this order — category-specific or platform-wide. Codes are checked at checkout exactly as before. Venue listings never appear here.'}
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
          {hero ? 'New hero banner' : 'New promotion'}
        </Button>
      </div>

      {rows.length === 0 && (
        <EmptyCard
          title={hero ? 'No hero banners yet' : 'No featured promotions yet'}
          body={hero ? 'Create one with an uploaded image. Until then the hero is hidden.' : 'Create one, or add an existing promotion below.'}
        />
      )}

      {rows.map((b, i) => {
        const state = BANNER_STATES[b.state] || BANNER_STATES.draft
        return (
          <div key={b.id} className="card" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <MoveButtons index={i} count={rows.length} onMove={move} label={b.title} />
            <div style={{ width: 160, aspectRatio: '4 / 1', borderRadius: 8, overflow: 'hidden', background: 'var(--navy-800)', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {b.image ? <img src={b.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="image" size={20} />}
            </div>
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{b.title}</span>
                <Badge status={state.badge}>{state.label}</Badge>
                {b.category && <Badge status="neutral">{data.categories.find((c) => c.key === b.category)?.label || b.category}</Badge>}
              </div>
              {offerLine(b) && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red-600)' }}>{offerLine(b)}</div>}
              {b.redemptions > 0 && <div style={hintStyle}>Used on {b.redemptions} paid booking{b.redemptions === 1 ? '' : 's'}</div>}
              {(b.issues || []).map((issue) => (
                <div key={issue} style={{ display: 'flex', gap: 6, fontSize: 13.5, color: 'var(--warning-700, #b54708)' }}>
                  <Icon name="alert-triangle" size={15} /> {issue}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" style={linkBtn} onClick={() => togglePublish(b)}>{b.published ? 'Unpublish' : 'Publish'}</button>
              <button type="button" style={linkBtn} onClick={() => setEditing(b)}>Edit</button>
              {b.redemptions > 0 ? (
                <span title="Used on paid bookings — unpublish it or end its dates instead" style={{ ...hintStyle, cursor: 'help' }}>Can’t delete</span>
              ) : (
                <button type="button" style={dangerLinkBtn} onClick={() => remove(b)}>Delete</button>
              )}
            </div>
          </div>
        )
      })}

      {elsewhere.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--text-heading)' }}>
            {hero ? `Promotions not in the hero (${elsewhere.length})` : `Other promotions (${elsewhere.length})`}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {elsewhere.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 12, flexWrap: 'wrap' }}>
                <span style={{ flex: 1, minWidth: 180, fontWeight: 600 }}>{b.title}</span>
                <span style={hintStyle}>{offerLine(b)}</span>
                <button type="button" style={linkBtn} onClick={() => (hero && !b.image ? setEditing(b) : addTo(b))}>
                  {hero && !b.image ? 'Add image & show in hero' : 'Add here'}
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {editing && (
        <BannerEditor
          spec={data.imageSpec}
          categories={data.categories}
          banner={editing === 'new' ? null : editing}
          placement={placement}
          otherCodes={otherCodes(editing === 'new' ? null : editing)}
          onClose={() => setEditing(null)}
          onSaved={(payload) => run(async () => payload)}
        />
      )}
    </div>
  )
}
