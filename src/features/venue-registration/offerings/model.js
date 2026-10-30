/**
 * Fitness, Resort and Big Screen Surprise registration — the pure half
 * (no React, relative imports only, so `npm test` covers it).
 *
 * ONE model for every screen that registers or edits these venues: the
 * vendor wizard, vendor venue editing, and the super admin's Register venue
 * and All venues → Edit forms. An IDENTICAL copy lives in the super admin
 * app (src/features/venue-registration/offerings/model.js — diff them); the
 * backend validates the same shapes again (offerings/schema.py) and its
 * option lists mirror these (offerings/catalog.py).
 *
 * Where things live in the draft:
 *   details.fitness   { operatingDays, classTimings, maxMembersAtOnce, … plans[] }
 *   details.resort    { types, owner{…}, facilities{…}, accommodation{…}, … packages[] }
 *   details.surprise  { brand, theatreType, formats, screens, manager{…}, … shows[] }
 *   details.subCategories   fitness services / surprise occasions (the map
 *                           every category's filters already read)
 *   details.amenities       the amenity checklists (+ any typed extras)
 *   payout.businessName / payout.gstin / payout.pan / payout.agreedToTerms
 *                           business documents and the terms agreement —
 *                           private, so they ride in the bank section, which
 *                           is never published and never admin-editable.
 * owner{} and manager{} are private too: they stay in the draft and are left
 * out of the public record (recordBlock below).
 */

export const OFFERING_TYPES = { Gym: 'fitness', Resort: 'resort', 'Big Screen Surprise': 'surprise' };

/** 'fitness' | 'resort' | 'surprise' for a venue type, else ''. */
export const offeringKindOf = (type) => OFFERING_TYPES[String(type || '').trim()] || '';

