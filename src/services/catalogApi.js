// catalogApi — the tiny slice of the customer app's catalog service the ported
// registration uses: resolving a Google Maps link to a place. It hits the
// public `/maps/resolve` endpoint on the plain API base (same base + proxy the
// register flow's vendor calls use — NOT `/api/admin`).
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://bookmyvenues-backend.onrender.com/api')

// A failed geocoder call → an Error carrying the HTTP status (503 = no
// provider configured, 404 = older backend), like the customer app's ApiError.
async function geoRequest(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export const catalogApi = {
  // Places matching an address (the backend's geocoding proxy; the key stays
  // on the server). `scope` { state, district } narrows it. Throws on failure.
  async searchPlaces(query, scope = {}) {
    const qs = new URLSearchParams({ q: query })
    if (scope.state) qs.set('state', scope.state)
    if (scope.district) qs.set('district', scope.district)
    const res = await geoRequest(`/geo/search?${qs}`)
    return Array.isArray(res?.results) ? res.results : []
  },

  // Town / locality suggestions while typing (Google Places via the backend).
  async autocompletePlaces(query, { session, bias } = {}) {
    const qs = new URLSearchParams({ q: query })
    if (session) qs.set('session', session)
    if (bias?.lat != null && bias?.lng != null) {
      qs.set('lat', String(bias.lat))
      qs.set('lng', String(bias.lng))
    }
    const res = await geoRequest(`/geo/autocomplete?${qs}`)
    return Array.isArray(res?.suggestions) ? res.suggestions : []
  },

  async resolveMapsLink(link) {
    if (!link) return null
    try {
      const res = await fetch(`${API_BASE}/maps/resolve?url=${encodeURIComponent(link)}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.resolved || null
    } catch {
      return null
    }
  },
}

/**
 * The canonical event categories (Navaratri, Dandiya, …) the backend will
 * accept. Read from the PUBLIC config so the admin event form offers exactly
 * what the API canonicalises, instead of a hard-coded copy that drifts.
 * Returns [] on failure — the form then falls back to a free-text category.
 */
export async function fetchEventCategories() {
  try {
    const res = await fetch(`${API_BASE}/config`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.eventCategories) ? data.eventCategories : []
  } catch {
    return []
  }
}
