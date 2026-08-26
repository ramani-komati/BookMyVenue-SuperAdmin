// catalogApi — the tiny slice of the customer app's catalog service the ported
// registration uses: resolving a Google Maps link to a place. It hits the
// public `/maps/resolve` endpoint on the plain API base (same base + proxy the
// register flow's vendor calls use — NOT `/api/admin`).
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://bookmyvenues-backend.onrender.com/api')

export const catalogApi = {
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
