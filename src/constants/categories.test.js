// The venue category model (constants/categories.js) and Venue Timings
// (utils/venueTimings.js). An identical copy of this file runs in the super
// admin app, against its identical copies of both modules. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIMARY_GROUPS, VENUE_TYPES, draftGroup, groupOfType, normalizeVenueType, onlyTypeOf,
  primaryOptions, typeOptions, venueTypeLabel,
} from './categories.js';
import {
  bookablePeriods, closesNextDay, detailsFromTimings, timingsErrors, timingsFromDetails, timingsLabel,
} from '../utils/venueTimings.js';

test('the primary categories, in order — Explore and Events are not venue categories', () => {
  assert.deepEqual(primaryOptions().map((o) => o.label), ['Celebrate', 'Sports', 'Gaming', 'Resorts', 'Fitness']);
  assert.deepEqual(primaryOptions({ others: true }).map((o) => o.value).at(-1), 'others');
  const labels = PRIMARY_GROUPS.map((g) => g.label.toLowerCase());
  assert.ok(!labels.includes('explore') && !labels.includes('events'));
});

test('old top-level options are no longer primary categories', () => {
  const primary = primaryOptions({ others: true }).map((o) => o.label);
  for (const old of ['Playzone', 'Playstation', 'Private Hall', 'Private Theatre', 'Open Theatre', 'Gym']) {
    assert.ok(!primary.includes(old), old);
  }
});

test('Celebrate holds the three venue types; the others hold one', () => {
  assert.deepEqual(typeOptions('celebrate'), [
    { value: 'Private Hall', label: 'Private Hall' },
    { value: 'Private Theatre', label: 'Private Theatre' },
    { value: 'Open Theatre', label: 'Open Air Theatre' },
    // Added 2026-10-30 — the original three keep their place and order.
    { value: 'Big Screen Surprise', label: 'Big Screen Surprise' },
  ]);
  assert.deepEqual(typeOptions('sports'), []);
  assert.equal(onlyTypeOf('sports'), 'Playzone');
  assert.equal(onlyTypeOf('gaming'), 'Playstation');
  assert.equal(onlyTypeOf('resorts'), 'Resort');
  assert.equal(onlyTypeOf('fitness'), 'Gym');
  assert.equal(onlyTypeOf('celebrate'), '');
});

test('legacy and catalogue values map onto the new model', () => {
  const cases = {
    Playzone: 'sports', 'Play zone': 'sports', 'Box cricket': 'sports', 'Swimming pool': 'sports', Pickleball: 'sports',
    Playstation: 'gaming', PlayStation: 'gaming', 'Gaming lounge': 'gaming',
    'Private Hall': 'celebrate', 'Party hall': 'celebrate', 'Private theatre': 'celebrate',
    'Open Theatre': 'celebrate', 'Open-air theatre': 'celebrate', 'open air theater': 'celebrate',
    Resort: 'resorts', Gym: 'fitness', Fitness: 'fitness', 'Iron Gym Studio': 'fitness',
    'Rooftop Lounge': '', '': '',
  };
  for (const [raw, group] of Object.entries(cases)) assert.equal(groupOfType(raw), group, raw);
  assert.equal(normalizeVenueType('Open-air theatre'), 'Open Theatre');
  assert.equal(normalizeVenueType('Box cricket'), 'Playzone');
  assert.equal(normalizeVenueType('Fitness'), 'Gym');
  assert.equal(normalizeVenueType('nonsense'), '');
});

test('each venue type publishes as its catalogue category', () => {
  assert.equal(VENUE_TYPES['Open Theatre'].category, 'Open-air theatre');   // used to be filed as a private theatre
  assert.equal(VENUE_TYPES.Playzone.category, 'Play zone');
  assert.equal(VENUE_TYPES.Gym.category, 'Gym');
  assert.equal(venueTypeLabel('Playzone'), 'Sports');
  assert.equal(venueTypeLabel('Playstation'), 'Gaming');
});

test('a draft keeps its Celebrate choice before the venue type is picked', () => {
  assert.equal(draftGroup({ categoryGroup: 'celebrate', primaryCategory: '' }), 'celebrate');
  assert.equal(draftGroup({ primaryCategory: 'Playzone' }), 'sports');      // old draft, no group stored
  assert.equal(draftGroup({ categoryGroup: 'bogus', primaryCategory: 'Gym' }), 'fitness');
});

test('Venue Timings: valid, 24 hours, missing and invalid', () => {
  assert.deepEqual(timingsErrors({ openTime: '09:00', closeTime: '22:00' }), {});
  assert.deepEqual(timingsErrors({ open24Hours: true }), {});
  assert.ok(timingsErrors({}).openTime);
  assert.ok(timingsErrors({ openTime: '09:00' }).closeTime);
  assert.ok(timingsErrors({ openTime: '25:00', closeTime: '22:00' }).openTime);
  assert.ok(timingsErrors({ openTime: '10:00', closeTime: '10:00' }).closeTime);
  assert.ok(timingsErrors({ openTime: '01:00', closeTime: '05:00' }).closeTime);   // nothing bookable
  assert.deepEqual(timingsErrors({}, { required: false }), {});
});

test('Venue Timings: after midnight, labels and round trip', () => {
  assert.equal(closesNextDay({ openTime: '18:00', closeTime: '02:00' }), true);
  assert.equal(closesNextDay({ openTime: '09:00', closeTime: '00:00' }), false);   // midnight is the same day
  assert.equal(timingsLabel({ open: '18:00', close: '02:00' }), '6:00 PM – 2:00 AM (next day)');
  assert.equal(timingsLabel({ open: '09:00', close: '22:00' }), '9:00 AM – 10:00 PM');
  assert.equal(timingsLabel({ open24Hours: true }), 'Open 24 hours');
  assert.equal(timingsLabel(null), '');
  const t = timingsFromDetails({ openTime: '9:00', closeTime: '22:00' });
  assert.deepEqual(t, { open: '09:00', close: '22:00', open24Hours: false });
  assert.deepEqual(detailsFromTimings(t), { openTime: '09:00', closeTime: '22:00', open24Hours: false });
  assert.equal(timingsFromDetails({}), null);
});

test('Venue Timings on the 6 AM – midnight booking grid (same rules as the server)', () => {
  assert.deepEqual(bookablePeriods(null), [[360, 1440]]);
  assert.deepEqual(bookablePeriods({ open24Hours: true }), [[360, 1440]]);
  assert.deepEqual(bookablePeriods({ open: '09:10', close: '21:50' }), [[570, 1290]]);
  assert.deepEqual(bookablePeriods({ open: '22:00', close: '07:00' }), [[360, 420], [1320, 1440]]);
});

test('admin lists name a venue by its primary category', async () => {
  const { categoryDisplay } = await import('./categories.js');
  assert.equal(categoryDisplay('Party hall'), 'Celebrate · Private Hall');
  assert.equal(categoryDisplay('Open-air theatre'), 'Celebrate · Open Air Theatre');
  assert.equal(categoryDisplay('Play zone'), 'Sports');
  assert.equal(categoryDisplay('Box cricket'), 'Sports');
  assert.equal(categoryDisplay('Playstation'), 'Gaming');
  assert.equal(categoryDisplay('Gym'), 'Fitness');
  assert.equal(categoryDisplay('Rooftop Lounge'), 'Rooftop Lounge');
});
