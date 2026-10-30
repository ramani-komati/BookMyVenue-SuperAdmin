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
export function editRequest(listingId, sections, version) {
  const { basics, location, details, photos } = sections
  const draft = { basics, location, details, photos }
  return {
    version,
    sections: draft,
    record: listingFromDraft(listingId, draft),
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
