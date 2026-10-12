/**
 * The admin event form's shape, validation and API payload.
 *
 * Validation is duplicated here on purpose. The backend validates everything
 * (events/writes.py) and IS the authority — an admin who bypasses this file
 * still cannot save a bad event. This copy exists so the admin sees which
 * FIELD is wrong, inline, before a round trip; the server's message is shown
 * verbatim when it disagrees, rather than being translated into something
 * vaguer.
 *
 * Kept as plain functions (no React) so they are testable and so the form
 * component stays about rendering.
 */

// Mirrors events/writes.py.
export const MAX_DATES = 60
export const MAX_TICKET_TYPES = 8
export const MAX_CAPACITY = 100000
export const MAX_TICKET_PRICE = 1000000
export const MAX_PHOTOS = 8          // matches MAX_GALLERY in events/writes.py
// Homepage promotion cap — Event.MAX_FEATURED. The BACKEND enforces it (409
// PROMOTION_LIMIT); this copy only lets the page show "3 / 6 promoted".
export const MAX_PROMOTED = 6

/** Today in YYYY-MM-DD, local — what `min` on a date input wants. */
export const todayISO = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Compare two YYYY-MM-DD strings as DATES, by string order.
 *
 * Deliberately NOT `new Date(a) < new Date(b)`: that parses a bare
 * YYYY-MM-DD as midnight UTC, so east of Greenwich "today" becomes
 * yesterday for part of the day and a perfectly valid date gets rejected as
 * past. ISO dates sort lexicographically, which has no timezone in it at all.
 */
export const isBefore = (a, b) => String(a) < String(b)

const EMPTY_TICKETS = [
  // Adult and child are required by the product, so they start present
  // rather than being something the admin discovers by failing to save.
  { key: 'adult', label: 'Adult', price: '', seatsPerTicket: 1 },
  { key: 'child', label: 'Child', price: '', seatsPerTicket: 1 },
]

/** A blank form. */
export const blankEvent = () => ({
  id: null,
  name: '',
  category: '',
  description: '',
  // ONE ordered list, not poster-plus-gallery. Photo #1 is the banner; the
  // split into two fields only exists in the API, and keeping it in the form
  // meant "change the cover" was a delete-and-re-upload.
  photos: [],
  venueName: '',
  address: '',
  locality: '',
  city: '',
  mapsLink: '',
  organizerName: '',
  organizerPhone: '',
  contactPhone: '',
  terms: '',
  startTime: '18:00',
  endTime: '22:00',
  bookingOpensOn: '',
  bookingClosesOn: '',
  dates: [{ date: '', capacity: '', isAvailable: true }],
  ticketTypes: EMPTY_TICKETS.map((t) => ({ ...t })),
  status: 'draft',
})

/** An existing admin event row (GET /bootstrap → events[]) → form state. */
export const eventToForm = (row) => ({
  id: row.id,
  name: row.name || '',
  category: row.category || '',
  description: row.description || '',
  photos: [row.poster, ...(row.gallery || [])].filter(Boolean),
  venueName: row.venueName || '',
  address: row.address || '',
  locality: row.locality || '',
  city: row.city || '',
  mapsLink: row.mapsLink || '',
  organizerName: row.organizer || '',
  organizerPhone: row.organizerPhone || '',
  contactPhone: row.contactPhone || '',
  terms: row.terms || '',
  startTime: row.startTime || '18:00',
  endTime: row.endTime || '22:00',
  bookingOpensOn: row.bookingOpensOn || '',
  bookingClosesOn: row.bookingClosesOn || '',
  dates: (row.dates || []).length
    ? row.dates.map((d) => ({
      date: d.date,
      capacity: String(d.capacity ?? ''),
      isAvailable: d.isAvailable !== false,
      // Carried so validation can tell an existing past night (legitimate —
      // it already ran) from a newly typed one (a mistake).
      existing: true,
      sold: d.sold || 0,
    }))
    : [{ date: '', capacity: '', isAvailable: true }],
  ticketTypes: (row.ticketTypes || []).length
    ? row.ticketTypes.map((t) => ({
      key: t.key,
      label: t.label,
      price: String(t.price ?? ''),
      seatsPerTicket: t.seatsPerTicket || 1,
      isActive: t.isActive !== false,
    }))
    : EMPTY_TICKETS.map((t) => ({ ...t })),
  status: row.status || 'draft',
})

