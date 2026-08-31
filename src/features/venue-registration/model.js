/**
 * Venue draft domain model.
 *
 * State is deliberately split into the same sections the wizard uses
 * (basics / location / details / payout) plus a photos bucket. This mirrors
 * how the tabs are organised and how patchDraft(draftId, section, data) sends
 * only the section that changed.
 */

import { PLAYZONE_SPORTS } from '@/constants/venue';

export const blankBasics = () => ({
  venueName: '',
  shortDescription: '',
  phone: '',
  email: '',
});

export const blankLocation = () => ({
  houseStreet: '',
  area: '',
  district: '',
  pincode: '',
  city: '',
  stateName: '',
  mapsLink: '',
});

export const blankDetails = () => ({
  primaryCategory: '',
  subCategories: {},
  sports: {},
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
    truthy(l.mapsLink),
    // Photos
    (ph.venuePhotos || []).length > 0,
    // Details
    truthy(d.primaryCategory),
    isPlayzone ? truthy(d.seatingCapacity) : truthy((d.screenConfig?.[0] || {}).max),
    (d.amenities || []).length > 0,
    isPlayzone
      ? PLAYZONE_SPORTS.some((s) => d.sports?.[s])
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
