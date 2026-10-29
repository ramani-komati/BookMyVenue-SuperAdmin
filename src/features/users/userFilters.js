// Users page search + status filter. Pure, so it is unit-tested
// (userFilters.test.js) — and the export sends the same two values to the
// backend, which applies the identical rule (reports/admin_reports.py
// users_report), so the Excel file holds exactly the users on screen.

import { matchesQuery } from '../../utils/exports.js'

export const USER_STATUS_OPTIONS = [
  { value: 'All', label: 'Status: All' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
]

// The fields the search box reads — the same four the server searches.
export const userSearchFields = (u) => [u.id, u.name, u.email, u.phone]

export function filterUsers(users, { query = '', status = 'All' } = {}) {
  return (users || []).filter((u) =>
    (status === 'All' || u.status === status) && matchesQuery(query, userSearchFields(u)))
}

export function userExportParams({ query = '', status = 'All' } = {}) {
  const params = { status }
  const q = String(query || '').trim()
  if (q) params.q = q
  return params
}
