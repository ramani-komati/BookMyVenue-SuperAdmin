/**
 * Address helpers for the registration wizard's Location step — all through
 * the backend's geocoding proxy (venues/geocoding.py), so the Google key
 * never reaches the browser. Every function is best effort: it resolves to
 * an empty answer when no provider is configured (503), the backend is
 * older (404) or the network fails, and the step then simply works without
 * suggestions. Nothing here ever invents a place or a coordinate.
 *
 * The customer and SuperAdmin apps carry this file with identical logic.
 */
import { catalogApi } from '@/services/catalogApi';

let session = '';
let suggestOff = false;
const newSession = () => (globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

/** Town / locality suggestions while typing → [{ placeId, main, secondary }]. */
export async function suggestPlaces(query, bias) {
  const q = String(query || '').trim();
  if (suggestOff || q.length < 2 || !catalogApi.autocompletePlaces) return [];
  if (!session) session = newSession();
  try {
    return await catalogApi.autocompletePlaces(q, { session, bias });
  } catch (err) {
    if (err?.status === 503 || err?.status === 404) suggestOff = true;
    return [];
  }
}

/** A suggestion was used: the next search starts a new billing session. */
export function endSuggestSession() {
  session = '';
}

const centres = new Map();

/** The geocoded centre of a district (to bias suggestions), or null. */
export async function districtCentre(state, district) {
  if (!state || !district) return null;
  const key = `${district}|${state}`;
  if (!centres.has(key)) {
    centres.set(key, (async () => {
      try {
        const rows = await catalogApi.searchPlaces(`${district}, ${state}`);
        const row = (rows || []).find((r) => r.lat != null && (!r.state || r.state === state));
        return row ? { lat: row.lat, lng: row.lng } : null;
      } catch {
        return null;
      }
    })());
  }
  return centres.get(key);
}

/**
 * The map point for a typed address, best match first, or null — the vendor
 * still confirms it (it is shown on the map before being kept).
 * → { lat, lng, label } | null
 */
export async function geocodeAddress(parts, scope = {}) {
  const text = parts.map((p) => String(p || '').trim()).filter(Boolean).join(', ');
  if (text.length < 2) return null;
  try {
    const rows = await catalogApi.searchPlaces(text.slice(0, 100), scope);
    const row = (rows || []).find((r) => r.lat != null && r.lng != null
      && (!scope.state || !r.state || r.state === scope.state));
    return row ? { lat: row.lat, lng: row.lng, label: row.formattedAddress || row.label } : null;
  } catch {
    return null;
  }
}
