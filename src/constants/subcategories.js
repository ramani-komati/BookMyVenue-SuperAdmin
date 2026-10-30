/**
 * Custom sub-categories — the registration wizard's "Others" option, for a
 * sub-category the built-in list lacks (Sports → "Cricket Nets").
 *
 * An IDENTICAL copy lives in the super admin app (src/constants/
 * subcategories.js — diff them). The backend owns the shared list and every
 * rule (venues/subcategories.py): a vendor's new name waits for the super
 * admin's approval, the super admin's is approved at once, and only
 * approved names are offered to other vendors or shown to customers. This
 * file mirrors the same tidying + duplicate rules so the form can answer
 * immediately.
 *
 * In a draft, custom names are ticked in the venue type's usual map
 * (`sports` for Sports, `subCategories` otherwise) so pricing, display and
 * publishing work exactly as for built-in ones, and are ALSO listed in
 * `details.customSubCategories` — that list is what the server records.
 *
 * Pure data + functions, relative imports only, so `npm test` covers it.
 */
import { OTHERS, VENUE_TYPES, normalizeVenueType } from './categories.js';
import { GYM_SUBCATS, HALL_SUBCATS, PLAYSTATION_SUBCATS, PLAYZONE_SPORTS, SURPRISE_OCCASIONS } from './venue.js';

export const OTHERS_OPTION = 'Others';
export const MAX_NAME = 40;
export const MAX_PER_VENUE = 10;

// The venue types whose form has a sub-category list to extend, and that
// list. Theatres and resorts have none; an "Others" venue types its own.
export const FIXED_SUBCATS = {
  'Private Hall': HALL_SUBCATS,
  Playzone: PLAYZONE_SPORTS,
  Playstation: PLAYSTATION_SUBCATS,
  Gym: GYM_SUBCATS,
  'Big Screen Surprise': SURPRISE_OCCASIONS,
};

const typeOf = (type) => normalizeVenueType(type) || type;

/** Does this venue type take custom sub-categories? */
export const supportsCustom = (type) => Boolean(FIXED_SUBCATS[typeOf(type)]);

/** The catalogue category custom names attach to ('Play zone'…), or ''. */
export const customCategoryOf = (type) =>
  (supportsCustom(type) && VENUE_TYPES[typeOf(type)]?.category) || '';

/** Which draft map the type ticks its sub-categories in. */
export const subcatMapKey = (type) => (typeOf(type) === 'Playzone' ? 'sports' : 'subCategories');

/** "  cricket   nets " → "cricket nets" (spacing only — the case is kept). */
export const cleanSubcategoryName = (raw) => String(raw ?? '').split(/\s+/).filter(Boolean).join(' ');

/** Duplicate key: case, spacing and punctuation ignored (backend name_key). */
export const subcategoryKey = (raw) =>
  String(raw ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, MAX_NAME);