const isBlank = (v) => !String(v ?? '').trim()

// Mirrors events/location.clean_maps_link: Google's share short links, or a
// google.<tld> URL that is actually a maps page. google.com.evil.example is
// NOT Google — the host must END in the Google domain.
const SHORT_MAPS_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co'])
const GOOGLE_HOST = /^(www\.|maps\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/
export const isGoogleMapsLink = (link) => {
  try {
    const u = new URL(String(link || '').trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const host = u.hostname.toLowerCase()
    if (SHORT_MAPS_HOSTS.has(host)) return true
    return GOOGLE_HOST.test(host) && (host.startsWith('maps.') || u.pathname.startsWith('/maps'))
  } catch {
    return false
  }
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * { field: message } for everything wrong with `form`. Empty object = valid.
 * Keys match the form's field names so each input can show its own error.
 */
export function validateEvent(form) {
  const errors = {}
  const today = todayISO()

  if (isBlank(form.name)) errors.name = 'An event name is required.'
  if (isBlank(form.category)) errors.category = 'Pick a category.'
  if (isBlank(form.venueName)) {
    errors.venueName = 'Where is it happening? A venue name is required.'
  }
  if (form.mapsLink && !isGoogleMapsLink(form.mapsLink)) {
    errors.mapsLink = 'Use a Google Maps link, e.g. https://maps.app.goo.gl/… or https://www.google.com/maps/…'
  }
  if (!HHMM.test(String(form.startTime || ''))) errors.startTime = 'Use HH:MM, e.g. 18:00.'
  if (!HHMM.test(String(form.endTime || ''))) errors.endTime = 'Use HH:MM, e.g. 22:00.'

  if (form.organizerPhone && !/^\d{10}$/.test(String(form.organizerPhone))) {
    errors.organizerPhone = 'A phone number is 10 digits.'
  }
  if (form.contactPhone && !/^\d{10}$/.test(String(form.contactPhone))) {
    errors.contactPhone = 'A phone number is 10 digits.'
  }

  if (
    form.bookingOpensOn && form.bookingClosesOn
    && isBefore(form.bookingClosesOn, form.bookingOpensOn)
  ) {
    errors.bookingClosesOn = 'Booking cannot close before it opens.'
  }

  // --- dates ---
  const rows = Array.isArray(form.dates) ? form.dates : []
  const filled = rows.filter((d) => !isBlank(d.date))
  if (filled.length === 0) {
    errors.dates = 'Add at least one date.'
  } else if (filled.length > MAX_DATES) {
    errors.dates = `At most ${MAX_DATES} dates.`
  } else {
    const seen = new Set()
    for (const row of filled) {
      if (seen.has(row.date)) {
        errors.dates = `${row.date} is listed twice.`
        break
      }
      seen.add(row.date)
      // A past date is fine if the event ALREADY ran that night; it is a
      // mistake if the admin just typed it.
      if (isBefore(row.date, today) && !row.existing) {
        errors.dates = `${row.date} is in the past — pick today or later.`
        break
      }
      const capacity = Number(row.capacity)
      if (!Number.isFinite(capacity) || capacity < 1) {
        errors.dates = `${row.date} needs a capacity of at least 1.`
        break
      }
      if (capacity > MAX_CAPACITY) {
        errors.dates = `Capacity cannot exceed ${MAX_CAPACITY.toLocaleString('en-IN')}.`
        break
      }
      if (row.sold && capacity < row.sold) {
        errors.dates = `${row.date} already has ${row.sold} ticket(s) sold — `
          + 'capacity cannot go below that.'
        break
      }
    }
  }

  // --- ticket types ---
  const types = (Array.isArray(form.ticketTypes) ? form.ticketTypes : [])
    .filter((t) => !isBlank(t.label) || !isBlank(t.price))
  if (types.length === 0) {
    errors.ticketTypes = 'Add at least the adult and child prices.'
  } else if (types.length > MAX_TICKET_TYPES) {
    errors.ticketTypes = `At most ${MAX_TICKET_TYPES} ticket types.`
  } else {
    const keys = types.map((t) => slugKey(t.key || t.label))
    for (const required of ['adult', 'child']) {
      if (!keys.includes(required)) {
        errors.ticketTypes = `Every event needs an "${required}" ticket price.`
        break
      }
    }
    if (!errors.ticketTypes && new Set(keys).size !== keys.length) {
      errors.ticketTypes = 'Two ticket types have the same name.'
    }
    if (!errors.ticketTypes) {
      for (const t of types) {
        const price = Number(t.price)
        if (!Number.isFinite(price) || price < 0) {
          errors.ticketTypes = `${t.label || t.key} needs a price of 0 or more.`
          break
        }
        if (price > MAX_TICKET_PRICE) {
          errors.ticketTypes = `${t.label || t.key}: price is too high.`
          break
        }
      }
    }
  }

  return errors
}

/** The form's photos, cleaned: trimmed, de-duplicated, capped. */
export const photoList = (form) => [
  ...new Set((form.photos || []).map((u) => String(u || '').trim()).filter(Boolean)),
].slice(0, MAX_PHOTOS)

/** 'VIP Lounge' → 'vip-lounge' (the backend slugifies the same way). */
export const slugKey = (raw) =>
  String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

/**
 * Form state → the JSON body the admin API expects.
 *
 * `publish` only ever asks; the SERVER decides, and refuses an event with no
 * bookable date or no ticket price. Nothing here computes money or status.
 */
export function toPayload(form, { publish = false } = {}) {
  return {
    name: String(form.name || '').trim(),
    category: String(form.category || '').trim(),
    description: String(form.description || '').trim(),
    // Split back into the API's shape at the edge: first photo is the
    // poster, the rest are the gallery. Sending `gallery: []` explicitly
    // matters — it is how removing every extra photo is persisted.
    posterUrl: photoList(form)[0] || '',
    gallery: photoList(form).slice(1),
    venueName: String(form.venueName || '').trim(),
    address: String(form.address || '').trim(),
    locality: String(form.locality || '').trim(),
    city: String(form.city || '').trim(),
    mapsLink: String(form.mapsLink || '').trim(),
    organizerName: String(form.organizerName || '').trim(),
    organizerPhone: String(form.organizerPhone || '').trim(),
    contactPhone: String(form.contactPhone || '').trim(),
    terms: String(form.terms || '').trim(),
    startTime: form.startTime,
    endTime: form.endTime,
    bookingOpensOn: form.bookingOpensOn || null,
    bookingClosesOn: form.bookingClosesOn || null,
    dates: (form.dates || [])
      .filter((d) => String(d.date || '').trim())
      .map((d) => ({
        date: d.date,
        capacity: Number(d.capacity),
        isAvailable: d.isAvailable !== false,
      })),
    ticketTypes: (form.ticketTypes || [])
      .filter((t) => String(t.label || t.key || '').trim())
      .map((t) => ({
        key: slugKey(t.key || t.label),
        label: String(t.label || '').trim() || slugKey(t.key),
        price: Number(t.price || 0),
        seatsPerTicket: Number(t.seatsPerTicket || 1),
        isActive: t.isActive !== false,
      })),
    ...(publish ? { status: 'publish' } : {}),
  }
}
