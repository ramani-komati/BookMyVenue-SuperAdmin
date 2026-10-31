/**
 * utils/phone.js — run with `npm test` (node --test). Same cases as the
 * backend's accounts/test_phone_validation.py.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobile, normalizePhone } from './phone.js';

test('the audit input is refused, never reduced to digits', () => {
  assert.equal(normalizePhone('12345abc12345'), null);
  assert.equal(normalizeMobile('12345abc12345'), null);
});

test('country code and separators are normalised', () => {
  for (const raw of ['9876543210', '+91 98765 43210', '+919876543210', '919876543210',
    '09876543210', '98765-43210', '(987) 654-3210', ' 9876543210 ']) {
    assert.equal(normalizeMobile(raw), '9876543210', raw);
  }
});

test('malformed numbers are refused', () => {
  for (const raw of ['98765abc10', '987654321', '98765432101', '+1 9876543210', '', null, undefined, 'abc', '98765_43210']) {
    assert.equal(normalizeMobile(raw), null, String(raw));
  }
});

test('mobile numbers must start 6–9; plain phone numbers need not', () => {
  assert.equal(normalizeMobile('1234567890'), null);
  assert.equal(normalizeMobile('5876543210'), null);
  assert.equal(normalizePhone('4023456789'), '4023456789'); // a landline is still a phone
});
