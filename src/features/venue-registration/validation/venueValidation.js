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

import { PLAYZONE_SPORTS } from '@/constants/venue';
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
} from '@/utils/validation';

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

export function locationErrors(l = {}) {
  return clean({
    houseStreet: !truthy(l.houseStreet) ? 'Street address is required' : null,
    pincode: validatePincode(l.pincode, { required: true }),
    stateName: !truthy(l.stateName) ? 'State is required' : null,
    mapsLink: validateMapsLink(l.mapsLink, { required: true }),
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
  });
}

export function detailsErrors(d = {}) {
  const isPlayzone = d.primaryCategory === 'Playzone';
  const errors = {
    primaryCategory: !truthy(d.primaryCategory) ? 'Select a primary category' : null,
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
  location: ['houseStreet', 'pincode', 'stateName', 'mapsLink'],
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
      const e = detailsErrors(d);
      const capOk = isPlayzone ? !e.seatingCapacity : !e.capacity;
      // Non-Playzone pricing: the per-unit price AND at least one pricing
      // package (name + price) are required — the backend's submit gate
      // demands a package. Playzone needs at least one sport selected.
      const priced = isPlayzone ? PLAYZONE_SPORTS.some((s) => d.sports?.[s]) : !e.price;
      const packaged = isPlayzone || hasValidPackage(d);
      return capOk && priced && packaged && (d.amenities || []).length > 0;
    }
    case 4: {
      const e = payoutErrors(draft.payout);
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
    if (!truthy(l.mapsLink)) m.push('Google Maps link');
  } else if (stepIndex === 2) {
    if ((draft.photos?.venuePhotos || []).length === 0) m.push('At least one venue photo');
  } else if (stepIndex === 3) {
    if (!truthy(d.primaryCategory)) m.push('Primary category');
    const capMissing = isPlayzone
      ? !truthy(d.seatingCapacity)
      : !truthy((d.screenConfig?.[0] || {}).max);
    if (capMissing) m.push(isPlayzone ? 'On-site capacity' : 'Capacity (max persons)');
    const pricedMissing = isPlayzone
      ? !PLAYZONE_SPORTS.some((s) => d.sports?.[s])
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
