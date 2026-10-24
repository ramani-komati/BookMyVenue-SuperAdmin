/**
 * Google Maps link helpers — the ONE place the venue's map pin is derived
 * from the vendor's pasted maps link, shared by the customer-facing venue
 * page and the registration wizard's live preview so both always agree.
 *
 * Exactness rule: only coordinates embedded in the link itself guarantee the
 * pin sits where the vendor marked it. Short share links (maps.app.goo.gl)
 * carry no coordinates and cannot be resolved in the browser, so they fall
 * back to a business-name search — the wizard warns the vendor about this so
 * the imprecision is fixed at the source, not discovered by customers.
 */

const COORD_PAIR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co']);

/**
 * Is this one of Google's shortened share links? They carry no location data
 * themselves — the exact pin only exists behind a redirect the browser can't
 * follow (CORS), so they need the backend's resolver (catalogApi.resolveMapsLink).
 */
export function isShortMapsLink(link) {
  try {
    return SHORT_HOSTS.has(new URL(String(link || '')).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * The exact pin coordinates carried by a maps link, as "lat,lng" — or null
 * when the link has none (short links, bare search links).
 */
export function exactPinCoords(link) {
  const s = String(link || '');
  // The LAST !3d<lat>!4d<lng> pair in a place URL's data blob is the place
  // marker itself; earlier pairs describe other map elements.
  const markers = [...s.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  if (markers.length) {
    const m = markers[markers.length - 1];
    return `${m[1]},${m[2]}`;
  }
  // Destination-style params whose value is itself a coordinate pair.
  try {
    const u = new URL(s);
    for (const key of ['q', 'query', 'destination', 'daddr', 'll']) {
      const v = u.searchParams.get(key);
      const m = v && v.match(COORD_PAIR);
      if (m) return `${m[1]},${m[2]}`;
    }
  } catch {
    /* not a parseable URL */
  }
  return null;
}

/**
 * The search query the embed should use when the link has no exact pin:
 * the link's own destination text → the /place/<name> path segment →
 * the @lat,lng viewport centre (approximate) → null.
 */
function fallbackQuery(link) {
  const s = String(link || '');
  try {
    const u = new URL(s);
    for (const key of ['q', 'query', 'destination', 'daddr']) {
      const v = u.searchParams.get(key);
      if (v) return v;
    }
  } catch {
    /* not a parseable URL */
  }
  const place = s.match(/\/place\/([^/@?]+)/);
  if (place) return decodeURIComponent(place[1]).replace(/\+/g, ' ');
  const center = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (center) return `${center[1]},${center[2]}`;
  return null;
}

/**
 * Keyless Google Maps embed URL pinned as close to the vendor's marked spot
 * as the link allows: exact coordinates when the link carries them, else the
 * link's own query/place, else a "name, address" business search.
 */
export function mapEmbedSrc({ name, address, location, mapsLink }) {
  const q =
    exactPinCoords(mapsLink) ||
    fallbackQuery(mapsLink) ||
    [name, address || location].filter(Boolean).join(', ');
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}
