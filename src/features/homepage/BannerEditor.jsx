import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import { useAdmin } from '../../context/AdminContext.jsx'
import useViewport from '../../hooks/useViewport.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock.js'
import BannerPreview from './BannerPreview.jsx'
import { bannerFormError, checkImage } from './bannerSpec.js'
import { Check, Field, hintStyle, inputStyle, linkBtn, sectionTitle, textareaStyle } from './homepageUi.jsx'

const toForm = (b, placement) => ({
  title: b?.title || '',
  text: b?.text || '',
  type: b?.type || 'none',
  value: b?.value ? String(b.value) : '',
  code: b?.code || '',
  minAmount: Number(b?.minAmount) > 0 ? String(b.minAmount) : '',
  maxDiscount: Number(b?.maxDiscount) > 0 ? String(b.maxDiscount) : '',
  perUserLimit: Number(b?.perUserLimit) > 0 ? String(b.perUserLimit) : '',
  from: b?.from || '',
  to: b?.to || '',
  image: b?.image || '',
  imageMobile: b?.imageMobile || '',
  imageAlt: b?.imageAlt || '',
  imageWidth: b?.imageWidth || 0,
  imageHeight: b?.imageHeight || 0,
  imageMobileWidth: b?.imageMobileWidth || 0,
  imageMobileHeight: b?.imageMobileHeight || 0,
  // New banners are image-led: the art carries the message, words optional.
  showText: b ? b.showText !== false : false,
  showCode: b ? b.showCode !== false : true,
  ctaLabel: b ? (b.ctaLabel ?? 'Explore venues') : 'Explore venues',
  ctaUrl: b?.ctaUrl || '',
  category: b?.category || '',
  terms: b?.terms || '',
  showInHero: b ? b.showInHero !== false : placement === 'hero',
  featuredPromotion: b ? b.featuredPromotion !== false : placement === 'promotions',
  published: b ? b.published !== false : false,
})

const DISCOUNT = ['percent', 'flat']

const toPayload = (form) => {
  const discount = DISCOUNT.includes(form.type)
  return {
    ...form,
    value: discount ? Number(form.value) || 0 : 0,
    code: discount ? form.code.trim().toUpperCase() : '',
    minAmount: discount ? Math.max(0, Number(form.minAmount) || 0) : 0,
    maxDiscount: form.type === 'percent' ? Math.max(0, Number(form.maxDiscount) || 0) : 0,
    perUserLimit: discount ? Math.max(0, Number(form.perUserLimit) || 0) : 0,
    title: form.title.trim(),
    text: form.text.trim(),
    ctaLabel: form.ctaLabel.trim(),
    ctaUrl: form.ctaUrl.trim(),
    imageAlt: form.imageAlt.trim(),
    terms: form.terms.trim(),
  }
}

const readSize = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    resolve({ width: img.naturalWidth, height: img.naturalHeight })
    URL.revokeObjectURL(url)
  }
  img.onerror = () => {
    resolve(null)
    URL.revokeObjectURL(url)
  }
  img.src = url
})

const mb = (bytes) => `${Math.floor(bytes / (1024 * 1024))} MB`

/** The size guidance, shown BEFORE anything is uploaded. */
function Guidance({ spec, slot }) {
  const s = spec.slots[slot]
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-heading)' }}>
        Recommended {s.recommended.width} × {s.recommended.height} px · {s.ratio.label} ratio
      </div>
      <div style={hintStyle}>
        {s.usedAt}. Minimum {s.minimum.width} × {s.minimum.height} px; {s.sharpFrom.width} × {s.sharpFrom.height} px or larger stays sharp on big and high-resolution screens.
        {' '}{spec.formats.join(', ')} up to {mb(spec.maxBytes)}.
      </div>
      <div style={hintStyle}>{s.safeZone}</div>
    </div>
  )
}

