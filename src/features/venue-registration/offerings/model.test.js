// Fitness / Resort / Big Screen Surprise registration model
// (offerings/model.js). An identical copy runs in the super admin app.
// Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankPackage, blankPlan, blankShow, blockOf, offeringErrors, offeringKindOf, offeringMissing,
  offeringPrice, recordBlock,
} from './model.js';

const gym = (plans) => ({ primaryCategory: 'Gym', fitness: { plans } });

test('which venue types sell memberships, packages or surprises', () => {
  assert.equal(offeringKindOf('Gym'), 'fitness');
  assert.equal(offeringKindOf('Resort'), 'resort');
  assert.equal(offeringKindOf('Big Screen Surprise'), 'surprise');
  assert.equal(offeringKindOf('Private Hall'), '');
});

test('a gym needs at least one priced, enabled plan', () => {
  assert.ok(offeringErrors(gym([]))['fitness.plans']);
  const plan = { ...blankPlan('monthly'), price: '1500' };
  assert.deepEqual(offeringErrors(gym([plan])), {});
  const off = { ...plan, enabled: false };
  assert.ok(offeringErrors(gym([off]))['fitness.plans']);
  assert.ok(offeringErrors(gym([{ ...plan, price: '-3' }]))[`fitness.plans.${plan.id}.price`]);
  // Visit-limited expiry needs a visit count.
  const pt = { ...plan, expiryRule: 'visits_or_duration', visits: '' };
  assert.ok(offeringErrors(gym([pt]))[`fitness.plans.${plan.id}.visits`]);
  assert.ok(offeringMissing(gym([])).length > 0);
});

test('resort packages: persons, slots and check-in rules', () => {
  const pkg = { ...blankPackage('day'), name: 'Family Day Out', price: '800', maxPersons: '10' };
  const resort = (packages, extra = {}) => ({ primaryCategory: 'Resort', resort: { packages, ...extra } });
  assert.ok(offeringErrors(resort([pkg]))[`resort.packages.${pkg.id}.checkIn`]);         // full day, no times
  assert.deepEqual(offeringErrors(resort([pkg], { checkIn: '10:00', checkOut: '18:00' })), {});
  const half = { ...pkg, duration: 'half_day', slots: [{ start: '13:00', end: '09:00' }] };
  assert.ok(offeringErrors(resort([half]))[`resort.packages.${pkg.id}.slots`]);
  assert.ok(offeringErrors(resort([{ ...pkg, minPersons: '5', maxPersons: '2' }], { checkIn: '10:00', checkOut: '18:00' }))[`resort.packages.${pkg.id}.maxPersons`]);
  // A legacy resort priced by the hour still passes without packages.
  assert.deepEqual(offeringErrors({ primaryCategory: 'Resort', screenConfig: { 0: { price: '500' } }, packages: [{ label: 'Day', price: '500' }] }), {});
});

test('one screen cannot have two shows at the same time', () => {
  const a = { ...blankShow(), movie: 'Leo', screen: '1', times: ['18:30'] };
  const b = { ...blankShow(), id: 'show-b', movie: 'Devara', screen: '1', times: ['18:30'] };
  const draft = (shows) => ({ primaryCategory: 'Big Screen Surprise', surprise: { ...blockOf({}, 'surprise'), price: '999', shows } });
  assert.ok(offeringErrors(draft([a, b]))['surprise.shows.show-b.times']);
  assert.deepEqual(offeringErrors(draft([a, { ...b, screen: '2' }]))['surprise.shows.show-b.screen'], 'Only 1 screen offered');
  assert.deepEqual(offeringErrors({ ...draft([a]), surprise: { ...draft([a]).surprise, screens: '2' } }), {});
});

test('the public record never carries owner or manager contacts', () => {
  const resort = { primaryCategory: 'Resort', resort: { ...blockOf({}, 'resort'), owner: { mobile: '9000000000' }, packages: [] } };
  assert.equal('owner' in recordBlock(resort), false);
  const surprise = { primaryCategory: 'Big Screen Surprise', subCategories: { Birthday: true, Love: false }, surprise: { ...blockOf({}, 'surprise'), manager: { phone: '9000000000' }, occasionPrices: { Birthday: '1200', Love: '900' } } };
  const block = recordBlock(surprise, { venuePhotos: [{ url: 'https://x/ext.jpg' }], theatreLogo: [{ url: 'https://x/logo.png' }] });
  assert.equal('manager' in block, false);
  assert.deepEqual(block.occasions, ['Birthday']);
  assert.deepEqual(block.occasionPrices, { Birthday: '1200' });     // only offered occasions
  assert.equal(block.logo, 'https://x/logo.png');
  assert.deepEqual(block.exteriorImages, ['https://x/ext.jpg']);
  assert.equal(recordBlock({ primaryCategory: 'Private Hall' }), null);
});

test('card price is the cheapest plan / package / surprise', () => {
  const plans = [{ ...blankPlan('monthly'), price: '1500' }, { ...blankPlan('day_pass'), price: '200' }, { ...blankPlan('annual'), price: '100', enabled: false }];
  assert.deepEqual(offeringPrice(gym(plans)), { price: '200', unit: 'onwards' });
  assert.equal(offeringPrice({ primaryCategory: 'Private Hall' }), null);
  assert.equal(offeringPrice(gym([])), null);
});
