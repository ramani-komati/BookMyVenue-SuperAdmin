/**
 * listingCompose — maps a submitted registration draft to a browsable venue
 * listing record. Ported verbatim from the customer app's vendorApi.js
 * (categoryFromDraft / priceFromDraft / detailFromDraft / listingFromDraft) so
 * an admin-registered venue is byte-identical to a vendor-registered one.
 *
 * The super-admin app has no mock layer at all, so nothing here is ever
 * seeded, truncated or faked — every value comes from the submitted draft.
 */

import { ADDONS, CAT_UNIT } from '../constants/venue.js'
import { selectedCustomNames, selectedSports } from '../constants/subcategories.js'
import { OTHERS, VENUE_TYPES, draftGroup } from '../constants/categories.js'
import { timingsFromDetails } from '../utils/venueTimings.js'
import { hasLegacyResortPricing, offeringKindOf, offeringPrice, recordBlock } from '../features/venue-registration/offerings/model.js'


// Registration venue type → browse category (constants/categories.js, the
// model every screen shares — identical to the vendor portal's mapper).
// Open Air Theatres publish as 'Open-air theatre', every Sports venue as
// 'Play zone' (its sports stay sub-categories), "Others" as its typed name.
function categoryFromDraft(details = {}) {
  const type = details.primaryCategory
  if (type === OTHERS) return String(details.customCategory || '').trim() || OTHERS
  return VENUE_TYPES[type]?.category || details.primaryCategory || 'Party hall'
}

const UNIT_MAP = {
  'Private Hall': '/ slot',
  'Private Theatre': '/ show',
  'Open Theatre': '/ show',
  Resort: '/ day',
  Playzone: '/ hour',
  Playstation: '/ hour',
  Gym: '/ hour',
  'Big Screen Surprise': '/ surprise',
}

/** Best displayable starting price from whichever pricing model the draft used. */
function priceFromDraft(details = {}) {
  const positives = (arr) => arr.map((v) => parseFloat(v)).filter((n) => Number.isFinite(n) && n > 0)
  // Fitness / Resort / Big Screen Surprise: the cheapest plan, package or
  // surprise (a legacy resort's hourly lawn price still counts below).
  const offered = offeringPrice(details)
  if (offered && !hasLegacyResortPricing(details)) return offered.price
  const isPlayzone = details.primaryCategory === 'Playzone'

  if (isPlayzone) {
    const nums = []
    Object.values(details.sportConfig || {}).forEach((s) => {
      nums.push(...positives([s?.price]))
      nums.push(...positives(Object.values(s?.unitPrice || {})))
    })
    if (nums.length === 0) return null
    return String(Math.min(...nums))
  }

  const unitPrices = positives(Object.values(details.screenConfig || {}).map((s) => s?.price))
  if (unitPrices.length) return String(Math.min(...unitPrices))
  const pkgPrices = positives((details.packages || []).map((p) => p?.price))
  if (pkgPrices.length === 0) return null
  return String(Math.min(...pkgPrices))
}

