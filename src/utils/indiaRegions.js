/**
 * India's states, union territories and districts — lookups over the
 * generated dataset (constants/indiaRegions.js, from the backend's
 * venues/data/india_regions.json). Mirrors the backend's venues/regions.py so
 * the browser and the server agree on every name and PIN rule.
 *
 *   STATE_NAMES                 all 36, alphabetical
 *   findState('TS')             → the Telangana entry (names, codes, aliases)
 *   districtsOf('Telangana')    → its districts
 *   findDistrict(state, 'Medchal–Malkajgiri') → 'Medchal Malkajgiri'
 *   pincodeError('500084', 'Telangana') → null | message
 *   searchRegions('medch')      → state / district matches for a search box
 *
 * Cities, towns and localities are NOT in the dataset (there are tens of
 * thousands); they come from the geocoder, scoped to the chosen district.
 *
 * Pure (relative imports only) so `npm test` can load it. The customer and
 * SuperAdmin apps carry identical copies of this file.
 */
import { INDIA_REGIONS } from '../constants/indiaRegions.js';

export const COUNTRY = 'India';

/** Comparison form — case, punctuation, '&' and a trailing "district" never matter. */
export function regionKey(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[‐-―\-.,()'’/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+district$/, '');
}

export const STATE_NAMES = Object.freeze(INDIA_REGIONS.map((s) => s.name));

const stateIndex = new Map();
INDIA_REGIONS.forEach((s) => {
  [s.name, s.code, ...(s.aliases || [])].forEach((n) => {
    const k = regionKey(n);
    if (k && !stateIndex.has(k)) stateIndex.set(k, s);
  });
});

const districtIndexes = new Map();
function districtIndex(state) {
  if (!districtIndexes.has(state.name)) {
    const index = new Map();
    state.districts.forEach((d) => index.set(regionKey(d), d));
    Object.entries(state.districtAliases || {}).forEach(([d, aliases]) => {
      aliases.forEach((a) => {
        const k = regionKey(a);
        if (!index.has(k)) index.set(k, d);
      });
    });
    districtIndexes.set(state.name, index);
  }
  return districtIndexes.get(state.name);
}

/** The state / UT entry for a name, ISO code or alias — or null. */
export function findState(name) {
  const k = regionKey(name);
  return (k && stateIndex.get(k)) || null;
}

export const canonicalState = (name) => findState(name)?.name || null;

/** The districts of a state ([] when the state is unknown). */
export function districtsOf(stateName) {
  return findState(stateName)?.districts || [];
}

/**
 * The canonical district inside that state — or null. "South West Delhi"
 * also matches Delhi's "South West" (geocoders add the state's name).
 */
export function findDistrict(stateName, name) {
  const state = findState(stateName);
  const k = regionKey(name);
  if (!state || !k) return null;
  const index = districtIndex(state);
  let found = index.get(k);
  if (!found) {
    const suffix = ` ${regionKey(state.name)}`;
    if (k.endsWith(suffix)) found = index.get(k.slice(0, -suffix.length).trim());
  }
  return found || null;
}

/**
 * Indian PIN rules: six digits, never starting with 0; the first digit is the
 * postal zone (9 = Army Postal Service, never a venue) and must belong to
 * the state when one is chosen. null when valid.
 */
export function pincodeError(pincode, stateName) {
  const value = String(pincode ?? '').trim();
  if (!/^[1-9]\d{5}$/.test(value)) return 'Pincode must be 6 digits and cannot start with 0';
  if (value[0] === '9') return 'Pincodes starting with 9 are Army Postal Service codes — enter the venue’s own pincode';
  const state = findState(stateName);
  if (state && !state.pinZones.includes(value[0])) return `This pincode is not in ${state.name} — check the pincode or the state`;
  return null;
}

/**
 * States and districts matching what was typed, best first — instant and
 * offline, so the location search always has answers for state / district
 * names even when the geocoder is unavailable.
 *
 * → [{ kind: 'state' | 'district', state, district, label, sub }]
 */
export function searchRegions(query, { limit = 6 } = {}) {
  const q = regionKey(query);
  if (q.length < 2) return [];
  const scored = [];
  const score = (name) => {
    const k = regionKey(name);
    if (k === q) return 0;
    if (k.startsWith(q)) return 1;
    if (k.split(' ').some((w) => w.startsWith(q))) return 2;
    return -1;
  };
  INDIA_REGIONS.forEach((s) => {
    const sState = Math.min(...[s.name, ...(s.aliases || [])].map((n) => {
      const v = score(n);
      return v < 0 ? 9 : v;
    }));
    if (sState < 9) {
      scored.push({ rank: sState, kind: 'state', state: s.name, district: '', label: s.name, sub: s.type === 'ut' ? 'Union territory' : 'State' });
    }
    s.districts.forEach((d) => {
      const aliases = (s.districtAliases || {})[d] || [];
      const best = Math.min(...[d, ...aliases].map((n) => {
        const v = score(n);
        return v < 0 ? 9 : v;
      }));
      if (best < 9) {
        scored.push({ rank: best + 0.5, kind: 'district', state: s.name, district: d, label: d, sub: `District, ${s.name}` });
      }
    });
  });
  return scored
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((r) => ({ kind: r.kind, state: r.state, district: r.district, label: r.label, sub: r.sub }));
}
