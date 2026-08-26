/**
 * Venue draft model (ported from the customer app's venue-registration/model.js).
 * State is split into the same sections the backend patches:
 * basics / location / details / payout + a photos bucket.
 */

export const blankBasics = () => ({
  venueName: '',
  shortDescription: '',
  phone: '',
  email: '',
})

export const blankLocation = () => ({
  houseStreet: '',
  area: '',
  district: '',
  pincode: '',
  city: '',
  stateName: 'Telangana',
  mapsLink: '',
})

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
  packages: [],
  offers: [],
  sportPricing: {},
  sportConfig: {},
  fullDescription: '',
  autoDescription: true,
  addons: {},
  addonPrices: {},
  customAddons: [],
})

export const blankPayout = () => ({
  acctHolder: '',
  bankName: '',
  acctNumber: '',
  ifsc: '',
  payoutPhone: '',
  upiId: '',
  pan: '',
})

export const blankPhotos = () => ({
  venuePhotos: [],
  serviceImages: [],
})

/** A complete, empty draft split by section. */
export const blankDraft = () => ({
  basics: blankBasics(),
  location: blankLocation(),
  details: blankDetails(),
  payout: blankPayout(),
  photos: blankPhotos(),
})

/** Section keys patched via patchDraft (photos are excluded). */
export const PATCH_SECTIONS = ['basics', 'location', 'details', 'payout']
