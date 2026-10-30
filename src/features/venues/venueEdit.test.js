// All venues → Edit: loading, saving and validating (venueEdit.js). Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { editErrors, editRequest, firstInvalidTab, sectionsForEdit, sectionsFromRecord } from './venueEdit.js'

const DRAFT = {
  basics: { venueName: 'Grand Hall', phone: '9000000001', email: '' },
  location: { houseStreet: '1 Main Rd', area: 'Hanamkonda', city: 'Warangal', pincode: '506001', stateName: 'Telangana', mapsLink: '' },
  details: { primaryCategory: 'Open Theatre', numScreens: '1', screenConfig: { 0: { max: '40', price: '1200' } }, amenities: ['AC'] },
  photos: { venuePhotos: [{ id: 'p1', url: 'https://cdn.example/1.jpg' }], serviceImages: [] },
}

test('the form opens from the vendor draft, with timings from the record when the draft predates them', () => {
  const s = sectionsForEdit({ draft: DRAFT, record: { detail: { timings: { open: '10:00', close: '23:00', open24Hours: false } } } })
  assert.equal(s.basics.venueName, 'Grand Hall')
  assert.equal(s.details.categoryGroup, 'celebrate')
  assert.equal(s.details.primaryCategory, 'Open Theatre')
  assert.equal(s.details.openTime, '10:00')
  assert.equal(s.details.closeTime, '23:00')
  assert.equal(s.details.customCategory, '')            // blank-filled
  assert.ok(!('payout' in s))
})

test('legacy categories open as today’s venue types', () => {
  const s = sectionsForEdit({ draft: { ...DRAFT, details: { ...DRAFT.details, primaryCategory: 'Playzone' } } })
  assert.equal(s.details.categoryGroup, 'sports')
  const r = sectionsFromRecord({ name: 'Turf', category: 'Box cricket', gallery: ['https://x/1.jpg'], detail: { capacity: '20', sports: [{ name: 'Box Cricket', units: 2, price: '800' }] } })
  assert.equal(r.details.primaryCategory, 'Playzone')
  assert.equal(r.details.seatingCapacity, '20')
  assert.equal(r.details.sportConfig['Box Cricket'].units, '2')
})

test('a venue without a draft is rebuilt from its record', () => {
  const s = sectionsForEdit({ draft: null, record: {
    name: 'Iron Gym', category: 'Gym', locality: 'Kazipet', city: 'Warangal', price: '300',
    gallery: ['https://x/1.jpg', 'https://x/2.jpg'],
    detail: { description: 'Lifting', amenities: ['Lockers'], timings: { open24Hours: true }, capacity: '30', unitCount: 1 },
  } })
  assert.equal(s.basics.venueName, 'Iron Gym')
  assert.equal(s.details.primaryCategory, 'Gym')
  assert.equal(s.details.categoryGroup, 'fitness')
  assert.equal(s.details.open24Hours, true)
  assert.equal(s.photos.venuePhotos.length, 2)
  assert.equal(s.details.screenConfig[0].price, '300')
})

test('the save request carries the sections and the rebuilt record — never bank details', () => {
  const s = sectionsForEdit({ draft: { ...DRAFT, payout: { acctNumber: '123456789012' } } })
  s.details.openTime = '09:00'
  s.details.closeTime = '22:00'
  const body = editRequest('11111111-1111-1111-1111-111111111111', s, 'v1')
  assert.equal(body.version, 'v1')
  assert.deepEqual(Object.keys(body.sections).sort(), ['basics', 'details', 'location', 'photos'])
  assert.equal(body.record.category, 'Open-air theatre')
  assert.deepEqual(body.record.detail.timings, { open: '09:00', close: '22:00', open24Hours: false })
  assert.equal(body.record.detail.categoryGroup, 'celebrate')
  assert.ok(!JSON.stringify(body).includes('123456789012'))
})

test('validation: name, a photo, a category and the timings are required', () => {
  const s = sectionsForEdit({ draft: DRAFT })
  let errors = editErrors(s)
  assert.ok(errors.details.openTime)                     // no timings yet
  assert.equal(firstInvalidTab(errors), 'details')
  s.details.open24Hours = true
  assert.equal(firstInvalidTab(editErrors(s)), '')
  s.basics.venueName = ''
  s.photos.venuePhotos = []
  errors = editErrors(s)
  assert.ok(errors.basics.venueName)
  assert.ok(errors.photos.venuePhotos)
  assert.equal(firstInvalidTab(errors), 'basics')
})

test('validation: Celebrate needs its venue type; formats are still checked', () => {
  const s = sectionsForEdit({ draft: DRAFT })
  s.details.open24Hours = true
  s.details.primaryCategory = ''
  s.details.categoryGroup = 'celebrate'
  assert.equal(editErrors(s).details.primaryCategory, 'Select the venue type')
  s.details.primaryCategory = 'Private Hall'
  s.location.pincode = '12'
  assert.ok(editErrors(s).location.pincode)
})
