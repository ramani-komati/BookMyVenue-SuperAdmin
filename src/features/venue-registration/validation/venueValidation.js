/**
 * Venue registration validation.
 *
 * Two layers:
 *  - fieldErrors(section, data): full format validation for inline messages
 *    (email, phone, pincode, PAN, IFSC, account no., UPI, maps URL, numbers…).
 *  - stepValid / missingFor / canReach: step-gating that decides whether the
 *    user can advance. Gating mirrors the source design's required (*) fields
 *    but additionally blocks on invalid formats, per the project rules.
 */

import { draftGroup } from '../../../constants/categories.js';
import { GSTIN_RE, offeringErrors, offeringKindOf, offeringMissing } from '../offerings/model.js';
import { timingsErrors } from '../../../utils/venueTimings.js';
import { selectedSports } from '../../../constants/subcategories.js';
import { findDistrict, findState, pincodeError } from '../../../utils/indiaRegions.js';
import {
  validateAccountNumber,
  validateAmount,
  validateEmail,
  validateIfsc,
  validateMapsLink,
  validatePan,
  validatePhone,
  validatePincode,
  validateUpi,
  validateVenueName,
  validateWholeNumber,
  validateDescription,
} from '../../../utils/validation.js';

const truthy = (x) => x != null && String(x).trim() !== '';
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));

// ---- Per-section field errors (for inline display) ------------------------

export function basicsErrors(b = {}) {
  return clean({
    venueName: validateVenueName(b.venueName),
    shortDescription: validateDescription(b.shortDescription, 10),
    phone: validatePhone(b.phone, { required: true, label: 'Contact phone' }),
    email: validateEmail(b.email, { required: false }),
  });
}

// India's extent (with a margin) — the backend applies the same bounds.
const INDIA_LAT = [6, 38];
const INDIA_LNG = [68, 98];

/** The optional map pin: both halves or neither, inside India. */
function mapPinErrors(l) {
  const lat = String(l.latitude ?? '').trim();
  const lng = String(l.longitude ?? '').trim();
  if (!lat && !lng) return {};
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!lat || !Number.isFinite(nLat)) return { latitude: 'Enter a latitude, e.g. 17.385044' };
  if (!lng || !Number.isFinite(nLng)) return { longitude: 'Enter a longitude, e.g. 78.486671' };
  if (nLat < INDIA_LAT[0] || nLat > INDIA_LAT[1] || nLng < INDIA_LNG[0] || nLng > INDIA_LNG[1]) {
    return { latitude: 'This point is outside India — check the latitude and longitude' };
  }
  return {};
}

export function locationErrors(l = {}) {
  const state = findState(l.stateName);
  let stateName = null;
  if (!truthy(l.stateName)) stateName = 'State is required';
  else if (!state) stateName = 'Choose a state or union territory from the list';
  let district = null;
  if (!truthy(l.district)) district = 'District is required';
  else if (state && !findDistrict(state.name, l.district)) district = `Choose a district in ${state.name}`;
  const pinFormat = validatePincode(l.pincode, { required: true });
  return clean({
    houseStreet: !truthy(l.houseStreet) ? 'Street address is required' : null,
    pincode: pinFormat || pincodeError(l.pincode, state?.name),
    stateName,
    district,
    city: !truthy(l.city) ? 'City / town is required' : null,
    mapsLink: validateMapsLink(l.mapsLink, { required: true }),
    ...mapPinErrors(l),
  });
}

export function payoutErrors(p = {}) {
  return clean({
    acctHolder: !truthy(p.acctHolder) ? 'Account holder name is required' : null,
    bankName: !truthy(p.bankName) ? 'Bank name is required' : null,
    acctNumber: validateAccountNumber(p.acctNumber, { required: true }),
    ifsc: validateIfsc(p.ifsc, { required: true }),
    payoutPhone: validatePhone(p.payoutPhone, { required: true, label: 'Payout phone' }),
    upiId: validateUpi(p.upiId, { required: false }),
    pan: validatePan(p.pan, { required: false }),
    // Optional business document (Resort / Big Screen Surprise forms).
    gstin: truthy(p.gstin) && !GSTIN_RE.test(String(p.gstin).trim()) ? 'Enter a valid 15-character GSTIN' : null,
  });
}

