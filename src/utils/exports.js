// Excel export helpers shared by every panel page. Pure functions (no React,
// no DOM) so the rules are unit-tested in exports.test.js.
//
// The files themselves are built by the backend (GET /api/admin/exports/<kind>
// and the older /api/admin/bookings/export): each page sends its own filters
// and the server applies the same rules, so a download holds exactly the rows
// on screen — all of them, not just the current page of a paginated list.

// "admin_users_2026-10-24.xlsx" — the same name the server puts on the file.
export const exportFileName = (prefix, today) => `${prefix}_${today}.xlsx`

// Query params without blanks, so the URL only carries filters in use.
export const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && String(v).trim() !== ''),
  )

// The search box rule the backend uses (reports/common.matches): the row's
// searchable fields joined with spaces, lower-cased, must contain the
// trimmed, lower-cased query.
export function matchesQuery(query, values) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return values
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map(String)
    .join(' ')
    .toLowerCase()
    .includes(q)
}

// A readable reason for a failed export, by HTTP status.
export function exportErrorMessage(err, what = 'this export') {
  const status = err?.status
  if (status === 401 || status === 403) return `Your admin session has expired. Sign in again to export ${what}.`
  if (status === 404) return 'Excel export is not available on the server yet — it needs the latest backend update.'
  if (status === 429) return 'Too many exports in a short time. Wait a minute and try again.'
  if (status === 0 || err instanceof TypeError) return 'Could not reach the server. Check your connection and try again.'
  return `Could not export ${what}: ${err?.message || 'request failed'}`
}