const ALLOWED = /^[\p{L}\p{N} &/\-'.(),+]+$/u;
const RESERVED = new Set(['other', 'others', 'none', 'na', 'n a']);

/** '' when the typed name is usable, else the message to show. */
export function subcategoryNameError(raw) {
  const name = cleanSubcategoryName(raw);
  if (!name) return 'Enter a subcategory name.';
  if (name.length < 2) return 'A subcategory name needs at least 2 characters.';
  if (name.length > MAX_NAME) return `Keep the subcategory name under ${MAX_NAME} characters.`;
  if (!/\p{L}/u.test(name)) return 'A subcategory name must contain letters.';
  if (!ALLOWED.test(name)) return "Use letters, numbers, spaces and & / - ' . ( ) + , only.";
  if (RESERVED.has(subcategoryKey(name))) return 'Type the actual subcategory name instead of "Others".';
  return '';
}

/** The option already in `options` with the same key, else ''. */
export const findSameName = (name, options = []) => {
  const key = subcategoryKey(name);
  return (options || []).find((o) => subcategoryKey(o) === key) || '';
};

const isOthersItem = (name) => ['other', 'others'].includes(subcategoryKey(name));

/** The draft's own custom names (`details.customSubCategories`). */
export const draftCustomNames = (details = {}) =>
  (Array.isArray(details.customSubCategories) ? details.customSubCategories : []).filter(
    (n) => typeof n === 'string' && n.trim(),
  );

/**
 * The tiles a venue type's grid shows: the built-in list, then the shared
 * custom names (`shared`: [{name, status}] — approved for vendors; the
 * super admin also sees pending ones), then the draft's own custom names.
 * A built-in "Others"/"Other" tile stays last; `othersTile` says whether the
 * grid must add its own "Others" opener (the list has none).
 * Each item: { name, custom, status }.
 */
export function gridItems(type, shared = [], details = {}) {
  const fixed = FIXED_SUBCATS[typeOf(type)] || [];
  const items = [];
  const seen = new Set();
  const push = (name, custom, status = '') => {
    const key = subcategoryKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({ name, custom, status });
  };
  fixed.filter((n) => !isOthersItem(n)).forEach((n) => push(n, false));
  (shared || []).forEach((s) => push(s.name, true, s.status || 'approved'));
  draftCustomNames(details).forEach((n) => push(n, true, 'yours'));
  const builtInOthers = fixed.find(isOthersItem);
  if (builtInOthers) items.push({ name: builtInOthers, custom: false, status: '', others: true });
  return { items, othersTile: !builtInOthers };
}

/** Ticked names in the type's map that are not built-in — what the draft
 *  declares as custom (order of ticking kept). */
export function selectedCustomNames(details = {}, type = details.primaryCategory) {
  const fixed = FIXED_SUBCATS[typeOf(type)];
  if (!fixed) return [];
  const map = details[subcatMapKey(type)] || {};
  return Object.keys(map).filter((k) => map[k] && !findSameName(k, fixed));
}

/** details with `customSubCategories` brought in line with what is ticked. */
export function withCustomList(details = {}, type = details.primaryCategory) {
  return { ...details, customSubCategories: selectedCustomNames(details, type) };
}

/**
 * Add a typed name to the draft: an existing tile with the same name is
 * ticked instead of making a duplicate. Returns { details, name, error,
 * existed } — `error` set (and details unchanged) when the name is unusable.
 */
export function addCustomSubcategory(details = {}, type, raw, shared = []) {
  const error = subcategoryNameError(raw);
  if (error) return { details, name: '', error, existed: false };
  if (!supportsCustom(type)) {
    return { details, name: '', error: 'This category has no subcategories to add to.', existed: false };
  }
  const name = cleanSubcategoryName(raw);
  const { items } = gridItems(type, shared, details);
  const same = findSameName(name, items.filter((i) => !i.others).map((i) => i.name));
  const finalName = same || name;
  const mapKey = subcatMapKey(type);
  const next = withCustomList({ ...details, [mapKey]: { ...(details[mapKey] || {}), [finalName]: true } }, type);
  if (next.customSubCategories.length > MAX_PER_VENUE) {
    return { details, name: '', error: `Add at most ${MAX_PER_VENUE} custom subcategories.`, existed: false };
  }
  return { details: next, name: finalName, error: '', existed: Boolean(same) };
}

/** Untick a custom name and drop it from the draft's own list. */
export function removeCustomSubcategory(details = {}, type, name) {
  const mapKey = subcatMapKey(type);
  const map = { ...(details[mapKey] || {}) };
  delete map[name];
  return withCustomList({ ...details, [mapKey]: map }, type);
}

/** Sports ticked in a draft: the built-in ones in their usual order, then
 *  custom sports in the order they were added. */
export function selectedSports(details = {}) {
  const map = details.sports || {};
  const fixed = PLAYZONE_SPORTS.filter((s) => map[s]);
  const custom = Object.keys(map).filter((k) => map[k] && !PLAYZONE_SPORTS.includes(k));
  return [...fixed, ...custom];
}

/** Is a sport name one of the built-in ones? (Pitch labels — unitListings.) */
export const isBuiltInSport = (name) => PLAYZONE_SPORTS.includes(name);

/** "Others" venue types keep their own free-form sub-categories. */
export const isOthersType = (type) => typeOf(type) === OTHERS;
