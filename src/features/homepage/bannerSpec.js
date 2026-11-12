// Homepage page — pure helpers (no React), so `npm test` can exercise them.
//
// The image rules themselves come from the SERVER (GET /api/admin/homepage
// → imageSpec, built in backend adminpanel/homepage.py from the customer
// site's real hero CSS). These helpers only apply that spec in the browser
// BEFORE upload — so the admin hears about a wrong size immediately — and
// the server checks the same rules again on upload.

/** What object-fit: cover keeps of an image in a frame: { width, height }
 * as fractions (1 = all of it). */
export function coverCrop(imageW, imageH, frameW, frameH) {
  if (!(imageW > 0 && imageH > 0 && frameW > 0 && frameH > 0)) return { width: 1, height: 1 }
  const imageRatio = imageW / imageH
  const frameRatio = frameW / frameH
  if (imageRatio > frameRatio) return { width: frameRatio / imageRatio, height: 1 }
  return { width: 1, height: imageRatio / frameRatio }
}

/** "84%" of the width kept, etc. — for the preview captions. */
export function cropCaption(imageW, imageH, frameW, frameH) {
  const keep = coverCrop(imageW, imageH, frameW, frameH)
  if (keep.width < 0.995) return `Shows the middle ${Math.round(keep.width * 100)}% of the width`
  if (keep.height < 0.995) return `Shows the middle ${Math.round(keep.height * 100)}% of the height`
  return 'Shows the whole image'
}

const pxs = (s) => `${s.width}×${s.height}px`

/**
 * Check an image against one slot of the spec. Mirrors the server's
 * image_problem / ratio_warnings: `problem` blocks the upload (too small,
 * absurd shape, wrong format, too big), `warnings` are advice.
 */
export function checkImage(spec, slot, { width, height, bytes, type }) {
  const slotSpec = spec?.slots?.[slot]
  if (!slotSpec) return { problem: 'Unknown image slot.', warnings: [] }
  if (type && Array.isArray(spec.mimeTypes) && !spec.mimeTypes.includes(type)) {
    return { problem: `Use a ${spec.formats.join(', ')} image.`, warnings: [] }
  }
  if (bytes != null && spec.maxBytes && bytes > spec.maxBytes) {
    return {
      problem: `This file is ${(bytes / (1024 * 1024)).toFixed(1)} MB — the limit is ${Math.floor(spec.maxBytes / (1024 * 1024))} MB. Export it as a compressed JPEG or WebP.`,
      warnings: [],
    }
  }
  if (!(width > 0 && height > 0)) return { problem: 'Could not read this image’s size.', warnings: [] }
  if (width > 8000 || height > 8000) {
    return { problem: 'Images larger than 8000px on a side are not accepted — resize it first.', warnings: [] }
  }
  const { minimum, recommended, sharpFrom, ratio } = slotSpec
  if (width < minimum.width || height < minimum.height) {
    return {
      problem: `This image is ${width}×${height}px — too small to stay sharp. Use at least ${pxs(minimum)} (recommended ${pxs(recommended)}).`,
      warnings: [],
    }
  }
  const r = width / height
  if (r < ratio.min || r > ratio.max) {
    return {
      problem: `This image is ${r.toFixed(2)}:1 — too far from the banner’s ${ratio.label} shape; shown whole it would be far too tall or too thin. Crop it to about ${pxs(recommended)}.`,
      warnings: [],
    }
  }
  const warnings = []
  const name = slot === 'mobile' ? 'phone image' : 'banner image'
  if (r < ratio.warnMin || r > ratio.warnMax) {
    warnings.push(`The ${name} is ${width}×${height} (${r.toFixed(2)}:1); banners are designed for ${ratio.label}. It still shows whole, at its own shape, so it will be ${r < ratio.value ? 'taller' : 'shorter'} than ${ratio.label} banners in the rotation.`)
  }
  if (width < sharpFrom.width || height < sharpFrom.height) {
    warnings.push(`The ${name} is ${width}×${height}; at least ${pxs(sharpFrom)} looks sharp on large and high-resolution screens.`)
  }
  return { problem: '', warnings }
}

const DISCOUNT_TYPES = ['percent', 'flat']
const CODE_RE = /^[A-Z0-9]{1,30}$/

/**
 * Where a banner's link goes, or null when it is not a usable link:
 *   { type: 'internal', to }   a page on the customer site ('/events', '/venues')
 *   { type: 'external', href } a full http(s) address with a real host
 * '' → { type: 'none' } (the banner is not clickable). Mirrors the customer
 * site's homeLayout heroLink and the server's check.
 */
