// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import { filterUsers, userExportParams } from './userFilters.js'

// Shapes as /api/admin/bootstrap `users` returns them.
const USERS = [
  { id: 1, name: 'Asha', email: 'asha@example.com', phone: '9100000001', status: 'active' },
  { id: 2, name: 'Ravi Kumar', email: '', phone: '9100000002', status: 'blocked' },
  { id: 3, name: '', email: null, phone: '9200000003', status: 'active' },
]
const ids = (rows) => rows.map((u) => u.id)

test('no filters lists every user', () => {
  assert.deepEqual(ids(filterUsers(USERS)), [1, 2, 3])
  assert.deepEqual(ids(filterUsers(USERS, { query: '', status: 'All' })), [1, 2, 3])
})

test('search reads name, email, phone and id', () => {
  assert.deepEqual(ids(filterUsers(USERS, { query: 'kumar' })), [2])
  assert.deepEqual(ids(filterUsers(USERS, { query: 'EXAMPLE' })), [1])
  assert.deepEqual(ids(filterUsers(USERS, { query: '9200' })), [3])
  assert.deepEqual(ids(filterUsers(USERS, { query: 'nobody' })), [])
})

test('status filter', () => {
  assert.deepEqual(ids(filterUsers(USERS, { status: 'blocked' })), [2])
  assert.deepEqual(ids(filterUsers(USERS, { status: 'active', query: '9100' })), [1])
})

test('the export sends the same filters the page applies', () => {
  assert.deepEqual(userExportParams({ query: '  asha ', status: 'active' }), { status: 'active', q: 'asha' })
  assert.deepEqual(userExportParams({ query: '', status: 'All' }), { status: 'All' })
  assert.deepEqual(userExportParams(), { status: 'All' })
})

test('missing list is empty, never a crash', () => {
  assert.deepEqual(filterUsers(undefined, { query: 'x' }), [])
})