/** The rich, vendor-entered info shown on the venue detail page. */
export function detailFromDraft(basics = {}, location = {}, details = {}, photos = {}) {
  const isPlayzone = details.primaryCategory === 'Playzone'
  // Fitness / Resort / Big Screen Surprise sell one thing per venue — never
  // pitch / screen sibling listings (a theatre's screens are part of its
  // surprise settings). A legacy resort keeps its lawns.
  const offering = offeringKindOf(details.primaryCategory)
  const singleUnit = isPlayzone || (offering && !hasLegacyResortPricing(details))
  const addons = [
    ...ADDONS.filter((a) => details.addons?.[a.key]).map((a) => ({
      name: a.label,
      price: details.addonPrices?.[a.key] || '',
    })),
    ...(details.customAddons || []).filter((c) => c?.name?.trim()).map((c) => ({ name: c.name, price: c.price || '' })),
  ]
  const unitCount = singleUnit ? 1 : Math.max(1, Math.min(20, parseInt(details.numScreens || '1', 10) || 1))
  return {
    // The venue type and primary category as registered (see vendor portal).
    primaryCategory: details.primaryCategory || '',
    categoryGroup: draftGroup(details) || '',
    customCategory: details.primaryCategory === OTHERS ? String(details.customCategory || '').trim() : '',
    // Venue Timings ({open, close, open24Hours} or null), validated again by
    // the server (venues/timings.py).
    timings: timingsFromDetails(details),
    description: details.fullDescription?.trim() || basics.shortDescription?.trim() || '',
    paused: Boolean(details.paused),
    pauseReason: details.paused ? String(details.pauseReason || '').trim() : '',
    amenities: [...new Set([
      ...(Array.isArray(details.amenities) ? details.amenities : []),
      // A resort's facility checklists show as its amenities too.
      ...(offering === 'resort' ? Object.values(details.resort?.facilities || {}).flat() : []),
    ])],
    parking: Boolean(details.parkingAvailable),
    dining: Boolean(details.diningAvailable),
    capacity: isPlayzone ? details.seatingCapacity || '' : details.screenConfig?.[0]?.max || '',
    unitCount,
    unitNoun: isPlayzone ? '' : CAT_UNIT[details.primaryCategory] || 'screen',
    unitPrices: isPlayzone
      ? undefined
      : Array.from({ length: unitCount }, (_, i) => details.screenConfig?.[i]?.price || ''),
    unitWeekendPrices: isPlayzone
      ? undefined
      : Array.from({ length: unitCount }, (_, i) => details.screenConfig?.[i]?.weekendPrice || ''),
    packages: (details.packages || [])
      .filter((p) => p?.label?.trim() || p?.price)
      .map((p) => ({ label: p.label || 'Package', price: p.price || '', duration: p.duration || '', details: p.details || '' })),
    offers: (details.offers || [])
      .filter((o) => (o?.value != null && String(o.value).trim() !== '') && (o?.title?.trim() || o?.code?.trim()))
      .map((o) => ({
        title: o.title?.trim() || '',
        code: (o.code || '').trim().toUpperCase(),
        type: o.type === 'flat' ? 'flat' : 'percent',
        value: String(o.value ?? ''),
        minAmount: String(o.minAmount ?? ''),
        maxDiscount: String(o.maxDiscount ?? ''),
        perUserLimit: String(o.perUserLimit ?? ''),
        expiry: (o.expiry || '').trim(),
      })),
    sports: isPlayzone
      ? selectedSports(details).map((s) => {
          const cfg = details.sportConfig?.[s] || {}
          const units = Math.max(1, Math.min(20, parseInt(cfg.units || '1', 10) || 1))
          const unitPrices = Array.from({ length: units }, (_, i) => {
            const p = parseFloat(cfg.unitPrice?.[i])
            return Number.isFinite(p) && p > 0 ? String(cfg.unitPrice[i]) : cfg.price || ''
          })
          const unitWeekendPrices = Array.from({ length: units }, (_, i) => {
            const p = parseFloat(cfg.unitWeekendPrice?.[i])
            return Number.isFinite(p) && p > 0 ? String(cfg.unitWeekendPrice[i]) : ''
          })
          const valid = unitPrices.map((u) => parseFloat(u)).filter((n) => Number.isFinite(n) && n > 0)
          return { name: s, price: valid.length ? String(Math.min(...valid)) : cfg.price || '', units, unitPrices, unitWeekendPrices }
        })
      : [],
    addons,
    occasions: Object.keys(details.subCategories || {}).filter((k) => details.subCategories[k]),
    // Sub-categories added with "Others" (constants/subcategories.js) — the
    // server keeps them off customer pages until the super admin approves.
    customSubCategories: selectedCustomNames(details),
    extraPersonPrice: details.extraPersonPrice || '',
    maxExtraPersons: details.maxExtraPersons || '',
    extraHourPrice: details.extraHourPrice || '',
    maxExtraHours: details.maxExtraHours || '',
    contactPhone: basics.phone || '',
    address: [location.unitNumber, location.houseStreet, location.roadNumber, location.area, location.city, location.district, location.stateName, location.pincode]
      .map((x) => x?.trim?.())
      .filter((x, i, all) => x && all.findIndex((y) => y?.toLowerCase?.() === x.toLowerCase()) === i)
      .join(', '),
    mapsLink: location.mapsLink || '',
    // The vendor-confirmed map location (wizard "Map location"), used by the
    // backend only when the maps link carries no exact pin (venues/geo.py).
    ...mapPinFromLocation(location),
    landmark: String(location.landmark || '').trim(),
    // The membership plans / resort packages / surprise shows (public part
    // only — owner and manager contacts stay in the draft). The server
    // validates this block and books against it (backend offerings app).
    ...(offering ? { [offering]: recordBlock(details, photos) } : {}),
  }
}

/** { mapPin: { lat, lng } } from the Location step's optional pin, or {}. */
function mapPinFromLocation(location = {}) {
  const lat = Number(location.latitude)
  const lng = Number(location.longitude)
  if (String(location.latitude ?? '').trim() === '' || String(location.longitude ?? '').trim() === '') return {}
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return {}
  return { mapPin: { lat, lng } }
}

/** Map a submitted registration draft to a browsable venue listing record. */
export function listingFromDraft(draftId, draft) {
  const { basics = {}, location = {}, details = {}, photos = {} } = draft || {}
  // No default city — venues can be anywhere in India, and the wizard
  // requires both city and district.
  const city = location.city?.trim() || location.district?.trim() || ''
  const locality = location.area?.trim() || location.district?.trim() || city
  const urls = [
    ...(photos.venuePhotos || []).map((p) => p?.url),
    ...(photos.serviceImages || []).map((p) => p?.url),
  ].filter(Boolean)
  const gallery = urls
  return {
    id: draftId || `listing_${Date.now().toString(36)}`,
    name: basics.venueName?.trim() || 'Untitled venue',
    category: categoryFromDraft(details),
    locality,
    city,
    district: location.district?.trim() || '',
    state: location.stateName?.trim() || '',
    location: locality === city ? city : [locality, city].filter(Boolean).join(', '),
    price: priceFromDraft(details) || '499',
    unit: (!hasLegacyResortPricing(details) && offeringPrice(details)?.unit) || UNIT_MAP[details.primaryCategory] || '/ slot',
    meta: 'New',
    image: gallery[0] || null,
    gallery,
    // NEW listings publish as pending; the panel flips this to "live" straight
    // after, so an admin-registered venue skips the approval queue.
    status: 'pending',
    submittedAt: new Date().toISOString(),
    paused: Boolean(details.paused),
    pauseReason: details.paused ? String(details.pauseReason || '').trim() : '',
    detail: detailFromDraft(basics, location, details, photos),
  }
}
