// Vendors page search + account + KYC filters. Pure (vendorFilters.test.js);
// the export sends the same values and the backend applies the identical
// rule (reports/admin_reports.py vendors_report).

import { matchesQuery } from '../../utils/exports.js'

export const ACCOUNT_OPTIONS = [
  { value: 'All', label: 'Account: All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export const KYC_OPTIONS = [
  { value: 'All', label: 'KYC: All' },
  { value: 'pending', label: 'KYC pending' },
  { value: 'verified', label: 'KYC verified' },
  { value: 'rejected', label: 'KYC rejected' },
]

export const vendorSearchFields = (v) => [v.id, v.name, v.email, v.phone]

export function filterVendors(vendors, { query = '', acc = 'All', kyc = 'All' } = {}) {
  return (vendors || []).filter((v) =>
    (acc === 'All' || v.acc === acc)
    && (kyc === 'All' || v.kyc === kyc)
    && matchesQuery(query, vendorSearchFields(v)))
}

export function vendorExportParams({ query = '', acc = 'All', kyc = 'All' } = {}) {
  const params = { acc, kyc }
  const q = String(query || '').trim()
  if (q) params.q = q
  return params
}
