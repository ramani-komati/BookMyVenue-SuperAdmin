/**
 * Venue draft domain model.
 *
 * State is deliberately split into the same sections the wizard uses
 * (basics / location / details / payout) plus a photos bucket. This mirrors
 * how the tabs are organised and how patchDraft(draftId, section, data) sends
 * only the section that changed.
 */

import { selectedSports } from '../../constants/subcategories.js';

export const blankBasics = () => ({
  venueName: '',
  shortDescription: '',
  phone: '',
  email: '',
});

export const blankLocation = () => ({
  // Anywhere in India: stateName and district use the names in
  // utils/indiaRegions.js; city / area are free text (with suggestions).
  country: 'India',
  houseStreet: '',
  area: '',
  district: '',
  pincode: '',
  city: '',
  stateName: '',
  mapsLink: '',
  // Optional address extras (Fitness / Resort / Big Screen Surprise forms).
  unitNumber: '',
  roadNumber: '',
  landmark: '',
  // Optional map pin (strings, 6 decimals) — used only when the maps link
  // carries no exact pin; the backend reads it as detail.mapPin.
  latitude: '',
  longitude: '',
});

export const blankDetails = () => ({
  // The VENUE TYPE ('Private Hall', 'Playzone', …) — see constants/categories.js.
  primaryCategory: '',
  // The primary category it was chosen under ('celebrate', 'sports', …).
  categoryGroup: '',
  // Free-text category name, used only when primaryCategory === 'Others'
  // (a vendor-registered venue the super admin edits).
  customCategory: '',
  // Venue Timings (utils/venueTimings.js): "HH:MM" each, or open 24 hours.
  openTime: '',
  closeTime: '',
  open24Hours: false,
  subCategories: {},
  sports: {},
  // Names added with the "Others" option (constants/subcategories.js) — also
  // ticked in subCategories / sports. The server records these on submit.
  customSubCategories: [],
  seatingCapacity: '',
  floatingCapacity: '',
  numScreens: '1',
  screenConfig: {},
  amenities: [],
  parkingAvailable: false,
  diningAvailable: false,
  extraPersonPrice: '',
  maxExtraPersons: '',
  extraHourPrice: '',
  maxExtraHours: '',
  packages: [],
  offers: [],
  sportPricing: {},
  sportConfig: {},
  fullDescription: '',
  autoDescription: true,
  addons: {},
  addonPrices: {},
  customAddons: [],
});

export const blankPayout = () => ({
  acctHolder: '',
  bankName: '',
  acctNumber: '',
  ifsc: '',
  payoutPhone: '',
  upiId: '',
  pan: '',
});

export const blankPhotos = () => ({
  venuePhotos: [],
  serviceImages: [],
  // Big Screen Surprise → Media & Branding (optional).
  auditoriumImages: [],
  screenImages: [],
  theatreLogo: [],
});

/** A complete, empty draft split by section. */
export const blankDraft = () => ({
  basics: blankBasics(),
  location: blankLocation(),
  details: blankDetails(),
  payout: blankPayout(),
  photos: blankPhotos(),
});

/** Section keys that are patched via patchDraft (photos are excluded). */
export const PATCH_SECTIONS = ['basics', 'location', 'details', 'payout'];

const truthy = (x) => x != null && String(x).trim() !== '';

/**
 * computeCompletion — 0–100 overall progress across the whole draft.
 * Matches the source design's 16 weighted checks. In production the backend
 * owns this number and returns it from patchDraft/uploadPhoto; the mock API
 * calls this to simulate that.
 */
export function computeCompletion(draft) {
  const b = draft.basics || {};
  const l = draft.location || {};
  const d = draft.details || {};
  const p = draft.payout || {};
  const ph = draft.photos || {};
  const isPlayzone = d.primaryCategory === 'Playzone';

  const checks = [
    // Basics
    truthy(b.venueName),
    truthy(b.phone),
    // Location
    truthy(l.houseStreet),
    truthy(l.pincode),
    truthy(l.stateName),
    truthy(l.district),
    truthy(l.city),
    truthy(l.mapsLink),
    // Photos
    (ph.venuePhotos || []).length > 0,
    // Details
    truthy(d.primaryCategory),
    isPlayzone ? truthy(d.seatingCapacity) : truthy((d.screenConfig?.[0] || {}).max),
    (d.amenities || []).length > 0,
    isPlayzone
      ? selectedSports(d).length > 0
      : truthy((d.screenConfig?.[0] || {}).price) || (d.packages || []).length > 0,
    // Payout
    truthy(p.acctHolder),
    truthy(p.bankName),
    truthy(p.acctNumber),
    truthy(p.ifsc),
    truthy(p.payoutPhone),
  ];

  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
