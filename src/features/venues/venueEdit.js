// All venues → Edit — the pure half of the super admin's venue editor (no
// React, relative imports only, so `npm test` covers it).
//
// The backend (adminpanel/venue_edit.py) saves BOTH the vendor's draft and
// the published listing, so the vendor portal's republish can't revert an
// admin edit. This file turns its GET answer into the registration form's
// sections and the form back into the PUT body. Bank / payout details are
// never part of either: the server leaves them out and refuses them.

import { blankBasics, blankDetails, blankLocation, blankPhotos } from '../venue-registration/model.js'
import { fieldErrors } from '../venue-registration/validation/venueValidation.js'
import { listingFromDraft } from '../../services/listingCompose.js'
import { OTHERS, groupOfType, normalizeVenueType } from '../../constants/categories.js'
import { detailsFromTimings } from '../../utils/venueTimings.js'
import { MAX_VENUE_PHOTOS } from '../../constants/venue.js'
import { offeringKindOf } from '../venue-registration/offerings/model.js'
import { exactPinCoords } from '../../utils/maps.js'

export const EDIT_TABS = [
  { key: 'basics', label: 'Basic info', icon: 'building-2' },
  { key: 'location', label: 'Location', icon: 'map-pin' },
  { key: 'photos', label: 'Photos', icon: 'image' },
  { key: 'details', label: 'Details', icon: 'sparkles' },
]

const str = (v) => (v == null ? '' : String(v))

// A venue whose draft no longer exists (e.g. seeded before drafts were
// kept) — rebuild what the published record still says. Lossy but honest:
// every field the admin then sees is from the record.
export function sectionsFromRecord(record = {}) {
  const d = record.detail || {}
  const type = normalizeVenueType(d.primaryCategory) || normalizeVenueType(record.category) || (record.category ? OTHERS : '')
  const isSports = type === 'Playzone'
  const gallery = (record.gallery || []).filter(Boolean)
  const photo = (url, i) => ({ id: `record-${i}`, url })
  return {
    basics: { venueName: str(record.name), shortDescription: str(d.description), phone: str(d.contactPhone), email: '' },
    location: {
      houseStreet: str(d.address), area: str(record.locality), district: str(record.district),
      city: str(record.city), pincode: str(record.pincode || d.pincode), stateName: '', mapsLink: str(d.mapsLink),
      latitude: d.mapPin?.lat != null ? str(d.mapPin.lat) : '',
      longitude: d.mapPin?.lng != null ? str(d.mapPin.lng) : '',
    },
    details: {
      primaryCategory: type,
      categoryGroup: groupOfType(type),
      customCategory: type === OTHERS ? str(d.customCategory || record.category) : '',
      ...detailsFromTimings(d.timings),
      amenities: Array.isArray(d.amenities) ? d.amenities : [],
      parkingAvailable: Boolean(d.parking),
      diningAvailable: Boolean(d.dining),
      fullDescription: str(d.description),
      autoDescription: false,
      seatingCapacity: isSports ? str(d.capacity) : '',
      numScreens: isSports ? '1' : str(d.unitCount || 1),
      screenConfig: isSports ? {} : Object.fromEntries(
        Array.from({ length: Math.max(1, Number(d.unitCount) || 1) }, (_, i) => [
          i, { max: i === 0 ? str(d.capacity) : '', price: str(d.unitPrices?.[i] ?? (i === 0 ? record.price : '')), weekendPrice: str(d.unitWeekendPrices?.[i]) },
        ]),
      ),
      sports: Object.fromEntries((d.sports || []).filter((s) => s?.name).map((s) => [s.name, true])),
      sportConfig: Object.fromEntries((d.sports || []).filter((s) => s?.name).map((s) => [s.name, {
        price: str(s.price), units: str(s.units || 1),
        unitPrice: Object.fromEntries((s.unitPrices || []).map((p, i) => [i, str(p)])),
        unitWeekendPrice: Object.fromEntries((s.unitWeekendPrices || []).map((p, i) => [i, str(p)])),
      }])),
      packages: (d.packages || []).map((p) => ({ label: str(p.label), details: str(p.details), price: str(p.price), duration: str(p.duration), chargePerHour: false, maxPersons: '' })),
      subCategories: Object.fromEntries((d.occasions || []).map((o) => [o, true])),
      extraPersonPrice: str(d.extraPersonPrice),
      maxExtraPersons: str(d.maxExtraPersons),
      extraHourPrice: str(d.extraHourPrice),
      maxExtraHours: str(d.maxExtraHours),
      // Membership plans / resort packages / surprise shows, as published.
      ...(offeringKindOf(type) && d[offeringKindOf(type)] ? { [offeringKindOf(type)]: d[offeringKindOf(type)] } : {}),
      paused: Boolean(d.paused ?? record.paused),
      pauseReason: str(d.pauseReason ?? record.pauseReason),
    },
    photos: {
      venuePhotos: gallery.slice(0, MAX_VENUE_PHOTOS).map(photo),
      serviceImages: gallery.slice(MAX_VENUE_PHOTOS).map((url, i) => photo(url, i + MAX_VENUE_PHOTOS)),
    },
  }
}

