// Email campaigns — pure helpers shared by the page and its tests.
// The SERVER is the authority on every rule here (campaigns/content.py,
// campaigns/audience.py); these mirror it only so the form can say what is
// missing before a round trip.

export const STATUS = {
  draft: ['draft', 'Draft'],
  queued: ['pending', 'Queued'],
  sending: ['info', 'Sending…'],
  sent: ['success', 'Sent'],
  partial: ['warning', 'Sent with failures'],
  failed: ['error', 'Failed'],
  cancelled: ['neutral', 'Cancelled'],
}

export const statusBadge = (status) => STATUS[status] || ['neutral', status || 'Unknown']

// Statuses that are still moving — the page polls while one is on screen.
export const isActive = (status) => status === 'queued' || status === 'sending'

export const LIMITS = { name: 120, subject: 150, previewText: 200, heading: 150, body: 5000, ctaLabel: 40, ctaUrl: 500, images: 6 }

export const SEGMENT_HELP = {
  all: 'Every customer who opted in to promotional email.',
  location: 'Customers who booked a venue in this state (and city). Customer location is only known from their bookings.',
  booked: 'Customers with at least one confirmed venue booking.',
  not_booked: 'Opted-in customers who have never completed a venue booking.',
  lapsed: 'Customers who booked before, but not within the last N days.',
  category: 'Customers who booked a venue of this category.',
  event_buyers: 'Customers who bought tickets to an event.',
}

export function blankForm() {
  return {
    name: '', subject: '', previewText: '', heading: '', body: '',
    images: [], ctaLabel: '', ctaUrl: '', audience: { segment: 'all' },
  }
}

export function formFromCampaign(c) {
  if (!c) return blankForm()
  return {
    name: c.name || '', subject: c.subject || '', previewText: c.previewText || '',
    heading: c.heading || '', body: c.body || '',
    images: (c.images || []).map((img) => ({ url: img.url || '', alt: img.alt || '', link: img.link || '', caption: img.caption || '' })),
    ctaLabel: c.ctaLabel || '', ctaUrl: c.ctaUrl || '',
    audience: { segment: 'all', ...(c.audience || {}) },
  }
}

/** The audience exactly as the server stores it (unused keys dropped). */
export function cleanAudience(a = {}) {
  const segment = a.segment || 'all'
  const out = { segment }
  if (segment === 'location') {
    out.state = a.state || ''
    if (a.city) out.city = a.city
  }
  if (segment === 'category') out.category = a.category || ''
  if ((segment === 'booked' || segment === 'lapsed') && a.days !== '' && a.days != null) {
    out.days = Number(a.days)
  }
  return out
}

export function audienceProblem(a = {}) {
  if (a.segment === 'location' && !a.state) return 'Choose a state.'
  if (a.segment === 'category' && !a.category) return 'Choose a venue category.'
  if ((a.segment === 'booked' || a.segment === 'lapsed') && a.days !== '' && a.days != null) {
    const d = Number(a.days)
    if (!Number.isInteger(d) || d < 1 || d > 3650) return 'Days must be a whole number from 1 to 3650.'
  }
  return ''
}

export function toPayload(form) {
  return {
    name: form.name.trim(), subject: form.subject.trim(), previewText: form.previewText.trim(),
    heading: form.heading.trim(), body: form.body,
    images: form.images.filter((img) => img.url).map((img) => ({
      url: img.url.trim(), alt: img.alt.trim(), link: img.link.trim(), caption: img.caption.trim(),
    })),
    ctaLabel: form.ctaLabel.trim(), ctaUrl: form.ctaUrl.trim(),
    audience: cleanAudience(form.audience),
  }
}

const isLink = (v) => /^https:\/\/\S+$/.test(v) || (v.startsWith('/') && !v.startsWith('//'))

/** {field: message} — what blocks a test or a send (mirrors send_problems). */
export function sendProblems(form) {
  const p = {}
  if (!form.name.trim()) p.name = 'Give the campaign a name.'
  if (!form.subject.trim()) p.subject = 'Add an email subject.'
  if (!form.heading.trim()) p.heading = 'Add a heading.'
  if (!form.body.trim() && !form.images.some((img) => img.url)) p.body = 'Add some text or at least one image.'
  const label = form.ctaLabel.trim()
  const url = form.ctaUrl.trim()
  if (label && !url) p.ctaUrl = 'Add the button’s link.'
  if (url && !label) p.ctaLabel = 'Add the button’s text.'
  if (url && !isLink(url)) p.ctaUrl = 'Links must start with https:// (or be a site path like /venues).'
  form.images.forEach((img, i) => {
    if (img.link && !isLink(img.link.trim())) p.images = `Image ${i + 1}: its link must start with https://.`
    if (!img.alt.trim()) p.images = p.images || `Image ${i + 1}: add a short description (shown when images are blocked).`
  })
  for (const [key, max] of Object.entries(LIMITS)) {
    if (key === 'images') continue
    if ((form[key] || '').length > max) p[key] = `Keep this under ${max} characters.`
  }
  const audience = audienceProblem(form.audience)
  if (audience) p.audience = audience
  return p
}

export const sameForm = (a, b) => JSON.stringify(toPayload(a)) === JSON.stringify(toPayload(b))

/** "42%" of a base, or '—' when nothing to measure against. */
export function rate(part, whole) {
  const p = Number(part) || 0
  const w = Number(whole) || 0
  if (!w) return '—'
  return `${Math.round((p / w) * 100)}%`
}

export const moveImage = (list, index, delta) => {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

// Typing this is required before sending to ALL eligible customers.
export const SEND_ALL_PHRASE = 'SEND TO ALL'
export const needsAllConfirm = (audience) => (audience?.segment || 'all') === 'all'