export const WEEKDAYS = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }, { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

// --- Fitness -----------------------------------------------------------------

export const FITNESS_SERVICES = [
  'General Gym / Strength Training', 'Cardio Training', 'Personal Training',
  'Weight Loss Programs', 'Yoga', 'Zumba', 'CrossFit / Functional Training',
  'Pilates', 'Group Fitness Classes', 'Martial Arts / Boxing',
  'Dance Fitness', 'Physiotherapy / Recovery',
];

export const FITNESS_AMENITIES = [
  'Air Conditioning', 'Locker Room', 'Changing Rooms', 'Shower Facilities',
  'Parking', 'Drinking Water', 'Personal Trainer', 'Steam / Sauna',
  'Swimming Pool', 'Ladies-Only Area', 'Accessible Entrance', 'CCTV / Security',
];

export const PLAN_KINDS = [
  { key: 'day_pass', name: 'Single Day Pass', value: '1', unit: 'day' },
  { key: 'weekly', name: 'Weekly Membership', value: '1', unit: 'week' },
  { key: 'monthly', name: 'Monthly Membership', value: '1', unit: 'month' },
  { key: 'quarterly', name: 'Quarterly Membership (3 Months)', value: '3', unit: 'month' },
  { key: 'half_yearly', name: 'Half-Yearly Membership (6 Months)', value: '6', unit: 'month' },
  { key: 'annual', name: 'Annual Membership (12 Months)', value: '12', unit: 'month' },
  { key: 'personal_training', name: 'Personal Training', value: '1', unit: 'month', visits: '12' },
  { key: 'group_class', name: 'Yoga / Zumba / Group Classes', value: '1', unit: 'month', visits: '12' },
];
export const DURATION_UNITS = [
  { value: 'day', label: 'Day(s)' }, { value: 'week', label: 'Week(s)' }, { value: 'month', label: 'Month(s)' },
];
export const START_RULES = [
  { value: 'purchase', label: 'Starts on the purchase date' },
  { value: 'chosen', label: 'Customer picks the start date' },
];
export const EXPIRY_RULES = [
  { value: 'duration', label: 'Ends when the duration is over' },
  { value: 'visits_or_duration', label: 'Ends when visits run out or the duration is over' },
];

// --- Resort ------------------------------------------------------------------

export const RESORT_TYPES = [
  'Resort', 'Farm Resort', 'Luxury Resort', 'Family Resort', 'Couple Resort',
  'Adventure Resort', 'Water Resort', 'Other',
];
export const RESORT_FACILITIES = [
  { key: 'poolPlay', label: 'Swimming pool and play zone', items: ['Swimming Pool', 'Kids Pool', 'Water Games', 'Indoor Games', 'Outdoor Games', 'Badminton', 'Cricket'] },
  { key: 'food', label: 'Food', items: ['Restaurant', 'Buffet', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Bar / Drinks (where legally permitted)', 'Outside Food Allowed'] },
  { key: 'other', label: 'Other facilities', items: ['Parking', 'Wi-Fi', 'AC Rooms', 'Conference Hall', 'Party Hall', 'Campfire', 'DJ / Music', 'Bonfire', 'Garden', 'Photography Area'] },
];
export const RESORT_INCLUSIONS = [
  'Swimming Pool', 'Breakfast', 'Lunch', 'Snacks', 'Indoor Games', 'Outdoor Games', 'Kids Activities',
];
export const PACKAGE_PRICING = {
  day: [
    { value: 'per_person', label: 'Per person (adult / child price)' },
    { value: 'per_package', label: 'One price for the group' },
  ],
  pool: [
    { value: 'per_person', label: 'Per person, per slot' },
    { value: 'per_hour', label: 'Per person, per hour' },
  ],
};

// --- Big Screen Surprise -----------------------------------------------------

export const CINEMA_BRANDS = ['PVR', 'Asian Cinemas', 'Local Theatre', 'Other'];
export const THEATRE_TYPES = ['Multiplex', 'Single Screen'];
export const SCREEN_FORMATS = ['2D', '3D', 'IMAX', '35mm', '70mm', 'Other'];
export const SURPRISE_OCCASIONS = [
  'Birthday', 'Anniversary', 'Proposal', 'Special Wishes', 'Love', 'Friendship', 'Selfie on Screen', 'Other',
];
// Media & Branding galleries (backend venues/views.py GALLERY_CAPS). The
// theatre exterior is the wizard's own Photos step (venuePhotos).
export const SURPRISE_GALLERIES = [
  { key: 'auditoriumImages', label: 'Auditorium images', max: 5 },
  { key: 'screenImages', label: 'Screen images', max: 5 },
  { key: 'theatreLogo', label: 'Theatre logo', max: 1 },
];

// --- Blank rows ----------------------------------------------------------------

/** A stable id for a plan / package / show — it is what keeps a customer's
 *  membership or booking attached to what they bought across edits. */
export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function blankPlan(kindKey = 'monthly') {
  const kind = PLAN_KINDS.find((k) => k.key === kindKey);
  return {
    id: newId('plan'),
    kind: kind ? kind.key : 'custom',
    name: kind ? kind.name : '',
    enabled: true,
    price: '',
    durationValue: kind ? kind.value : '1',
    durationUnit: kind ? kind.unit : 'month',
    startRule: 'purchase',
    startWithinDays: '30',
    expiryRule: kind?.visits ? 'visits_or_duration' : 'duration',
    visits: kind?.visits || '',
    facilities: [],
    trialAvailable: false,
    trialPrice: '',
    joiningFee: '',
    description: '',
  };
}

export function blankPackage(kind = 'day') {
  return {
    id: newId('pkg'),
    name: '',
    kind,
    duration: kind === 'day' ? 'full_day' : '',
    pricing: 'per_person',
    price: '',
    childPrice: '',
    minPersons: '1',
    maxPersons: '',
    capacity: '',
    slots: kind === 'pool' ? [{ start: '10:00', end: '11:00' }] : [],
    checkIn: '',
    checkOut: '',
    availableFrom: '',
    availableTo: '',
    inclusions: [],
    otherInclusion: '',
    description: '',
    enabled: true,
  };
}

export const blankShow = () => ({
  id: newId('show'), movie: '', language: '', screen: '1', times: [''], availableFrom: '', availableTo: '', enabled: true,
});

export const blankFitness = () => ({
  operatingDays: WEEKDAYS.map((d) => d.key),
  classTimings: [],
  maxMembersAtOnce: '',
  maxClassCapacity: '',
  peakHours: [],
  closures: [],
  plans: [blankPlan('monthly')],
});

export const blankResort = () => ({
  types: [],
  otherType: '',
  yearEstablished: '',
  owner: { name: '', contactPerson: '', mobile: '', whatsapp: '', email: '', alternate: '' },
  facilities: { poolPlay: [], food: [], other: [] },
  accommodation: { available: false, maxOvernight: '', rooms: [], details: '' },
  checkIn: '',
  checkOut: '',
  availableDays: WEEKDAYS.map((d) => d.key),
  closures: [],
  packages: [],
});

export const blankSurprise = () => ({
  brand: '',
  brandOther: '',
  theatreType: '',
  formats: [],
  formatOther: '',
  screens: '1',
  manager: { name: '', phone: '', email: '' },
  experience: '',
  showsPerDay: '',
  price: '',
  occasionPrices: {},
  maxBookingsPerShow: '1',
  minLeadHours: '3',
  availableFrom: '',
  availableTo: '',
  availableDays: WEEKDAYS.map((d) => d.key),
  closures: [],
  allowPhoto: true,
  allowVideo: false,
  shows: [blankShow()],
});

export const BLANKS = { fitness: blankFitness, resort: blankResort, surprise: blankSurprise };

/** The draft's block for `kind`, blank-filled (older drafts lack keys). */
export function blockOf(details = {}, kind) {
  const blank = BLANKS[kind] ? BLANKS[kind]() : {};
  const stored = details?.[kind];
  return stored && typeof stored === 'object' ? { ...blank, ...stored } : blank;
}

// --- Validation ----------------------------------------------------------------

const filled = (v) => v != null && String(v).trim() !== '';
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => (TIME.test(t || '') ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null);
const wholeError = (v, label, { min = 0, max = 1000000, required = false } = {}) => {
  if (!filled(v)) return required ? `Enter the ${label}` : null;
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n) || n !== Math.floor(n)) return `${label[0].toUpperCase()}${label.slice(1)} must be a whole number`;
  if (n < min) return `${label[0].toUpperCase()}${label.slice(1)} must be at least ${min}`;
  if (n > max) return `${label[0].toUpperCase()}${label.slice(1)} is too large`;
  return null;
};
const rangeError = (ranges = [], label) => {
  const seen = [];
  for (const r of ranges) {
    if (!filled(r?.start) && !filled(r?.end)) continue;
    const s = toMin(r.start);
    const e = toMin(r.end);
    if (s == null || e == null) return `${label}: give a start and an end time`;
    if (e <= s) return `${label}: ${r.start}–${r.end} must end after it starts`;
    if (seen.some(([a, b]) => s < b && a < e)) return `${label}: time slots overlap`;
    seen.push([s, e]);
  }
  return null;
};
const usedRanges = (ranges = []) => ranges.filter((r) => filled(r?.start) || filled(r?.end));

/** { 'plans.<id>.price': message, … } for the fitness block. */
export function fitnessErrors(block = {}) {
  const out = {};
  const plans = block.plans || [];
  plans.forEach((p) => {
    const at = (f) => `plans.${p.id}.${f}`;
    if (!filled(p.name)) out[at('name')] = 'Enter the plan name';
    if (p.enabled !== false) {
      const priceErr = wholeError(p.price, 'price', { min: 1, required: true });
      if (priceErr) out[at('price')] = priceErr;
    }
    const durErr = wholeError(p.durationValue, 'duration', { min: 1, max: 1000, required: true });
    if (durErr) out[at('durationValue')] = durErr;
    const visitsErr = wholeError(p.visits, 'number of visits', { min: 1, max: 10000 });
    if (visitsErr) out[at('visits')] = visitsErr;
    if (p.expiryRule === 'visits_or_duration' && !filled(p.visits)) out[at('visits')] = 'Set the number of visits / classes';
    if (p.startRule === 'chosen') {
      const e = wholeError(p.startWithinDays, 'start window', { min: 1, max: 90, required: true });
      if (e) out[at('startWithinDays')] = e;
    }
    ['joiningFee', 'trialPrice'].forEach((f) => {
      const e = wholeError(p[f], f === 'joiningFee' ? 'joining fee' : 'trial price');
      if (e) out[at(f)] = e;
    });
  });
  if (!plans.some((p) => p.enabled !== false && filled(p.price))) out.plans = 'Add at least one membership plan with a price';
  ['maxMembersAtOnce', 'maxClassCapacity'].forEach((f) => {
    const e = wholeError(block[f], 'capacity', { min: 1, max: 100000 });
    if (e) out[f] = e;
  });
  const peak = rangeError(block.peakHours, 'Peak hours');
  if (peak) out.peakHours = peak;
  (block.classTimings || []).forEach((c, i) => {
    if (!filled(c?.name) && !filled(c?.start) && !filled(c?.end)) return;
    if (!filled(c?.name)) out[`classTimings.${i}`] = 'Name the class';
    else {
      const e = rangeError([c], `Class “${c.name}”`);
      if (e || !filled(c.start)) out[`classTimings.${i}`] = e || 'Give the class a start and an end time';
    }
  });
  const closure = closuresError(block.closures);
  if (closure) out.closures = closure;
  return out;
}

function closuresError(closures = []) {
  for (const c of closures || []) {
    if (!filled(c?.from)) continue;
    if (filled(c.to) && c.to < c.from) return 'A closure ends before it starts';
  }
  return null;
}

export function resortErrors(block = {}, details = {}) {
  const out = {};
  const packages = block.packages || [];
  packages.forEach((p) => {
    const at = (f) => `packages.${p.id}.${f}`;
    if (!filled(p.name)) out[at('name')] = 'Enter the package name';
    const on = p.enabled !== false;
    const priceErr = wholeError(p.price, p.kind === 'pool' ? 'adult price' : 'price', { min: 1, required: on });
    if (priceErr) out[at('price')] = priceErr;
    const childErr = wholeError(p.childPrice, 'child price');
    if (childErr) out[at('childPrice')] = childErr;
    const minErr = wholeError(p.minPersons, 'minimum persons', { min: 1, max: 1000 });
    if (minErr) out[at('minPersons')] = minErr;
    const maxErr = wholeError(p.maxPersons, 'maximum persons', { min: 1, max: 1000, required: on });
    if (maxErr) out[at('maxPersons')] = maxErr;
    else if (filled(p.maxPersons) && Number(p.maxPersons) < Number(p.minPersons || 1)) out[at('maxPersons')] = 'Maximum is below the minimum';
    const capErr = wholeError(p.capacity, 'guests per slot', { min: 1, max: 100000 });
    if (capErr) out[at('capacity')] = capErr;
    if (p.availableFrom && p.availableTo && p.availableTo < p.availableFrom) out[at('availableTo')] = 'Ends before it starts';
    const needsSlots = p.kind === 'pool' || p.duration === 'half_day';
    if (needsSlots) {
      const e = rangeError(p.slots, 'Time slots');
      if (e) out[at('slots')] = e;
      else if (on && usedRanges(p.slots).length === 0) out[at('slots')] = 'Add at least one time slot';
    } else {
      const inT = p.checkIn || block.checkIn;
      const outT = p.checkOut || block.checkOut;
      if (on && (!filled(inT) || !filled(outT))) out[at('checkIn')] = 'Set check-in and check-out times (or the resort’s own)';
      else if (filled(inT) && filled(outT) && toMin(outT) <= toMin(inT)) out[at('checkIn')] = 'Check-out must be after check-in';
    }
  });
  const legacy = filled(details?.screenConfig?.[0]?.price) && (details?.packages || []).length > 0;
  if (!packages.some((p) => p.enabled !== false && filled(p.price)) && !legacy) out.packages = 'Add at least one package with a price';
  if (filled(block.checkIn) && filled(block.checkOut) && toMin(block.checkOut) <= toMin(block.checkIn)) out.checkOut = 'Check-out must be after check-in';
  const year = wholeError(block.yearEstablished, 'year', { min: 1800, max: new Date().getFullYear() });
  if (year) out.yearEstablished = year;
  if (block.accommodation?.available) {
    const e = wholeError(block.accommodation.maxOvernight, 'overnight capacity', { min: 1, max: 100000 });
    if (e) out.maxOvernight = e;
  }
  const owner = block.owner || {};
  ['mobile', 'whatsapp', 'alternate'].forEach((f) => {
    if (filled(owner[f]) && !/^\d{10}$/.test(String(owner[f]).trim())) out[`owner.${f}`] = 'Enter a 10-digit number';
  });
  if (filled(owner.email) && !/^\S+@\S+\.\S+$/.test(owner.email)) out['owner.email'] = 'Enter a valid email';
  const closure = closuresError(block.closures);
  if (closure) out.closures = closure;
  return out;
}

export function surpriseErrors(block = {}) {
  const out = {};
  const screensErr = wholeError(block.screens, 'number of screens', { min: 1, max: 50, required: true });
  if (screensErr) out.screens = screensErr;
  const screens = Number(block.screens) || 1;
  const priceErr = wholeError(block.price, 'price per surprise', { min: 1, required: true });
  if (priceErr) out.price = priceErr;
  Object.entries(block.occasionPrices || {}).forEach(([occ, v]) => {
    const e = wholeError(v, `price for ${occ}`, { min: 1 });
    if (e) out[`occasionPrices.${occ}`] = e;
  });
  const perShow = wholeError(block.maxBookingsPerShow, 'maximum bookings per show', { min: 1, max: 50 });
  if (perShow) out.maxBookingsPerShow = perShow;
  const perDay = wholeError(block.showsPerDay, 'shows per day', { min: 1, max: 1000 });
  if (perDay) out.showsPerDay = perDay;
  const lead = wholeError(block.minLeadHours, 'hours', { min: 0, max: 168 });
  if (lead) out.minLeadHours = lead;
  if (block.availableFrom && block.availableTo && block.availableTo < block.availableFrom) out.availableTo = 'Ends before it starts';
  const manager = block.manager || {};
  if (filled(manager.phone) && !/^\d{10}$/.test(String(manager.phone).trim())) out['manager.phone'] = 'Enter a 10-digit number';
  if (filled(manager.email) && !/^\S+@\S+\.\S+$/.test(manager.email)) out['manager.email'] = 'Enter a valid email';
  const taken = new Map();
  (block.shows || []).forEach((s) => {
    const at = (f) => `shows.${s.id}.${f}`;
    if (!filled(s.movie)) out[at('movie')] = 'Enter the movie';
    const scr = wholeError(s.screen, 'screen', { min: 1, max: 50, required: true });
    if (scr) out[at('screen')] = scr;
    else if (Number(s.screen) > screens) out[at('screen')] = `Only ${screens} screen${screens === 1 ? '' : 's'} offered`;
    const times = (s.times || []).filter(filled);
    if (times.some((t) => !TIME.test(t))) out[at('times')] = 'Times look like 18:30';
    else if (s.enabled !== false && times.length === 0) out[at('times')] = 'Add at least one show time';
    if (s.availableFrom && s.availableTo && s.availableTo < s.availableFrom) out[at('availableTo')] = 'Ends before it starts';
    if (s.enabled !== false) {
      times.forEach((t) => {
        const key = `${s.screen}@${t}`;
        const other = taken.get(key);
        const overlap = other && (!other.availableTo || !s.availableFrom || s.availableFrom <= other.availableTo)
          && (!s.availableTo || !other.availableFrom || other.availableFrom <= s.availableTo);
        if (overlap) out[at('times')] = `Screen ${s.screen} already has “${other.movie || 'a show'}” at ${t}`;
        else taken.set(key, s);
      });
    }
  });
  if (!(block.shows || []).some((s) => s.enabled !== false && filled(s.movie) && (s.times || []).some(filled))) {
    out.shows = 'Add at least one show (movie, screen and timings)';
  }
  const closure = closuresError(block.closures);
  if (closure) out.closures = closure;
  return out;
}

/** Inline errors for the offering block of a draft's venue type ({} for
 *  every other type). Keys are prefixed with the block name. */
export function offeringErrors(details = {}) {
  const kind = offeringKindOf(details.primaryCategory);
  if (!kind) return {};
  const block = blockOf(details, kind);
  const errs = kind === 'fitness' ? fitnessErrors(block) : kind === 'resort' ? resortErrors(block, details) : surpriseErrors(block);
  return Object.fromEntries(Object.entries(errs).map(([k, v]) => [`${kind}.${k}`, v]));
}

/** The human-readable "still missing" list for the Details step. */
export function offeringMissing(details = {}) {
  const errs = offeringErrors(details);
  const kind = offeringKindOf(details.primaryCategory);
  const head = { fitness: 'fitness.plans', resort: 'resort.packages', surprise: 'surprise.shows' }[kind];
  const out = [];
  if (head && errs[head]) out.push(errs[head]);
  if (kind === 'surprise' && errs['surprise.price']) out.push('Price per surprise');
  const rest = Object.keys(errs).filter((k) => k !== head && k !== 'surprise.price').length;
  if (rest) out.push(`Fix ${rest} highlighted field${rest === 1 ? '' : 's'} in the ${kind === 'surprise' ? 'surprise' : kind} settings`);
  return out;
}

export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// --- Draft → public record ------------------------------------------------------

const trimList = (list) => (Array.isArray(list) ? list.map((x) => String(x || '').trim()).filter(Boolean) : []);
const onKeys = (map) => Object.keys(map || {}).filter((k) => map[k]);
const strip = (v) => (v == null ? '' : String(v).trim());

/**
 * The PUBLIC `detail.<kind>` block for a venue record — what customers see
 * and what the server validates and books against. Private draft-only
 * fields (owner / manager contacts) are left out here, and business
 * documents never leave the payout section.
 */
export function recordBlock(details = {}, photos = {}) {
  const kind = offeringKindOf(details.primaryCategory);
  if (!kind) return null;
  const b = blockOf(details, kind);
  if (kind === 'fitness') {
    return {
      services: onKeys(details.subCategories),
      operatingDays: b.operatingDays || [],
      classTimings: (b.classTimings || []).filter((c) => strip(c?.name) || strip(c?.start)),
      maxMembersAtOnce: strip(b.maxMembersAtOnce),
      maxClassCapacity: strip(b.maxClassCapacity),
      peakHours: usedRanges(b.peakHours),
      closures: (b.closures || []).filter((c) => strip(c?.from)),
      plans: (b.plans || []).map((p) => ({ ...p, facilities: trimList(p.facilities) })),
    };
  }
  if (kind === 'resort') {
    const { owner: _owner, ...pub } = b;
    return {
      ...pub,
      accommodation: pub.accommodation?.available ? pub.accommodation : { available: false, maxOvernight: '', rooms: [], details: '' },
      closures: (b.closures || []).filter((c) => strip(c?.from)),
      packages: (b.packages || []).map((p) => ({
        ...p,
        slots: p.kind === 'pool' || p.duration === 'half_day' ? usedRanges(p.slots) : [],
      })),
    };
  }
  const { manager: _manager, ...pub } = b;
  const urls = (list) => (list || []).map((p) => p?.url).filter(Boolean);
  return {
    ...pub,
    occasions: onKeys(details.subCategories),
    occasionPrices: Object.fromEntries(Object.entries(b.occasionPrices || {}).filter(([occ, v]) => strip(v) && details.subCategories?.[occ])),
    closures: (b.closures || []).filter((c) => strip(c?.from)),
    shows: (b.shows || []).map((s) => ({ ...s, times: (s.times || []).map(strip).filter(Boolean) })),
    exteriorImages: urls(photos.venuePhotos).slice(0, 5),
    auditoriumImages: urls(photos.auditoriumImages),
    screenImages: urls(photos.screenImages),
    logo: urls(photos.theatreLogo)[0] || '',
  };
}

const positive = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** The card's "from ₹x" price and its unit for an offering venue, or null
 *  when the draft has nothing priced yet (callers then fall back). */
export function offeringPrice(details = {}) {
  const kind = offeringKindOf(details.primaryCategory);
  if (!kind) return null;
  const b = blockOf(details, kind);
  let prices = [];
  let unit = '';
  if (kind === 'fitness') {
    prices = (b.plans || []).filter((p) => p.enabled !== false).map((p) => positive(p.price));
    unit = 'onwards';
  } else if (kind === 'resort') {
    const live = (b.packages || []).filter((p) => p.enabled !== false);
    prices = live.map((p) => positive(p.price));
    unit = live.every((p) => p.pricing === 'per_package') ? '/ package' : '/ person';
  } else {
    prices = [positive(b.price), ...Object.values(b.occasionPrices || {}).map(positive)];
    unit = '/ surprise';
  }
  const valid = prices.filter((n) => n != null);
  return valid.length ? { price: String(Math.min(...valid)), unit } : null;
}

/** Does this draft still carry the hourly lawn pricing resorts used before
 *  packages existed? (kept editable so those venues keep working) */
export const hasLegacyResortPricing = (details = {}) =>
  details.primaryCategory === 'Resort' && filled(details?.screenConfig?.[0]?.price);
