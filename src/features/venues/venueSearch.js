// Live venues + All venues search. Pure, so it is unit-tested
// (venueSearch.test.js) — and the export sends the same query to the
// backend, which reads the identical fields (reports/admin_reports.py
// venue_search_fields), so the Excel file holds exactly the venues on screen.

import { matchesQuery } from '../../utils/exports.js'
import { PRIMARY_GROUPS, groupOfType } from '../../constants/categories.js'

const GROUP_LABEL = Object.fromEntries(PRIMARY_GROUPS.map((g) => [g.key, g.label]))

// Venue name, vendor (contact or business name), category and its group
// ("Sports", "Celebrate" …), city / district / area, and the venue id.
export const venueSearchFields = (v) => [
  v.id, v.name, v.vendor, v.vendorBusiness, v.category,
  GROUP_LABEL[v.categoryGroup || groupOfType(v.category)], v.city, v.district, v.area,
]

export function searchVenues(venues, query = '') {
  return (venues || []).filter((v) => matchesQuery(query, venueSearchFields(v)))
}

/** The search's part of an export request ({} when the box is empty). */
export function venueSearchParams(query = '') {
  const q = String(query || '').trim()
  return q ? { q } : {}
}