/** Fitness / Resort / Big Screen Surprise owners accept the platform
 *  commission and terms with their bank details. */
const needsTermsAgreement = (draft) => Boolean(offeringKindOf(draft?.details?.primaryCategory));

export function detailsErrors(d = {}) {
  // Fitness / Resort / Big Screen Surprise: their own form and rules
  // (offerings/model.js) — no per-unit capacity or price.
  if (offeringKindOf(d.primaryCategory)) {
    return clean({
      primaryCategory: !truthy(d.primaryCategory) ? 'Select a primary category' : null,
      ...timingsErrors(d),
      ...offeringErrors(d),
    });
  }
  const isPlayzone = d.primaryCategory === 'Playzone';
  const errors = {
    // Celebrate needs its venue type (Private Hall / Private Theatre / Open
    // Air Theatre) as well; every other category has exactly one.
    primaryCategory: !truthy(d.primaryCategory)
      ? (draftGroup(d) ? 'Select the venue type' : 'Select a primary category')
      : null,
    // Venue Timings (every category) — open + close time, or open 24 hours.
    ...timingsErrors(d),
    // "Others" (a vendor-registered venue being edited) needs its typed name.
    customCategory:
      d.primaryCategory === 'Others' && !truthy(d.customCategory) ? 'Enter the category name' : null,
  };
  if (isPlayzone) {
    errors.seatingCapacity = validateWholeNumber(d.seatingCapacity, {
      required: true,
      label: 'On-site capacity',
      min: 1,
    });
  } else if (truthy(d.primaryCategory)) {
    const first = d.screenConfig?.[0] || {};
    errors.capacity = validateWholeNumber(first.max, { required: true, label: 'Max persons', min: 1 });
    errors.price = validateAmount(first.price, { required: true, label: 'Price' });
  }
  if (truthy(d.extraPersonPrice)) {
    errors.extraPersonPrice = validateAmount(d.extraPersonPrice, { label: 'Extra person price' });
  }
  if (truthy(d.extraHourPrice)) {
    errors.extraHourPrice = validateAmount(d.extraHourPrice, { label: 'Extra hour price' });
  }
  return clean(errors);
}

export function photosErrors(photos = {}) {
  return clean({
    venuePhotos: (photos.venuePhotos || []).length === 0 ? 'Add at least one venue photo' : null,
  });
}

/** Inline errors for a given patch section (photos handled separately). */
export function fieldErrors(section, data) {
  switch (section) {
    case 'basics':
      return basicsErrors(data);
    case 'location':
      return locationErrors(data);
    case 'details':
      return detailsErrors(data);
    case 'payout':
      return payoutErrors(data);
    default:
      return {};
  }
}

// ---- Step gating ----------------------------------------------------------

const REQUIRED_KEYS = {
  basics: ['venueName', 'phone'],
  location: ['houseStreet', 'pincode', 'stateName', 'district', 'city', 'mapsLink', 'latitude', 'longitude'],
  payout: ['acctHolder', 'bankName', 'acctNumber', 'ifsc', 'payoutPhone'],
};

/** At least one pricing package with a name and a price (non-Playzone). */
const hasValidPackage = (d = {}) =>
  (d.packages || []).some((pk) => truthy(pk?.label) && truthy(pk?.price));

