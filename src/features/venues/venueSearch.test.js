// Live venues + All venues search (venueSearch.js). Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { searchVenues, venueSearchFields, venueSearchParams } from './venueSearch.js'

// Shapes as /api/admin/bootstrap `venues` returns them (adminpanel venue_row).
const VENUES = [
  { id: '8f1c-aaaa', name: 'Grand Hall', vendor: 'Ravi', vendorBusiness: 'RK Events', category: 'Party hall', categoryGroup: 'celebrate', city: 'Warangal', district: 'Hanamkonda', area: 'Kazipet', status: 'live' },
  { id: '22b0-bbbb', name: 'Turf One', vendor: 'Asha', vendorBusiness: '', category: 'Play zone', categoryGroup: 'sports', city: 'Hyderabad', district: 'Hyderabad', area: 'Kondapur', status: 'paused' },
  { id: '91d3-cccc', name: 'Karaoke Den', vendor: '9000000003', category: 'Karaoke', categoryGroup: '', city: '', district: 'Karimnagar', area: '', status: 'deleted' },
]
const ids = (rows) => rows.map((v) => v.id)

test('an empty search lists every venue', () => {
  assert.deepEqual(ids(searchVenues(VENUES, '')), ids(VENUES))
  assert.deepEqual(ids(searchVenues(VENUES, '   ')), ids(VENUES))
  assert.deepEqual(ids(searchVenues(VENUES)), ids(VENUES))
})

test('search reads venue name, vendor and business name, case-insensitively', () => {
  assert.deepEqual(ids(searchVenues(VENUES, 'grand')), ['8f1c-aaaa'])
  assert.deepEqual(ids(searchVenues(VENUES, 'ASHA')), ['22b0-bbbb'])
  assert.deepEqual(ids(searchVenues(VENUES, 'rk events')), ['8f1c-aaaa'])
})

test('search reads city, district, area, category and its group', () => {
  assert.deepEqual(ids(searchVenues(VENUES, 'hyderabad')), ['22b0-bbbb'])
  assert.deepEqual(ids(searchVenues(VENUES, 'karimnagar')), ['91d3-cccc'])
  assert.deepEqual(ids(searchVenues(VENUES, 'kazipet')), ['8f1c-aaaa'])
  assert.deepEqual(ids(searchVenues(VENUES, 'play zone')), ['22b0-bbbb'])
  assert.deepEqual(ids(searchVenues(VENUES, 'sports')), ['22b0-bbbb'])          // group label
  assert.deepEqual(ids(searchVenues(VENUES, 'celebrate')), ['8f1c-aaaa'])
  assert.deepEqual(ids(searchVenues(VENUES, 'karaoke')), ['91d3-cccc'])         // vendor's own category
})

test('search reads the venue id', () => {
  assert.deepEqual(ids(searchVenues(VENUES, '22b0')), ['22b0-bbbb'])
})

test('no match is an empty list, and a missing list never crashes', () => {
  assert.deepEqual(searchVenues(VENUES, 'nowhere'), [])
  assert.deepEqual(searchVenues(undefined, 'x'), [])
  // Blank / missing fields are skipped, never matched as "undefined".
  assert.deepEqual(searchVenues(VENUES, 'undefined'), [])
  assert.deepEqual(searchVenues(VENUES, 'null'), [])
})

test('search combines with a status filter (applied on the matches)', () => {
  const matched = searchVenues(VENUES, 'a')
  assert.deepEqual(ids(matched.filter((v) => v.status === 'paused')), ['22b0-bbbb'])
})

test('the export sends the same search', () => {
  assert.deepEqual(venueSearchParams('  turf '), { q: 'turf' })
  assert.deepEqual(venueSearchParams(''), {})
  assert.deepEqual(venueSearchParams(), {})
})

test('searchable fields never include bank details', () => {
  const row = { ...VENUES[0], ifsc: 'HDFC0001234', accountNumber: '123456789012' }
  assert.equal(venueSearchFields(row).join(' ').includes('HDFC'), false)
  assert.deepEqual(searchVenues([row], 'hdfc0001234'), [])
})
