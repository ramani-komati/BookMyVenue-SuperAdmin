// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import { filterVendors, vendorExportParams } from './vendorFilters.js'

// Shapes as /api/admin/bootstrap `vendors` returns them.
const VENDORS = [
  { id: 7, name: 'Vendor One', phone: '9000000001', email: 'one@x.in', kyc: 'pending', acc: 'active' },
  { id: 8, name: 'Turf King', phone: '9000000002', email: '', kyc: 'verified', acc: 'suspended' },
  { id: 9, name: 'Hall Co', phone: '9000000003', email: 'hall@x.in', kyc: 'verified', acc: 'active' },
]
const ids = (rows) => rows.map((v) => v.id)

test('filters combine', () => {
  assert.deepEqual(ids(filterVendors(VENDORS)), [7, 8, 9])
  assert.deepEqual(ids(filterVendors(VENDORS, { acc: 'suspended' })), [8])
  assert.deepEqual(ids(filterVendors(VENDORS, { kyc: 'verified' })), [8, 9])
  assert.deepEqual(ids(filterVendors(VENDORS, { kyc: 'verified', acc: 'active' })), [9])
  assert.deepEqual(ids(filterVendors(VENDORS, { query: 'x.in' })), [7, 9])
  assert.deepEqual(ids(filterVendors(VENDORS, { query: 'turf', acc: 'active' })), [])
})

test('the export sends the same filters the page applies', () => {
  assert.deepEqual(vendorExportParams({ query: ' hall ', acc: 'active', kyc: 'verified' }),
    { acc: 'active', kyc: 'verified', q: 'hall' })
  assert.deepEqual(vendorExportParams(), { acc: 'All', kyc: 'All' })
})