/** True when the step's required fields are present and validly formatted. */
export function stepValid(stepIndex, draft) {
  const d = draft.details || {};
  const isPlayzone = d.primaryCategory === 'Playzone';

  switch (stepIndex) {
    case 0: {
      const e = basicsErrors(draft.basics);
      return REQUIRED_KEYS.basics.every((k) => !e[k]);
    }
    case 1: {
      const e = locationErrors(draft.location);
      return REQUIRED_KEYS.location.every((k) => !e[k]);
    }
    case 2:
      return (draft.photos?.venuePhotos || []).length > 0;
    case 3: {
      if (!truthy(d.primaryCategory)) return false;
      if (Object.keys(timingsErrors(d)).length > 0) return false;
      if (offeringKindOf(d.primaryCategory)) return Object.keys(offeringErrors(d)).length === 0;
      if (d.primaryCategory === 'Others' && !truthy(d.customCategory)) return false;
      const e = detailsErrors(d);
      const capOk = isPlayzone ? !e.seatingCapacity : !e.capacity;
      // Non-Playzone pricing: the per-unit price AND at least one pricing
      // package (name + price) are required — the backend's submit gate
      // demands a package. Playzone needs at least one sport selected.
      const priced = isPlayzone ? selectedSports(d).length > 0 : !e.price;
      const packaged = isPlayzone || hasValidPackage(d);
      return capOk && priced && packaged && (d.amenities || []).length > 0;
    }
    case 4: {
      const e = payoutErrors(draft.payout);
      if (e.gstin) return false;
      if (needsTermsAgreement(draft) && draft.payout?.agreedToTerms !== true) return false;
      return REQUIRED_KEYS.payout.every((k) => !e[k]);
    }
    default:
      return true;
  }
}

/** Human-readable list of what's still missing on a step. */
export function missingFor(stepIndex, draft) {
  const b = draft.basics || {};
  const l = draft.location || {};
  const d = draft.details || {};
  const p = draft.payout || {};
  const isPlayzone = d.primaryCategory === 'Playzone';
  const m = [];

  if (stepIndex === 0) {
    if (!truthy(b.venueName)) m.push('Venue name');
    if (!truthy(b.phone)) m.push('Contact phone');
  } else if (stepIndex === 1) {
    if (!truthy(l.houseStreet)) m.push('Street address');
    if (!truthy(l.pincode)) m.push('Pincode');
    if (!truthy(l.stateName)) m.push('State');
    if (!truthy(l.district)) m.push('District');
    if (!truthy(l.city)) m.push('City / Town');
    if (!truthy(l.mapsLink)) m.push('Google Maps link');
  } else if (stepIndex === 2) {
    if ((draft.photos?.venuePhotos || []).length === 0) m.push('At least one venue photo');
  } else if (stepIndex === 3) {
    if (!truthy(d.primaryCategory)) m.push(draftGroup(d) ? 'Venue type' : 'Primary category');
    if (Object.keys(timingsErrors(d)).length > 0) m.push('Venue timings (open and close time, or Open 24 hours)');
    if (offeringKindOf(d.primaryCategory)) return [...m, ...offeringMissing(d)];
    const capMissing = isPlayzone
      ? !truthy(d.seatingCapacity)
      : !truthy((d.screenConfig?.[0] || {}).max);
    if (capMissing) m.push(isPlayzone ? 'On-site capacity' : 'Capacity (max persons)');
    const pricedMissing = isPlayzone
      ? selectedSports(d).length === 0
      : !truthy((d.screenConfig?.[0] || {}).price);
    if (pricedMissing) m.push(isPlayzone ? 'At least one sport' : 'Price');
    if (!isPlayzone && !hasValidPackage(d)) m.push('At least one pricing package (name + price)');
    if ((d.amenities || []).length === 0) m.push('At least one amenity');
  } else if (stepIndex === 4) {
    if (!truthy(p.acctHolder)) m.push('Account holder name');
    if (!truthy(p.bankName)) m.push('Bank name');
    if (!truthy(p.acctNumber)) m.push('Account number');
    if (!truthy(p.ifsc)) m.push('IFSC code');
    if (!truthy(p.payoutPhone)) m.push('Payout phone');
    if (needsTermsAgreement(draft) && p.agreedToTerms !== true) m.push('Agreement to the platform commission and terms');
    if (payoutErrors(p).gstin) m.push('A valid GSTIN (entered on the Details step)');
  }
  return m;
}

/** Every earlier step must be valid before a later one can be reached. */
export function canReach(stepIndex, draft) {
  for (let j = 0; j < stepIndex; j += 1) {
    if (!stepValid(j, draft)) return false;
  }
  return true;
}

/** All five steps valid — the final submit gate. */
export function allValid(draft) {
  return [0, 1, 2, 3, 4].every((i) => stepValid(i, draft));
}
