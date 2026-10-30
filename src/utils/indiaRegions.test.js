/**
 * India states / districts helpers (./indiaRegions.js) — run with `npm test`.
 * The same rules as the backend's venues/regions.py.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATE_NAMES,
  canonicalState,
  districtsOf,
  findDistrict,
  pincodeError,
  searchRegions,
} from './indiaRegions.js';
import { INDIA_REGIONS } from '../constants/indiaRegions.js';

test('every state and union territory, each with its districts', () => {
  assert.equal(INDIA_REGIONS.filter((s) => s.type === 'state').length, 28);
  assert.equal(INDIA_REGIONS.filter((s) => s.type === 'ut').length, 8);
  assert.deepEqual([...STATE_NAMES], [...STATE_NAMES].sort((a, b) => a.localeCompare(b)));
  INDIA_REGIONS.forEach((s) => assert.ok(s.districts.length > 0, s.name));
  assert.equal(districtsOf('Telangana').length, 33);
  assert.ok(districtsOf('Karnataka').includes('Bengaluru Urban'));
  assert.ok(districtsOf('Maharashtra').includes('Pune'));
  assert.deepEqual(districtsOf('Atlantis'), []);
});

test('older names and codes resolve to one spelling', () => {
  assert.equal(canonicalState('TS'), 'Telangana');
  assert.equal(canonicalState('orissa'), 'Odisha');
  assert.equal(canonicalState('Jammu & Kashmir'), 'Jammu and Kashmir');
  assert.equal(findDistrict('Telangana', 'Medchal–Malkajgiri'), 'Medchal Malkajgiri');
  assert.equal(findDistrict('Telangana', 'Rangareddy'), 'Ranga Reddy');
  assert.equal(findDistrict('Karnataka', 'Bangalore Urban'), 'Bengaluru Urban');
  assert.equal(findDistrict('Delhi', 'South West Delhi'), 'South West');
  assert.equal(findDistrict('Karnataka', 'Warangal'), null);   // not in that state
});

test('search finds states and districts from the brief, anywhere in India', () => {
  const first = (q) => searchRegions(q)[0];
  assert.deepEqual(
    { kind: first('Medchal').kind, district: first('Medchal').district, state: first('Medchal').state },
    { kind: 'district', district: 'Medchal Malkajgiri', state: 'Telangana' },
  );
  assert.equal(first('Warangal').district, 'Warangal');
  assert.equal(first('Hanamkonda').district, 'Hanumakonda');      // alias spelling
  assert.equal(first('Visakhapatnam').state, 'Andhra Pradesh');
  assert.equal(first('Bengaluru').state, 'Karnataka');
  assert.equal(first('Chennai').state, 'Tamil Nadu');
  assert.equal(first('Mumbai').state, 'Maharashtra');
  assert.equal(first('Jaipur').state, 'Rajasthan');
  assert.equal(first('Delhi').kind, 'state');
  assert.equal(first('kar').label, 'Karnataka');                  // prefix of a state
  assert.deepEqual(searchRegions('x'), []);                        // too short
  assert.deepEqual(searchRegions('qwertyuiop'), []);               // invalid place
});

test('PIN codes: six digits, no leading 0, postal zone of the state', () => {
  assert.equal(pincodeError('500084', 'Telangana'), null);
  assert.equal(pincodeError('560034', 'Karnataka'), null);
  assert.equal(pincodeError('411001', 'Maharashtra'), null);
  assert.equal(pincodeError('110001', 'Delhi'), null);
  assert.match(pincodeError('012345'), /cannot start with 0/);
  assert.match(pincodeError('50008'), /6 digits/);
  assert.match(pincodeError('999001'), /Army Postal/);
  assert.match(pincodeError('400001', 'Karnataka'), /not in Karnataka/);
  assert.equal(pincodeError('400001', ''), null);                  // no state yet: format only
});
