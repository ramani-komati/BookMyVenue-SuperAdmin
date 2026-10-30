import { useState } from 'react'
import { cropCaption } from './bannerSpec.js'
import ImageFrame from '../../components/ui/ImageFrame.jsx'
import { fitCaption } from '../../utils/imageSpecs.js'

// The kicker line the customer site draws (features/home/homepage.js heroKicker).
function kicker(form) {
  const value = Number(form.value)
  if (form.type === 'percent' && value > 0) return `FLAT ${value}% OFF`
  if (form.type === 'flat' && value > 0) return `FLAT ₹${value} OFF`
  if (form.type === 'complimentary') return 'COMPLIMENTARY'
  return 'BOOK • CELEBRATE • MEMORIES'
}

/**
 * One hero frame, drawn at a fraction of its real size, by the customer
 * site's two rules (HeroCarousel):
 *   • image-only banner — the frame takes the artwork's own shape and shows
 *     it WHOLE (never cropped); the caption gives the height it gets there;
 *   • title over the image — the real banner's proportions (the server's
 *     imageSpec.frames, from the site's CSS), object-fit: cover on the
 *     admin's chosen focal point — so what is trimmed here is exactly what
 *     that screen trims.
 */
function Frame({ frame, form, image, dims, width }) {
  const [broken, setBroken] = useState(false)
  const phone = frame.viewport <= 640
  const showText = !image || broken || form.showText
  const artOnly = Boolean(image) && !broken && !showText
  const artRatio = dims?.width && dims?.height ? Math.min(6, Math.max(1.2, dims.width / dims.height)) : (phone && form.imageMobile ? 2 : 4)
  const shown = artOnly ? { width: frame.width, height: Math.round(frame.width / artRatio) } : frame
  const scale = width / shown.width
  const focus = (phone ? form.imageMobilePosition : form.imagePosition) || 'center'
  const code = ['percent', 'flat'].includes(form.type) && form.showCode ? String(form.code || '').toUpperCase() : ''
  const f = (px) => Math.max(7, px * scale * (phone ? 1 : 1.25))
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          // Shrinks with a narrow panel but never changes shape.
          position: 'relative', width: '100%', maxWidth: width, aspectRatio: `${shown.width} / ${shown.height}`,
          borderRadius: Math.max(6, 16 * scale),
          overflow: 'hidden', background: 'var(--navy-800)', display: 'flex',
        }}
      >
        {image && !broken && (
          <img src={image} alt="" onError={() => setBroken(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: artOnly ? 'contain' : 'cover', objectPosition: artOnly ? 'center' : focus }} />
        )}
        {image && !broken && showText && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              background: phone ? 'rgba(6,21,44,.74)' : 'linear-gradient(90deg, rgba(6,21,44,.92) 0%, rgba(6,21,44,.72) 45%, rgba(6,21,44,.18) 100%)',
            }}
          />
        )}
        {!artOnly && (
        <div
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: showText ? 'center' : 'flex-end',
            padding: `${Math.max(4, (phone ? 18 : 36) * scale)}px ${Math.max(6, (phone ? 20 : 60) * scale)}px`, gap: Math.max(2, 6 * scale), color: '#fff', minWidth: 0,
          }}
        >
          {showText && (
            <>
              <span style={{ fontSize: f(phone ? 11 : 13), fontWeight: 700, letterSpacing: '.14em', opacity: 0.85 }}>{kicker(form)}</span>
              <span style={{ fontSize: f(phone ? 22 : 34), fontWeight: 800, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{form.title || 'Banner title'}</span>
              {form.text && <span style={{ fontSize: f(phone ? 14 : 16), opacity: 0.8 }}>{form.text}</span>}
            </>
          )}
          {code && (
            <span style={{ alignSelf: 'flex-start', border: '1px dashed rgba(255,255,255,.7)', borderRadius: 999, padding: `${Math.max(1, 6 * scale)}px ${Math.max(4, 14 * scale)}px`, fontSize: f(13), fontWeight: 800 }}>
              USE CODE {code}
            </span>
          )}
          {form.ctaLabel && (
            <span style={{ alignSelf: 'flex-start', background: '#fff', color: 'var(--navy-800)', borderRadius: Math.max(3, 10 * scale), padding: `${Math.max(2, 10 * scale)}px ${Math.max(4, 22 * scale)}px`, fontSize: f(15), fontWeight: 700 }}>
              {form.ctaLabel}
            </span>
          )}
        </div>
        )}
      </div>
      {/* Image-only banner: like the site, the code and button sit UNDER the
          artwork so they never cover it. */}
      {artOnly && (code || form.ctaLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', maxWidth: width }}>
          {code && (
            <span style={{ border: '1px dashed var(--success-600, #079455)', background: 'var(--success-50, #ecfdf3)', color: 'var(--success-700, #067647)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
              USE CODE {code}
            </span>
          )}
          {form.ctaLabel && (
            <span style={{ background: 'var(--red-600, #d71620)', color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>
              {form.ctaLabel}
            </span>
          )}
        </div>
      )}
      <figcaption style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        <strong style={{ color: 'var(--text-heading)' }}>{frame.label}</strong> · {shown.width}×{shown.height}px banner
        {artOnly
          ? ' · Shows the whole image'
          : dims?.width && image ? ` · ${cropCaption(dims.width, dims.height, frame.width, frame.height)}` : ''}
      </figcaption>
    </figure>
  )
}

/**
 * The Featured promotions card on Explore (customer Promotions.jsx): a 2:1
 * picture — the phone image when there is one (it is exactly 2:1), else the
 * desktop image shown WHOLE on a blurred copy of itself — above the title.
 */
function PromoCardFrame({ form }) {
  const image = form.imageMobile || form.image
  const dims = form.imageMobile
    ? (form.imageMobileWidth ? { width: form.imageMobileWidth, height: form.imageMobileHeight } : null)
    : (form.imageWidth ? { width: form.imageWidth, height: form.imageHeight } : null)
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ width: 300, maxWidth: '100%', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden', background: 'var(--surface-card)' }}>
        <ImageFrame kind="promo" src={image} alt="" radius={0} style={{ background: 'var(--navy-800)' }} />
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-heading)', overflowWrap: 'anywhere' }}>{form.title || 'Banner title'}</span>
          {form.text && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{form.text}</span>}
        </div>
      </div>
      <figcaption style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        <strong style={{ color: 'var(--text-heading)' }}>Featured promotions card</strong> · 2:1 picture
        {image ? ` · uses the ${form.imageMobile ? 'phone' : 'desktop'} image` : ''}
        {dims ? ` · ${fitCaption('promo', dims.width, dims.height)}` : ''}
      </figcaption>
    </figure>
  )
}

/**
 * How the banner will look on each screen size, before it is published.
 * Phones use the phone image when there is one (as the customer site does,
 * at 640px and narrower), otherwise the desktop image — whole for an
 * image-only banner, cropped on its focal point when words go over it.
 */
export default function BannerPreview({ spec, form }) {
  const frames = spec?.frames || []
  if (!frames.length) return null
  const desktopDims = form.imageWidth ? { width: form.imageWidth, height: form.imageHeight } : null
  const mobileDims = form.imageMobileWidth ? { width: form.imageMobileWidth, height: form.imageMobileHeight } : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {frames.map((frame) => {
        const phone = frame.viewport <= 640
        const image = phone ? (form.imageMobile || form.image) : form.image
        const dims = phone && form.imageMobile ? mobileDims : desktopDims
        return (
          <Frame
            key={frame.label}
            frame={frame}
            form={form}
            image={image}
            dims={dims}
            width={phone ? 280 : Math.min(480, frame.width / 3.2)}
          />
        )
      })}
      {form.featuredPromotion && <PromoCardFrame form={form} />}
    </div>
  )
}
