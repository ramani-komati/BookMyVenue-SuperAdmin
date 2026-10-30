/**
 * THE venue category model — one file every registration, edit and display
 * screen reads (the vendor wizard, vendor venue editing, the super admin's
 * register / All venues edit forms). An IDENTICAL copy lives in the super
 * admin app (src/constants/categories.js — diff them), and the backend
 * mirrors it in venues/taxonomy.py (CATEGORY_GROUPS / VENUE_TYPES).
 *
 * Two levels:
 *   PRIMARY CATEGORY  what vendors register under and customers browse:
 *                     Celebrate · Sports · Gaming · Resorts · Fitness
 *   VENUE TYPE        the value the draft stores (details.primaryCategory)
 *                     and that drives the form (pitches vs screens, …).
 *                     Celebrate has four: Private Hall, Private Theatre,
 *                     Open Air Theatre and Big Screen Surprise; every other
 *                     category has one.
 *
 * The stored venue-type strings are the ones drafts have always held
 * ('Playzone', 'Playstation', 'Open Theatre'…) so every existing draft and
 * venue opens unchanged — only the labels and the grouping are new.
 * "Explore" (the customer home page) and "Events" (ticketing, its own
 * taxonomy) are deliberately NOT venue categories.
 *
 * Pure data + functions, relative imports only, so `npm test` covers it.
 */

export const OTHERS = 'Others';

// Venue type → what the form shows, and the catalogue category it publishes
// as (backend venues/taxonomy.py CATEGORIES keys).
// `noun` is how a sentence names one ("a sports venue").
export const VENUE_TYPES = {
  'Private Hall': { label: 'Private Hall', category: 'Party hall', group: 'celebrate', noun: 'private hall' },
  'Private Theatre': { label: 'Private Theatre', category: 'Private theatre', group: 'celebrate', noun: 'private theatre' },
  'Open Theatre': { label: 'Open Air Theatre', category: 'Open-air theatre', group: 'celebrate', noun: 'open-air theatre' },
  // A personal message on a real cinema screen — sold per surprise, not per hour.
  'Big Screen Surprise': { label: 'Big Screen Surprise', category: 'Big screen surprise', group: 'celebrate', noun: 'big screen surprise theatre' },
  Playzone: { label: 'Sports', category: 'Play zone', group: 'sports', noun: 'sports venue' },
  Playstation: { label: 'Gaming', category: 'Playstation', group: 'gaming', noun: 'gaming lounge' },
  Resort: { label: 'Resort', category: 'Resort', group: 'resorts', noun: 'resort' },
  Gym: { label: 'Fitness', category: 'Gym', group: 'fitness', noun: 'gym' },
  [OTHERS]: { label: 'Others', category: null, group: 'others', noun: 'venue' },
};

// The primary categories, in navigation order. `types` are venue types.
export const PRIMARY_GROUPS = [
  { key: 'celebrate', label: 'Celebrate', types: ['Private Hall', 'Private Theatre', 'Open Theatre', 'Big Screen Surprise'] },
  { key: 'sports', label: 'Sports', types: ['Playzone'] },
  { key: 'gaming', label: 'Gaming', types: ['Playstation'] },
  { key: 'resorts', label: 'Resorts', types: ['Resort'] },
  { key: 'fitness', label: 'Fitness', types: ['Gym'] },
  // Vendor escape hatch for a venue no category covers — the vendor types
  // its name. Not a browse category; screens opt in with { others: true }.
  { key: 'others', label: 'Others', types: [OTHERS] },
];

const GROUP_BY_KEY = Object.fromEntries(PRIMARY_GROUPS.map((g) => [g.key, g]));

/** The primary-category options a form offers. */
export function primaryOptions({ others = false } = {}) {
  return PRIMARY_GROUPS.filter((g) => others || g.key !== 'others').map((g) => ({ value: g.key, label: g.label }));
}