export function bannerLink(url) {
  const text = String(url || '').trim()
  if (!text) return { type: 'none' }
  if (text.startsWith('/') && !text.startsWith('//') && !text.includes('\\') && !/\s/.test(text)) {
    return { type: 'internal', to: text }
  }
  if (!/^https?:\/\//i.test(text)) return null
  try {
    const parsed = new URL(text)
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') return null
    return { type: 'external', href: parsed.href }
  } catch {
    return null
  }
}

const safeLink = (url) => bannerLink(url) !== null

/** "Opens /events", "Opens example.com (new tab)", "Not clickable". */
export function linkLabel(url) {
  const link = bannerLink(url)
  if (!link) return 'Link not valid'
  if (link.type === 'none') return 'Not clickable — no link'
  if (link.type === 'internal') return `Opens ${link.to}`
  return `Opens ${new URL(link.href).hostname} in a new tab`
}

/**
 * How big a hero banner image shows on a screen whose banner area is
 * `frameWidth` px wide: the full width, at the image's own shape (never
 * stretched or cropped) — what the customer site draws (HeroCarousel).
 * null when the image's size is unknown.
 */
export function heroDisplaySize(frameWidth, imageW, imageH) {
  if (!(frameWidth > 0 && imageW > 0 && imageH > 0)) return null
  const height = Math.round(frameWidth * (imageH / imageW))
  return { width: frameWidth, height, scale: frameWidth / imageW }
}

/**
 * The first problem with a banner form, or '' — the same rules the server
 * enforces (adminpanel/homepage.py clean_banner), checked before sending so
 * the admin sees the message next to the form.
 */
export function bannerFormError(form, { otherCodes = [] } = {}) {
  const title = String(form.title || '').trim()
  // An image alone is a complete hero banner; a title is needed only when
  // there is no image, or for a Featured Promotions card (it prints it).
  if (!title && !String(form.image || '').trim()) return 'Upload a banner image, or give the banner a title.'
  if (!title && form.featuredPromotion) {
    return 'Featured promotions need a title — add one, or untick “Show in Featured promotions” to publish the image as a hero banner only.'
  }
  if (title.length > 120) return 'The title can be at most 120 characters.'
  if (String(form.text || '').length > 240) return 'The details can be at most 240 characters.'
  if (DISCOUNT_TYPES.includes(form.type)) {
    const value = Number(form.value)
    if (!(value > 0)) return 'Enter the discount for this offer.'
    if (form.type === 'percent' && value > 100) return 'A percent discount can’t exceed 100.'
    const code = String(form.code || '').trim().toUpperCase()
    if (!code) return 'Enter a promo code — customers apply it at checkout.'
    if (!CODE_RE.test(code)) return 'Promo codes use letters A–Z and digits only (up to 30).'
    if (otherCodes.map((c) => String(c).toUpperCase()).includes(code)) return `Code ${code} is already used by another promotion.`
  }
  if (form.from && form.to && form.from > form.to) return '“Valid from” must be on or before “Valid to”.'
  if (form.imageMobile && !form.image) return 'Add the desktop image first — the phone image is an optional extra.'
  if (!safeLink(form.ctaUrl)) return 'The link must be a page on this site starting with / (e.g. /events) or a full https:// address.'
  if (form.published && form.showInHero && !form.image) {
    return 'Hero banners need an image. Upload one, or untick “Show in hero” to use this only as a Featured Promotion.'
  }
  if (!form.showInHero && !form.featuredPromotion && form.published) {
    return 'Choose where it shows — the hero, Featured promotions, or both.'
  }
  return ''
}

/** Move one item up (-1) or down (+1) in a list; a new array. */
export function moveItem(list, index, delta) {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** What the admin list and messages call a banner — its title, or a
 *  plain label for an image-only banner. */
export const bannerName = (b) => String(b?.title || '').trim() || 'Image banner'

/** Human labels for the server's banner `state`. */
export const BANNER_STATES = {
  live: { label: 'Live', badge: 'live' },
  scheduled: { label: 'Scheduled', badge: 'info' },
  expired: { label: 'Expired', badge: 'neutral' },
  draft: { label: 'Unpublished', badge: 'draft' },
}

/** Human labels for a featured event's `state`. */
export const EVENT_STATES = {
  showing: { label: 'Showing', badge: 'live' },
  scheduled: { label: 'Scheduled', badge: 'info' },
  ended: { label: 'Schedule ended', badge: 'neutral' },
  not_bookable: { label: 'Not bookable — hidden', badge: 'warning' },
  not_live: { label: 'Not published — hidden', badge: 'warning' },
}
