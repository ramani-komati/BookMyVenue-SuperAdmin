// All venues → Edit: map location, photo order and the save confirmation
// (venueEdit.js). Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  coordinateLink, editErrors, editRequest, effectivePin, inIndia, linkPin, majorChanges, makeCover,
  movePhoto, parsePastedPin, pinChanged, pinConflict, removedPhotos, sectionsForEdit, sectionsFromRecord,
} from './venueEdit.js'

const PIN = { lat: 17.9689, lng: 79.5941 }
const OTHER_LINK = 'https://www.google.com/maps/search/?api=1&query=17.985,79.605'

const DRAFT = {
  basics: { venueName: 'Grand Hall', phone: '9000000001', email: '' },
  location: { houseStreet: '1 Main Rd', area: 'Hanamkonda', city: 'Warangal', pincode: '506001', stateName: 'Telangana', mapsLink: '' },
  details: { primaryCategory: 'Open Theatre', numScreens: '1', screenConfig: { 0: { max: '40', price: '1200' } }, amenities: ['AC'] },
  photos: { venuePhotos: [{ id: 'p1', url: 'https://cdn.example/1.jpg' }, { id: 'p2', url: 'https://cdn.example/2.jpg' }], serviceImages: [] },
}

test('pasted coordinates: decimal pairs or a pinned maps link — never a guess', () => {
  assert.deepEqual(parsePastedPin('17.9689, 79.5941'), PIN)
  assert.deepEqual(parsePastedPin('17.9689 79.5941'), PIN)
  assert.deepEqual(parsePastedPin(OTHER_LINK), { lat: 17.985, lng: 79.605 })
  assert.equal(parsePastedPin('https://maps.app.goo.gl/abc'), null)       // short link: no pin
  assert.equal(parsePastedPin('Hanamkonda'), null)
  assert.equal(parsePastedPin('0, 0'), null)
  assert.equal(parsePastedPin(''), null)
})

test('the link’s own exact pin wins, as on the server', () => {
  const loc = { mapsLink: OTHER_LINK, latitude: '17.985', longitude: '79.605' }
  assert.deepEqual(effectivePin(loc), { lat: 17.985, lng: 79.605 })
  assert.deepEqual(effectivePin({ mapsLink: '', latitude: '17.9689', longitude: '79.5941' }), PIN)
  assert.equal(effectivePin({ mapsLink: 'https://maps.app.goo.gl/x' }), null)
  assert.ok(inIndia(PIN))
  assert.ok(!inIndia({ lat: 79.5941, lng: 17.9689 }))                      // swapped
})

test('typed coordinates that disagree with the link’s pin are an error', () => {
  const loc = { ...DRAFT.location, mapsLink: OTHER_LINK, latitude: String(PIN.lat), longitude: String(PIN.lng) }
  assert.match(pinConflict(loc), /different spot/)
  assert.equal(pinConflict({ ...loc, latitude: '17.985', longitude: '79.605' }), '')   // same place
  assert.equal(pinConflict({ ...loc, latitude: '', longitude: '' }), '')
  const errors = editErrors({ ...sectionsForEdit({ draft: DRAFT }), location: loc })
  assert.match(errors.location.latitude, /different spot/)
})

test('replacing the link with a coordinate link resolves the conflict', () => {
  const link = coordinateLink(PIN)
  assert.equal(link, 'https://www.google.com/maps/search/?api=1&query=17.9689,79.5941')
  assert.deepEqual(linkPin(link), PIN)
  assert.equal(pinConflict({ mapsLink: link, latitude: String(PIN.lat), longitude: String(PIN.lng) }), '')
})

test('pin changes are detected against the SAVED pin (added, moved, cleared)', () => {
  const withPin = { mapsLink: '', latitude: String(PIN.lat), longitude: String(PIN.lng) }
  assert.equal(pinChanged(null, withPin), true)                      // added
  assert.equal(pinChanged(PIN, withPin), false)                      // unchanged
  assert.equal(pinChanged(PIN, { mapsLink: OTHER_LINK }), true)      // moved
  assert.equal(pinChanged(PIN, { mapsLink: '' }), true)              // cleared
  assert.equal(pinChanged(null, { mapsLink: '' }), false)
})

test('the save request carries locationConfirmed only when the admin confirmed', () => {
  const sections = sectionsForEdit({ draft: DRAFT })
  assert.equal('locationConfirmed' in editRequest('v1', sections, 'v'), false)
  assert.equal(editRequest('v1', sections, 'v', { locationConfirmed: true }).locationConfirmed, true)
  const withPin = { ...sections, location: { ...sections.location, latitude: '17.9689', longitude: '79.5941' } }
  assert.deepEqual(editRequest('v1', withPin, 'v').record.detail.mapPin, PIN)
})

test('a record-only venue keeps its confirmed map pin in the form', () => {
  const s = sectionsFromRecord({ name: 'X', category: 'Party hall', detail: { mapPin: PIN } })
  assert.equal(s.location.latitude, '17.9689')
  assert.equal(s.location.longitude, '79.5941')
})

test('photo order: move, make cover (first photo = cover on the customer site)', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(movePhoto(list, 'b', -1).map((p) => p.id), ['b', 'a', 'c'])
  assert.deepEqual(movePhoto(list, 'b', 1).map((p) => p.id), ['a', 'c', 'b'])
  assert.equal(movePhoto(list, 'a', -1), list)                       // already first
  assert.deepEqual(makeCover(list, 'c').map((p) => p.id), ['c', 'a', 'b'])
  const sections = sectionsForEdit({ draft: DRAFT })
  const reordered = { ...sections, photos: { ...sections.photos, venuePhotos: makeCover(sections.photos.venuePhotos, 'p2') } }
  const record = editRequest('v1', reordered, 'v').record
  assert.equal(record.image, 'https://cdn.example/2.jpg')
  assert.deepEqual(record.gallery.slice(0, 2), ['https://cdn.example/2.jpg', 'https://cdn.example/1.jpg'])
})

test('the confirmation lists name, category, location, cover and removed photos', () => {
  const saved = sectionsForEdit({ draft: DRAFT })
  assert.deepEqual(majorChanges(saved, saved, null), [])
  const edited = {
    ...saved,
    basics: { ...saved.basics, venueName: 'Grand Palace' },
    location: { ...saved.location, latitude: '17.9689', longitude: '79.5941' },
    photos: { ...saved.photos, venuePhotos: [saved.photos.venuePhotos[1]] },
  }
  const lines = majorChanges(saved, edited, null)
  assert.ok(lines.some((l) => l.includes('Grand Palace')))
  assert.ok(lines.some((l) => l.includes('Map location set to 17.9689, 79.5941')))
  assert.ok(lines.includes('A different cover photo'))
  assert.ok(lines.some((l) => l.startsWith('1 photo removed')))
  assert.deepEqual(removedPhotos(saved, edited), [{ gallery: 'venuePhotos', url: 'https://cdn.example/1.jpg' }])
  const cleared = majorChanges(saved, saved, PIN)
  assert.ok(cleared.some((l) => l.includes('Distance unknown')))
})