/** The venue-type options inside one primary category ([] when it has one). */
export function typeOptions(groupKey) {
  const group = GROUP_BY_KEY[groupKey];
  if (!group || group.types.length < 2) return [];
  return group.types.map((t) => ({ value: t, label: VENUE_TYPES[t].label }));
}

/** The single venue type of a one-type category, else ''. */
export function onlyTypeOf(groupKey) {
  const group = GROUP_BY_KEY[groupKey];
  return group && group.types.length === 1 ? group.types[0] : '';
}

const lower = (v) => String(v ?? '').trim().toLowerCase();

// Every legacy / catalogue / free-text spelling ever stored → the venue type.
const TYPE_ALIASES = {
  'private hall': 'Private Hall', 'party hall': 'Private Hall', hall: 'Private Hall', 'banquet hall': 'Private Hall',
  'private theatre': 'Private Theatre', 'private theater': 'Private Theatre', theatre: 'Private Theatre',
  'open theatre': 'Open Theatre', 'open theater': 'Open Theatre', 'open-air theatre': 'Open Theatre',
  'open air theatre': 'Open Theatre', 'open-air theater': 'Open Theatre', 'open air theater': 'Open Theatre',
  playzone: 'Playzone', 'play zone': 'Playzone', sports: 'Playzone', turf: 'Playzone',
  'box cricket': 'Playzone', 'swimming pool': 'Playzone', pickleball: 'Playzone',
  playstation: 'Playstation', 'play station': 'Playstation', gaming: 'Playstation',
  'gaming lounge': 'Playstation', 'ps5 lounge': 'Playstation',
  resort: 'Resort', resorts: 'Resort',
  gym: 'Gym', gyms: 'Gym', fitness: 'Gym', 'fitness centre': 'Gym', 'fitness center': 'Gym', 'fitness studio': 'Gym',
  'gym and fitness': 'Gym', 'gym & fitness': 'Gym',
  'big screen surprise': 'Big Screen Surprise', 'big-screen surprise': 'Big Screen Surprise',
  'big screen surprises': 'Big Screen Surprise', 'cinema surprise': 'Big Screen Surprise',
  others: OTHERS, other: OTHERS,
};

/** Any stored value (wizard type, catalogue category, legacy spelling) →
 *  the venue type, or '' when unknown. */
export function normalizeVenueType(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (VENUE_TYPES[text]) return text;
  return TYPE_ALIASES[lower(text)] || '';
}

/** The primary category key for a venue type / stored category, or ''. */
export function groupOfType(raw) {
  const type = normalizeVenueType(raw);
  if (type) return VENUE_TYPES[type].group;
  // A vendor's own "Others" name that is clearly a gym browses as Fitness.
  return /\b(gym|gyms|fitness)\b/i.test(String(raw || '')) ? 'fitness' : '';
}

/** Customer-facing label for a venue type. */
export const venueTypeLabel = (raw) => {
  const type = normalizeVenueType(raw);
  return type ? VENUE_TYPES[type].label : String(raw || '');
};

/** The group a draft's details currently sit in: the explicit choice (a
 *  Celebrate pick before its venue type is chosen), else the type's own. */
export function draftGroup(details = {}) {
  return details.categoryGroup && GROUP_BY_KEY[details.categoryGroup]
    ? details.categoryGroup
    : groupOfType(details.primaryCategory);
}

/** Does a venue type belong to the Sports category (pitches / courts)? */
export const isSportsType = (raw) => normalizeVenueType(raw) === 'Playzone';

/** "Celebrate · Private Hall", "Sports", "Fitness" — a stored category as
 *  the admin lists show it; an uncategorised name is shown as typed. */
export function categoryDisplay(raw) {
  const group = GROUP_BY_KEY[groupOfType(raw)];
  if (!group || group.key === 'others') return String(raw || '');
  return group.types.length > 1 ? `${group.label} · ${venueTypeLabel(raw)}` : group.label;
}
