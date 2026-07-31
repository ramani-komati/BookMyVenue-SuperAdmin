// Shared display formatters (previously lived in data/mockData.js).

// Coerce before formatting — real API records can miss numeric/name fields
// (e.g. auto-created customers with no name yet) and must never crash a page.
export const fmt = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN')

export const initials = (name) =>
  String(name || '').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

// Safe [badge, label] lookup for status-meta maps: an unknown status from the
// real API renders as-is with a neutral badge instead of crashing the page.
export const statusMeta = (map, key) => map[key] || ['draft', key ? String(key) : 'Unknown']

// Friendly booking reference: raw API ids ("bk_lqz8xk4p2m…") are unreadable in
// a table — show a short uppercase code from the id's tail (its most unique
// part). Already-short ids (e.g. "BMV-8841") pass through untouched.
export const bookingRef = (id) => {
  const s = String(id || '')
  if (s.length <= 10) return s
  return '#' + s.replace(/^(bk|wk)_/i, '').slice(-6).toUpperCase()
}

// Place line for venue/approval rows — the DISTRICT the vendor selected in
// the registration wizard is the canonical place; fall back to city, then
// area, for records from before the backend exposed `district`.
export const placeOf = (v) => {
  const first = ['district', 'city', 'area']
    .map((k) => String(v?.[k] || '').trim())
    .find(Boolean)
  return first || '—'
}

// Audit "admin" column: backend entries may carry the admin's raw email while
// frontend entries carry a display name — normalise both to a readable name
// ("ramani.komati@x.in" → "Ramani Komati"); empty → "Admin".
export const adminLabel = (v) => {
  const s = String(v || '').trim()
  if (!s) return 'Admin'
  if (!s.includes('@')) return s
  const words = s.split('@')[0].split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1))
  return words.join(' ') || s
}

// Audit targets: the backend auto-logs actions with the entity's raw ID as the
// target. Resolve it to the entity's NAME when it's in the loaded data; shorten
// unmatched opaque ids (UUIDs) instead of dumping them; pass real names/text
// through untouched.
export const resolveTarget = (target, { approvals = [], venues = [], vendors = [], users = [], bookings = [] } = {}) => {
  const t = String(target ?? '')
  if (!t) return t
  const idEq = (x) => String(x?.id) === t
  const named = approvals.find(idEq) || venues.find(idEq) || vendors.find(idEq) || users.find(idEq)
  if (named?.name) return named.name
  if (bookings.some(idEq)) return bookingRef(t)
  const uuidish = /^[0-9a-f-]{16,}$/i.test(t) || (t.length > 24 && !t.includes(' '))
  return uuidish ? '#' + t.replace(/-/g, '').slice(-6).toUpperCase() : t
}