/** GET /api/admin/venues/<id>/edit → the form's sections (blank-filled). */
export function sectionsForEdit(payload = {}) {
  const fromDraft = payload.draft && typeof payload.draft === 'object'
  const src = fromDraft ? payload.draft : sectionsFromRecord(payload.record || {})
  const details = { ...blankDetails(), ...(src.details || {}) }
  // Legacy spellings open as today's venue types; drafts saved before the
  // primary categories existed get theirs from the type.
  details.primaryCategory = normalizeVenueType(details.primaryCategory) || details.primaryCategory || ''
  if (!details.categoryGroup) details.categoryGroup = groupOfType(details.primaryCategory)
  // A draft from before Venue Timings: start from the published ones, if any.
  if (!details.open24Hours && !details.openTime && !details.closeTime) {
    Object.assign(details, detailsFromTimings(payload.record?.detail?.timings))
  }
  return {
    basics: { ...blankBasics(), ...(src.basics || {}) },
    location: { ...blankLocation(), ...(src.location || {}) },
    details,
    photos: { ...blankPhotos(), ...(src.photos || {}) },
  }
}

/** The PUT body: the edited sections + the record rebuilt from them by the
 *  same mapper a registration publishes with. Never carries payout. */
export function editRequest(listingId, sections, version, { locationConfirmed = false } = {}) {
  const { basics, location, details, photos } = sections
  const draft = { basics, location, details, photos }
  return {
    version,
    sections: draft,
    record: listingFromDraft(listingId, draft),
    // The admin ticked "this is the right place" — the server refuses a save
    // that moves the pin without it (LOCATION_UNCONFIRMED).
    ...(locationConfirmed ? { locationConfirmed: true } : {}),
  }
}

/**
 * Everything wrong with the form, by tab: { basics, location, photos,
 * details } of { field: message }. Format checks are the registration
 * form's own (venueValidation.fieldErrors); on top, a name, at least one
 * venue photo, a category and the Venue Timings are required. The server
 * checks all of it again.
 */
export function editErrors(sections) {
  const out = {
    basics: { ...fieldErrors('basics', sections.basics) },
    location: { ...fieldErrors('location', sections.location) },
    details: { ...fieldErrors('details', sections.details) },
    photos: {},
  }
  if (!str(sections.basics?.venueName).trim()) out.basics.venueName = 'Enter the venue name'
  if ((sections.photos?.venuePhotos || []).length === 0) out.photos.venuePhotos = 'Keep at least one venue photo'
  const conflict = pinConflict(sections.location)
  if (conflict) out.location.latitude = conflict
  // Edits never require fields a registration only asks for at submit
  // (e.g. a Google Maps link on an older venue) — just valid formats.
  for (const tab of ['basics', 'location']) {
    for (const [key, message] of Object.entries(out[tab])) {
      if (/required|Enter |Add /i.test(message) && !str(sections[tab]?.[key]).trim() && !(tab === 'basics' && key === 'venueName')) {
        delete out[tab][key]
      }
    }
  }
  return out
}

/** The first tab with a problem, or ''. */
export function firstInvalidTab(errors) {
  return EDIT_TABS.find((t) => Object.keys(errors[t.key] || {}).length > 0)?.key || ''
}


// ---- Map location (the pin customers' distances are measured from) -------

const EARTH_RADIUS_KM = 6371
// Two pins closer than this are the same place — the server's SAME_PLACE_KM.
export const SAME_PLACE_KM = 0.1
// The wizard's / server's generous box around India (venues/draft_validation.py).
const INDIA = { lat: [6, 38], lng: [68, 98] }

const finite = (v) => String(v ?? '').trim() !== '' && Number.isFinite(Number(v))

/** A {lat, lng} the server would accept, or null. */
export function validPoint(lat, lng) {
  if (!finite(lat) || !finite(lng)) return null
  const p = { lat: Number(lat), lng: Number(lng) }
  if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180 || (p.lat === 0 && p.lng === 0)) return null
  return p
}

export const inIndia = (p) => Boolean(p) && p.lat >= INDIA.lat[0] && p.lat <= INDIA.lat[1] && p.lng >= INDIA.lng[0] && p.lng <= INDIA.lng[1]

