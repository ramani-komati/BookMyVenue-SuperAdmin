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

const COORD_PAIR = /^\s*(?:loc:\s*)?(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/i;
// One hemisphere-suffixed degrees-minutes-seconds coordinate: 17°58'08.0"N
const DMS = /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*(?:"|″|'')?\s*([NSEW])/gi;

const validPair = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90
  && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

/** "lat,lng" from a decimal or DMS pair written as text, or null. */
function pointText(text) {
  const m = String(text || '').match(COORD_PAIR);
  if (m) return validPair(Number(m[1]), Number(m[2])) ? `${m[1]},${m[2]}` : null;
  const found = [...String(text || '').matchAll(DMS)];
  if (found.length !== 2) return null;
  const out = {};
  for (const [, deg, min, sec, hemi] of found) {
    if (Number(min) >= 60 || Number(sec) >= 60) return null;
    const v = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
    const h = hemi.toUpperCase();
    out[h === 'N' || h === 'S' ? 'lat' : 'lng'] = h === 'S' || h === 'W' ? -v : v;
  }
  if (out.lat == null || out.lng == null || !validPair(out.lat, out.lng)) return null;
  return `${Math.round(out.lat * 1e7) / 1e7},${Math.round(out.lng * 1e7) / 1e7}`;
}

const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co', 'g.page']);

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
    // A /maps/place|search|dir/ path segment that IS the point (decimal or
    // degrees-minutes-seconds); the @lat,lng viewport is never a pin.
    const parts = u.pathname.split('/').map((p) => {
      try {
        return decodeURIComponent(p.replace(/\+/g, ' '));
      } catch {
        return p;
      }
    });
    const i = parts.findIndex((p) => p === 'place' || p === 'search' || p === 'dir');
    if (i >= 0) {
      const tail = parts.slice(i + 1).filter((p) => p && !p.startsWith('@') && !p.startsWith('data='));
      if (tail.length) return pointText(parts[i] === 'dir' ? tail[tail.length - 1] : tail[0]);
    }
  } catch {
    /* not a parseable URL */
  }
  return null;
}

/** "Open in Google Maps" for a venue: its exact pin when known, else the
 *  vendor's own link, else a name + address search. Never an invented point. */
export function openInMapsUrl({ coordinates, mapsLink, name, address } = {}) {
  const lat = Number(coordinates?.lat);
  const lng = Number(coordinates?.lng);
  if (coordinates && validPair(lat, lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const link = String(mapsLink || '').trim();
  if (/^https:\/\//i.test(link)) return link;
  const q = [name, address].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
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
