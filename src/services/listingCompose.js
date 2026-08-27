/**
 * listingCompose — maps a submitted registration draft to a browsable venue
 * listing record. Ported verbatim from the customer app's vendorApi.js
 * (categoryFromDraft / priceFromDraft / detailFromDraft / listingFromDraft) so
 * an admin-registered venue is byte-identical to a vendor-registered one.
 *
 * The super-admin app has no mock layer, so USE_MOCK is always false here (the
 * photo gallery is never truncated for a localStorage quota).
 */

import { PLAYZONE_SPORTS, ADDONS, CAT_UNIT } from '@/constants/venue'

const USE_MOCK = false

const CATEGORY_MAP = {
  'Private Hall': 'Party hall',
  'Private Theatre': 'Private theatre',
  'Open Theatre': 'Private theatre',
  Resort: 'Resort',
  Playzone: 'Play zone',
  Playstation: 'Playstation',
}

// A Playzone offering a single sport browses under that sport's own category.
const SPORT_CATEGORY = {
  'Box Cricket': 'Box cricket',
  'Swimming Pool': 'Swimming pool',
  Pickleball: 'Pickleball',
}

function categoryFromDraft(details = {}) {
  if (details.primaryCategory === 'Playzone') {
    const chosen = PLAYZONE_SPORTS.filter((s) => details.sports?.[s])
    if (chosen.length === 1 && SPORT_CATEGORY[chosen[0]]) return SPORT_CATEGORY[chosen[0]]
    return 'Play zone'
  }
  return CATEGORY_MAP[details.primaryCategory] || details.primaryCategory || 'Party hall'
}

const UNIT_MAP = {
  'Private Hall': '/ slot',
  'Private Theatre': '/ show',
  'Open Theatre': '/ show',
  Resort: '/ day',
  Playzone: '/ hour',
  Playstation: '/ hour',
}

/** Best displayable starting price from whichever pricing model the draft used. */
function priceFromDraft(details = {}) {
  const positives = (arr) => arr.map((v) => parseFloat(v)).filter((n) => Number.isFinite(n) && n > 0)
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
export function detailFromDraft(basics = {}, location = {}, details = {}) {
  const isPlayzone = details.primaryCategory === 'Playzone'
  const addons = [
    ...ADDONS.filter((a) => details.addons?.[a.key]).map((a) => ({
      name: a.label,
      price: details.addonPrices?.[a.key] || '',
    })),
    ...(details.customAddons || []).filter((c) => c?.name?.trim()).map((c) => ({ name: c.name, price: c.price || '' })),
  ]
  const unitCount = isPlayzone ? 1 : Math.max(1, Math.min(20, parseInt(details.numScreens || '1', 10) || 1))
  return {
    description: details.fullDescription?.trim() || basics.shortDescription?.trim() || '',
    paused: Boolean(details.paused),
    pauseReason: details.paused ? String(details.pauseReason || '').trim() : '',
    amenities: Array.isArray(details.amenities) ? details.amenities : [],
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
      ? PLAYZONE_SPORTS.filter((s) => details.sports?.[s]).map((s) => {
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
    extraPersonPrice: details.extraPersonPrice || '',
    maxExtraPersons: details.maxExtraPersons || '',
    contactPhone: basics.phone || '',
    address: [location.houseStreet, location.area, location.city, location.stateName, location.pincode]
      .map((x) => x?.trim?.())
      .filter(Boolean)
      .join(', '),
    mapsLink: location.mapsLink || '',
  }
}

/** Map a submitted registration draft to a browsable venue listing record. */
export function listingFromDraft(draftId, draft) {
  const { basics = {}, location = {}, details = {}, photos = {} } = draft || {}
  const city = location.city?.trim() || location.district?.trim() || 'Warangal'
  const locality = location.area?.trim() || location.district?.trim() || city
  const urls = [
    ...(photos.venuePhotos || []).map((p) => p?.url),
    ...(photos.serviceImages || []).map((p) => p?.url),
  ].filter(Boolean)
  const gallery = USE_MOCK ? urls.slice(0, 4) : urls
  return {
    id: draftId || `listing_${Date.now().toString(36)}`,
    name: basics.venueName?.trim() || 'Untitled venue',
    category: categoryFromDraft(details),
    locality,
    city,
    district: location.district?.trim() || '',
    location: locality === city ? city : `${locality}, ${city}`,
    price: priceFromDraft(details) || '499',
    unit: UNIT_MAP[details.primaryCategory] || '/ slot',
    meta: 'New',
    image: gallery[0] || null,
    gallery,
    // NEW listings publish as pending; the panel flips this to "live" straight
    // after, so an admin-registered venue skips the approval queue.
    status: 'pending',
    submittedAt: new Date().toISOString(),
    paused: Boolean(details.paused),
    pauseReason: details.paused ? String(details.pauseReason || '').trim() : '',
    detail: detailFromDraft(basics, location, details),
  }
}