export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The exact pin the maps link itself carries, as {lat, lng}, or null. */
export function linkPin(mapsLink) {
  const text = exactPinCoords(mapsLink || '')
  if (!text) return null
  const [lat, lng] = text.split(',')
  return validPoint(lat, lng)
}

/** The typed latitude / longitude as {lat, lng}, or null. */
export const typedPin = (location = {}) => validPoint(location.latitude, location.longitude)

/** The pin this form will publish — the link's exact pin wins, as on the
 *  server (venues/geo.py record_pin) — or null. */
export const effectivePin = (location = {}) => linkPin(location.mapsLink) || typedPin(location)

/** An error when the typed pin disagrees with the link's own exact pin (the
 *  link's would silently win), else ''. */
export function pinConflict(location = {}) {
  const fromLink = linkPin(location.mapsLink)
  const typed = typedPin(location)
  if (!fromLink || !typed || distanceKm(fromLink, typed) <= SAME_PLACE_KM) return ''
  return 'The Google Maps link pins a different spot, and its pin is what customers see. Replace the link with this location’s map link, or clear the coordinates.'
}

/** True when the form's pin is not the saved one (added, moved or cleared). */
export function pinChanged(savedCoordinates, location) {
  const before = savedCoordinates ? validPoint(savedCoordinates.lat, savedCoordinates.lng) : null
  const after = effectivePin(location)
  if (!before || !after) return Boolean(before) !== Boolean(after)
  return distanceKm(before, after) > 0.001
}

const six = (n) => String(Math.round(Number(n) * 1e6) / 1e6)

/** A Google Maps link that pins exactly this point (the server and the
 *  customer app both read `query=lat,lng` as an exact pin). */
export const coordinateLink = (p) => `https://www.google.com/maps/search/?api=1&query=${six(p.lat)},${six(p.lng)}`

/**
 * Coordinates pasted by the admin: "17.3850, 78.4867", "17.385 78.486", or
 * a Google Maps link that carries a pin. → {lat, lng} | null (never a guess).
 */
export function parsePastedPin(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return linkPin(raw)
  const m = raw.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  return m ? validPoint(m[1], m[2]) : null
}

export const PIN_STATUS = {
  ok: { label: 'Pinned', tone: 'success' },
  missing: { label: 'No map location', tone: 'warning' },
  outside_india: { label: 'Pin outside India', tone: 'error' },
}

// ---- Photos ------------------------------------------------------------

/** `list` with the item `id` moved by `delta` places (clamped). */
export function movePhoto(list, id, delta) {
  const from = list.findIndex((p) => p.id === id)
  if (from < 0) return list
  const to = Math.max(0, Math.min(list.length - 1, from + delta))
  if (to === from) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** `list` with the item `id` first — the first venue photo is the cover. */
export const makeCover = (list, id) => movePhoto(list, id, -list.length)

/** Photos on the saved form that the edited form no longer has. */
export function removedPhotos(savedSections, sections) {
  const keep = new Set(Object.values(sections?.photos || {}).flat().map((p) => p?.url))
  const out = []
  for (const [gallery, items] of Object.entries(savedSections?.photos || {})) {
    for (const p of items || []) if (p?.url && !keep.has(p.url)) out.push({ gallery, url: p.url })
  }
  return out
}

/**
 * What the confirmation before saving should spell out: the changes that
 * customers notice most or that are hard to spot afterwards. → [string]
 */
export function majorChanges(saved, sections, savedCoordinates) {
  const out = []
  const name = (s) => str(s?.basics?.venueName).trim()
  if (name(saved) !== name(sections)) out.push(`Name: “${name(saved)}” → “${name(sections)}”`)
  const type = (s) => str(s?.details?.primaryCategory === OTHERS ? s?.details?.customCategory : s?.details?.primaryCategory)
  if (type(saved) !== type(sections)) out.push(`Category: ${type(saved) || '—'} → ${type(sections) || '—'}`)
  if (pinChanged(savedCoordinates, sections.location)) {
    const p = effectivePin(sections.location)
    out.push(p ? `Map location set to ${six(p.lat)}, ${six(p.lng)}` : 'Map location removed — the venue will show under “Distance unknown”')
  }
  const cover = (s) => s?.photos?.venuePhotos?.[0]?.url || ''
  if (cover(saved) !== cover(sections)) out.push('A different cover photo')
  const removed = removedPhotos(saved, sections).length
  if (removed) out.push(`${removed} photo${removed === 1 ? '' : 's'} removed (kept in the change history)`)
  return out
}

/** Identifies the pin the form will publish ('none' when it has none) — the
 *  admin's confirmation is tied to it, so moving the pin again un-confirms. */
export function pinKey(location) {
  const p = effectivePin(location)
  return p ? `${six(p.lat)}, ${six(p.lng)}` : 'none'
}
