// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import { cleanParams, exportErrorMessage, exportFileName, matchesQuery } from './exports.js'

test('file names carry the page and the day', () => {
  assert.equal(exportFileName('admin_users', '2026-10-24'), 'admin_users_2026-10-24.xlsx')
  assert.equal(exportFileName('admin_payments', '2026-01-02'), 'admin_payments_2026-01-02.xlsx')
})

test('blank filters are dropped from the query string', () => {
  assert.deepEqual(cleanParams({ from: '', to: '2026-10-01', q: '  ', status: 'All', x: null }),
    { to: '2026-10-01', status: 'All' })
  assert.deepEqual(cleanParams(), {})
})

test('search matches the server rule: joined fields, case-insensitive substring', () => {
  const row = [12, 'Asha Rao', 'asha@example.com', '9100000001']
  assert.equal(matchesQuery('', row), true)
  assert.equal(matchesQuery('  ASHA ', row), true)
  assert.equal(matchesQuery('example.com', row), true)
  assert.equal(matchesQuery('9100', row), true)
  assert.equal(matchesQuery('12', row), true)
  assert.equal(matchesQuery('ravi', row), false)
  // Blank fields are skipped, exactly as the backend skips None / ''.
  assert.equal(matchesQuery('rao 9100', [12, 'Asha Rao', null, '9100000001']), true)
  assert.equal(matchesQuery('rao  9100', [12, 'Asha Rao', '', '9100000001']), false)
})

test('export errors read clearly', () => {
  assert.match(exportErrorMessage({ status: 401 }, 'users'), /session has expired.*export users/)
  assert.match(exportErrorMessage({ status: 403 }), /session has expired/)
  assert.match(exportErrorMessage({ status: 404 }), /not available on the server yet/)
  assert.match(exportErrorMessage({ status: 429 }), /Too many exports/)
  assert.match(exportErrorMessage(new TypeError('Failed to fetch')), /Could not reach the server/)
  assert.equal(exportErrorMessage({ status: 400, message: 'The start date is after the end date.' }, 'the payments report'),
    'Could not export the payments report: The start date is after the end date.')
})
