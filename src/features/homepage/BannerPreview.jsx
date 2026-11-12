import { useState } from 'react'
import { heroDisplaySize, linkLabel } from './bannerSpec.js'
import ImageFrame from '../../components/ui/ImageFrame.jsx'
import { fitCaption } from '../../utils/imageSpecs.js'

/**
 * One screen size, drawn at a fraction of its real size, by the customer
 * site's rule (HeroCarousel, 2026-11-12): the uploaded image IS the banner —
 * the full banner width at the image's own shape, never stretched or
 * cropped, with nothing drawn over it. Phones (≤640px) show the phone image
 * when there is one, otherwise the desktop image scaled down whole.
 * `frame.width` is that screen's banner width (server imageSpec.frames).
 */
function Frame({ frame, image, dims, phoneArt, width }) {
  const [broken, setBroken] = useState(false)
  const [measured, setMeasured] = useState(null)
  const known = dims?.width && dims?.height ? dims : measured
  const size = known ? heroDisplaySize(frame.width, known.width, known.height) : null
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          width: '100%', maxWidth: width, borderRadius: 8, overflow: 'hidden', lineHeight: 0,
          background: 'var(--neutral-100)', border: '1px solid var(--border-subtle)',
          ...(!image || broken ? { aspectRatio: phoneArt ? '2 / 1' : '4 / 1' } : null),
        }}
      >
        {image && !broken && (
          <img
            src={image}
            alt=""
            onError={() => setBroken(true)}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              if (w > 0 && h > 0) setMeasured({ width: w, height: h })
            }}
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        )}
      </div>
      <figcaption style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        <strong style={{ color: 'var(--text-heading)' }}>{frame.label}</strong> ({frame.viewport}px screen)
        {size ? ` · shows ${size.width}×${size.height}px` : ''}
        {image && !broken ? ` · whole ${phoneArt ? 'phone' : 'desktop'} image` : ''}
        {size && image && !broken ? `, ${size.scale >= 1 ? 'enlarged' : 'scaled'} to ${Math.round(size.scale * 100)}%` : ''}
        {broken ? ' · this image could not be loaded' : ''}
        {size && size.scale > 1.05 ? ' — upload a larger image to stay sharp here' : ''}
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
 * How the banner will look on each screen size, before it is published —
 * the same rules the customer site draws (see Frame), plus where a tap goes.
 */
export default function BannerPreview({ spec, form }) {
  const frames = spec?.frames || []
  if (!frames.length) return null
  const desktopDims = form.imageWidth ? { width: form.imageWidth, height: form.imageHeight } : null
  const mobileDims = form.imageMobileWidth ? { width: form.imageMobileWidth, height: form.imageMobileHeight } : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!form.image && <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Upload the banner image to see it on each screen size.</div>}
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-heading)' }}>Tap: {linkLabel(form.ctaUrl)}</div>
      {frames.map((frame) => {
        const phone = frame.viewport <= 640
        const phoneArt = phone && Boolean(form.imageMobile)
        return (
          <Frame
            key={`${frame.label}|${phoneArt ? form.imageMobile : form.image}`}
            frame={frame}
            image={phoneArt ? form.imageMobile : form.image}
            dims={phoneArt ? mobileDims : desktopDims}
            phoneArt={phoneArt}
            width={phone ? 280 : Math.min(480, frame.width / 3.2)}
          />
        )
      })}
      {form.featuredPromotion && <PromoCardFrame form={form} />}
    </div>
  )
}
