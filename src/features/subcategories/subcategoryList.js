/**
 * The Sub-categories page's rules, kept out of the component so `npm test`
 * covers them. The backend (adminpanel/subcategories_admin.py) enforces the
 * same rules; these only let the page answer immediately.
 *
 * Pure functions, relative imports only.
 */
import { cleanSubcategoryName, subcategoryKey, subcategoryNameError } from '../../constants/subcategories.js';

export const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

/** GET /api/admin/subcategories params for the page's two filters
 *  ('all' / '' = no filter). */
export function listParams({ status = '', category = '' } = {}) {
  const params = {};
  if (status && status !== 'all') params.status = status;
  if (category) params.category = category;
  return params;
}

/**
 * '' when `raw` is a usable new spelling of `row.name`, else the message.
 * Only the spelling, capitals or punctuation may change: venues are matched
 * to a sub-category by its key, so a different key would drop the name from
 * every venue already using it.
 */
export function spellingEditError(row, raw) {
  const problem = subcategoryNameError(raw);
  if (problem) return problem;
  const name = cleanSubcategoryName(raw);
  if (name === row.name) return 'Change the spelling first, or cancel.';
  if (subcategoryKey(name) !== subcategoryKey(row.name)) {
    return 'Only the spelling, capitals or punctuation can change — add a new sub-category for a different name.';
  }
  return '';
}

/** The toast after a status change. */
export function statusToast(name, next) {
  if (next === 'approved') return `“${name}” approved`;
  if (next === 'rejected') return `“${name}” rejected`;
  return `“${name}” moved back to pending`;
}

/** "Added by vendor Ravi (9000000001)", or by an admin. */
export function addedBy(row) {
  if (row.createdByAdmin) return 'Added by an admin';
  const by = row.createdBy;
  if (!by) return 'Added by a vendor';
  const who = by.name || by.phone;
  return `Added by vendor ${who}${by.name && by.phone ? ` (${by.phone})` : ''}`;
}