function ImageSlot({ spec, slot, form, set, busy, setBusy }) {
  const input = useRef(null)
  const [problem, setProblem] = useState('')
  const [warnings, setWarnings] = useState([])
  const key = slot === 'mobile' ? 'imageMobile' : 'image'
  const dimKeys = slot === 'mobile' ? ['imageMobileWidth', 'imageMobileHeight'] : ['imageWidth', 'imageHeight']
  const url = form[key]

  const pick = async (file) => {
    if (!file) return
    setProblem('')
    setWarnings([])
    const size = await readSize(file)
    const check = checkImage(spec, slot, { ...(size || {}), bytes: file.size, type: file.type })
    if (check.problem) {
      setProblem(check.problem)
      return
    }
    setBusy(slot)
    try {
      // The server re-checks format, size and dimensions before storing.
      const res = await adminApi.uploadBannerImage(file, slot)
      set({ [key]: res.url, [dimKeys[0]]: res.width, [dimKeys[1]]: res.height })
      setWarnings(res.warnings || [])
    } catch (err) {
      setProblem(err.status === 502
        ? 'Image storage isn’t reachable right now (it needs the server’s Supabase settings). Try again later.'
        : err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-heading)' }}>{spec.slots[slot].label}</div>
      <Guidance spec={spec} slot={slot} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {url && (
          <img src={url} alt="" style={{ width: slot === 'mobile' ? 96 : 192, aspectRatio: slot === 'mobile' ? '2 / 1' : '4 / 1', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
        )}
        <input
          ref={input}
          type="file"
          accept={spec.mimeTypes.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => input.current?.click()}>
          {busy === slot ? 'Uploading…' : url ? 'Replace image' : 'Upload image'}
        </Button>
        {url && (
          <button type="button" style={{ ...linkBtn, color: 'var(--error-600)' }} onClick={() => set(slot === 'mobile'
            ? { imageMobile: '', imageMobileWidth: 0, imageMobileHeight: 0 }
            : { image: '', imageWidth: 0, imageHeight: 0, imageMobile: '', imageMobileWidth: 0, imageMobileHeight: 0 })}
          >
            Remove
          </button>
        )}
        {url && form[dimKeys[0]] > 0 && (
          <span style={hintStyle}>{form[dimKeys[0]]} × {form[dimKeys[1]]} px</span>
        )}
      </div>
      {problem && <div role="alert" style={{ fontSize: 14, fontWeight: 600, color: 'var(--error-600)' }}>{problem}</div>}
      {warnings.map((w) => (
        <div key={w} style={{ display: 'flex', gap: 6, fontSize: 14, color: 'var(--warning-700, #b54708)' }}>
          <Icon name="alert-triangle" size={16} /> {w}
        </div>
      ))}
    </div>
  )
}

/**
 * Create / edit one banner or promotion — a record in the existing platform
 * promotions list (Settings.banners), so its code stays redeemable exactly
 * as before. `placement` ('hero' | 'promotions') only picks the defaults for
 * a new record. Calls onSaved(homepagePayload) after the server accepts it.
 */
export default function BannerEditor({ spec, categories, banner, placement, otherCodes, onClose, onSaved }) {
  const { showToast, openModal } = useAdmin()
  const { isMobile } = useViewport()
  const [form, setForm] = useState(() => toForm(banner, placement))
  const [dirty, setDirty] = useState(false)
  const [busyImage, setBusyImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const redeemed = Number(banner?.redemptions) > 0

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
    setError('')
  }

  useEffect(() => {
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [])

  const close = () => {
    if (!dirty) return onClose()
    openModal({
      title: 'Discard your changes?',
      body: 'This banner has unsaved changes.',
      confirmLabel: 'Discard', danger: true,
      onConfirm: onClose,
    })
  }

  const save = async (published) => {
    const next = { ...form, published }
    const problem = bannerFormError(next, { otherCodes })
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      const payload = toPayload(next)
      const res = banner
        ? await adminApi.updateBanner(banner.id, { ...payload, expectedUpdatedAt: banner.updatedAt || '' })
        : await adminApi.createBanner(payload)
      showToast(published ? `“${payload.title}” is published` : `“${payload.title}” saved as a draft`)
      onSaved(res.homepage)
      onClose()
    } catch (err) {
      if (err.detail?.homepage) onSaved(err.detail.homepage)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const discount = DISCOUNT.includes(form.type)
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 12 }

  return (
    <div role="dialog" aria-modal="true" aria-label={banner ? 'Edit banner' : 'New banner'} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(6,21,44,.5)', overflowY: 'auto', padding: isMobile ? 0 : '32px 24px' }}>
      <div style={{ background: 'var(--surface-page, #fff)', borderRadius: isMobile ? 0 : 18, maxWidth: 1180, margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'inherit', zIndex: 1, borderRadius: isMobile ? 0 : '18px 18px 0 0' }}>
          <div style={{ ...sectionTitle, flex: 1 }}>{banner ? `Edit “${banner.title}”` : placement === 'promotions' ? 'New promotion' : 'New hero banner'}</div>
          <button type="button" onClick={close} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--neutral-100)', cursor: 'pointer', fontSize: 18, fontWeight: 800 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.15fr) minmax(0,1fr)', gap: 24, padding: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
            {/* 1. Artwork */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={sectionTitle}>Banner image</div>
              <ImageSlot spec={spec} slot="desktop" form={form} set={set} busy={busyImage} setBusy={setBusyImage} />
              {form.image && <ImageSlot spec={spec} slot="mobile" form={form} set={set} busy={busyImage} setBusy={setBusyImage} />}
              <Field label="Image description (for screen readers)" hint="Say what the banner says — e.g. “Diwali offer: 20% off private theatres”. Defaults to the title.">
                <input className="bmva" style={inputStyle} value={form.imageAlt} maxLength={200} onChange={(e) => set({ imageAlt: e.target.value })} />
              </Field>
            </section>

            {/* 2. Words */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionTitle}>Title &amp; text</div>
              <Field label="Title (required)" hint="Used in the admin list, as the image description, and over the image if you show text.">
                <input className="bmva" style={inputStyle} value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <Field label="Details (optional)">
                <input className="bmva" style={inputStyle} value={form.text} maxLength={240} onChange={(e) => set({ text: e.target.value })} />
              </Field>
              <Check
                checked={form.showText}
                onChange={(v) => set({ showText: v })}
                label="Show the title and details over the image"
                hint="Leave off when the words are already part of your artwork."
              />
            </section>

            {/* 3. Offer */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionTitle}>Offer</div>
              {redeemed && (
                <div style={hintStyle}>
                  Code {banner.code} has been used on {banner.redemptions} paid booking{banner.redemptions === 1 ? '' : 's'}, so its code and discount type are locked. Amounts, dates and artwork can still change.
                </div>
              )}
              <div style={grid}>
                <Field label="Discount type">
                  <select className="bmva" style={{ ...inputStyle, cursor: 'pointer' }} value={form.type} disabled={redeemed} onChange={(e) => set({ type: e.target.value })}>
                    <option value="none">No discount (announcement)</option>
                    <option value="complimentary">Complimentary (free)</option>
                    <option value="percent">% off</option>
                    <option value="flat">₹ off</option>
                  </select>
                </Field>
                {discount && (
                  <>
                    <Field label={form.type === 'flat' ? 'Discount (₹)' : 'Discount (%)'}>
                      <input className="bmva" type="number" min="1" style={inputStyle} value={form.value} onChange={(e) => set({ value: e.target.value })} />
                    </Field>
                    <Field label="Promo code">
                      <input className="bmva" style={{ ...inputStyle, textTransform: 'uppercase' }} value={form.code} disabled={redeemed} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
                    </Field>
                    <Field label="Min spend ₹ (optional)">
                      <input className="bmva" type="number" min="0" style={inputStyle} value={form.minAmount} onChange={(e) => set({ minAmount: e.target.value })} />
                    </Field>
                    {form.type === 'percent' && (
                      <Field label="Max discount ₹ (optional)">
                        <input className="bmva" type="number" min="0" style={inputStyle} value={form.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} />
                      </Field>
                    )}
                    <Field label="Uses per customer (optional)">
                      <input className="bmva" type="number" min="0" placeholder="Blank = unlimited" style={inputStyle} value={form.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} />
                    </Field>
                  </>
                )}
              </div>
              {discount && (
                <Check checked={form.showCode} onChange={(v) => set({ showCode: v })} label="Show the code on the banner" />
              )}
              <Field label="Terms (optional)" hint="Shown on the Featured promotions card.">
                <textarea className="bmva" style={textareaStyle} value={form.terms} maxLength={600} onChange={(e) => set({ terms: e.target.value })} />
              </Field>
            </section>

            {/* 4. Button */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionTitle}>Button &amp; destination</div>
              <div style={grid}>
                <Field label="Button text" hint="Leave blank for no button — the image itself then opens the destination.">
                  <input className="bmva" style={inputStyle} value={form.ctaLabel} maxLength={40} onChange={(e) => set({ ctaLabel: e.target.value })} />
                </Field>
                <Field label="Category (optional)" hint="Labels the promotion and opens that category. The code still works on any venue at checkout.">
                  <select className="bmva" style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={(e) => set({ category: e.target.value })}>
                    <option value="">All venues (platform-wide)</option>
                    {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Link (optional)" hint="A page on this site such as /events, or a full https:// address. Blank = the category above, or the venue list.">
                <input className="bmva" style={inputStyle} placeholder="/events" value={form.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} />
              </Field>
            </section>

            {/* 5. Where and when */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionTitle}>Where &amp; when</div>
              <Check checked={form.showInHero} onChange={(v) => set({ showInHero: v })} label="Show in the hero banner" hint="Needs an image." />
              <Check checked={form.featuredPromotion} onChange={(v) => set({ featuredPromotion: v })} label="Show in Featured promotions" hint="Discounts need a code to appear there." />
              <div style={grid}>
                <Field label="Valid from (optional)">
                  <input className="bmva" type="date" style={inputStyle} value={form.from} onChange={(e) => set({ from: e.target.value })} />
                </Field>
                <Field label="Valid to (optional)">
                  <input className="bmva" type="date" style={inputStyle} value={form.to} onChange={(e) => set({ to: e.target.value })} />
                </Field>
              </div>
              <div style={hintStyle}>
                The dates control both when it shows and when its code works at checkout. Unpublishing hides it from the homepage only — the code keeps working until “Valid to”.
              </div>
            </section>
          </div>

          {/* Live preview */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={sectionTitle}>Preview</div>
            <div style={hintStyle}>Exactly how each screen size crops the banner. Nothing is public until you publish.</div>
            {form.showInHero ? (
              <BannerPreview spec={spec} form={form} />
            ) : (
              <div style={hintStyle}>Not shown in the hero — it appears as a Featured promotions card.</div>
            )}
            {(spec.notes || []).map((n) => <div key={n} style={hintStyle}>{n}</div>)}
          </aside>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 22px 20px', borderTop: '1px solid var(--border-subtle)', position: 'sticky', bottom: 0, background: 'inherit', borderRadius: isMobile ? 0 : '0 0 18px 18px' }}>
          {error && <div role="alert" style={{ flex: '1 1 100%', fontSize: 14.5, fontWeight: 700, color: 'var(--error-600)' }}>{error}</div>}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
          <Button variant="secondary" size="sm" disabled={saving || Boolean(busyImage)} onClick={() => save(false)}>
            {banner?.published ? 'Unpublish & save' : 'Save as draft'}
          </Button>
          <Button variant="primary" size="sm" disabled={saving || Boolean(busyImage)} onClick={() => save(true)}>
            {saving ? 'Saving…' : banner?.published ? 'Save — keep live' : 'Save & publish'}
          </Button>
        </div>
      </div>
    </div>
  )
}
