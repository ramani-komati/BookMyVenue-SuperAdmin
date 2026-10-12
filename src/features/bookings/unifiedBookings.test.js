// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import { orderBadge } from '../events/orderStatus.js'
import {
  STATUS_OPTIONS,
  countByKind,
  filterBookings,
  matchesDate,
  unifyBookings,
} from './unifiedBookings.js'

// Shapes as /api/admin/bootstrap returns them (trimmed to what is used).
const venue = (over = {}) => ({
  id: 'bk_venue000001', customer: 'Asha', phone: '9100000001', venue: 'Grand Hall',
  date: '2026-10-20', createdAt: '2026-10-10T10:00:00Z', amountNum: 1220,
  method: 'upi', status: 'confirmed', ...over,
})
const order = (over = {}) => ({
  id: 'eo_aaaaaaaaaaaa', kind: 'event', eventId: 'evt-1', eventName: 'ABC Dandiya Night',
  location: 'Open Grounds, Warangal', customer: 'Ravi', phone: '9100000002',
  date: '2026-10-21', startTime: '18:00', endTime: '22:00',
  items: [{ key: 'adult', label: 'Adult', qty: 2, price: 500, subtotal: 1000 }],
  tickets: 2, amount: 1020, fee: 20, createdAt: '2026-10-11T10:00:00Z',
  status: 'confirmed', paymentStatus: 'confirmed', paid: true, method: 'online',
  razorpayOrderId: 'order_X1', razorpayPaymentId: 'pay_X1', removable: false, ...over,
})

test('venue bookings still appear, unchanged', () => {
  const b = venue()
  const [row] = unifyBookings([b], [])
  assert.equal(row.kind, 'venue')
  assert.equal(row.id, b.id)
  assert.equal(row.amountNum, 1220)
  assert.equal(row.venue, 'Grand Hall')
  assert.equal(row.status, 'confirmed')
})

test('event ticket orders appear in the unified list', () => {
  const rows = unifyBookings([venue()], [order()])
  assert.deepEqual(rows.map((r) => r.kind).sort(), ['event', 'venue'])
  const ev = rows.find((r) => r.kind === 'event')
  assert.equal(ev.title, 'ABC Dandiya Night')
  assert.equal(ev.amountNum, 1020) // money column reads the order amount
})

test('newest first across both kinds', () => {
  const rows = unifyBookings(
    [venue({ id: 'bk_old', createdAt: '2026-10-01T00:00:00Z' })],
    [order({ id: 'eo_new', createdAt: '2026-10-05T00:00:00Z' })],
  )
  assert.deepEqual(rows.map((r) => r.id), ['eo_new', 'bk_old'])
})

test('each order appears only once', () => {
  const rows = unifyBookings(
    [venue(), venue()],
    [order(), order(), order({ id: 'eo_bbbbbbbbbbbb' })],
  )
  assert.equal(rows.length, 3)
  assert.equal(new Set(rows.map((r) => r.key)).size, 3)
})

test('a venue and an event with the same raw id are NOT merged', () => {
  const rows = unifyBookings([venue({ id: 'same' })], [order({ id: 'same' })])
  assert.equal(rows.length, 2)
})

test('type filter', () => {
  const rows = unifyBookings([venue()], [order()])
  assert.deepEqual(filterBookings(rows, { type: 'venue' }).map((r) => r.kind), ['venue'])
  assert.deepEqual(filterBookings(rows, { type: 'event' }).map((r) => r.kind), ['event'])
  assert.equal(filterBookings(rows, { type: 'All' }).length, 2)
})

test('status filter works for both kinds', () => {
  const rows = unifyBookings(
    [venue(), venue({ id: 'bk_c', status: 'cancelled' })],
    [order(), order({ id: 'eo_c', status: 'cancelled', paymentStatus: 'cancelled', paid: false })],
  )
  const confirmed = filterBookings(rows, { status: 'confirmed' })
  assert.deepEqual(confirmed.map((r) => r.id).sort(), ['bk_venue000001', 'eo_aaaaaaaaaaaa'])
  const cancelled = filterBookings(rows, { status: 'cancelled' })
  assert.deepEqual(cancelled.map((r) => r.id).sort(), ['bk_c', 'eo_c'])
  const eventCancelled = filterBookings(rows, { type: 'event', status: 'cancelled' })
  assert.deepEqual(eventCancelled.map((r) => r.id), ['eo_c'])
})

test('pending, failed and abandoned orders are never filtered as paid', () => {
  const rows = unifyBookings([], [
    order({ id: 'eo_p', status: 'payment_pending', paymentStatus: 'payment_pending', paid: false }),
    order({ id: 'eo_x', status: 'expired', paymentStatus: 'payment_pending', paid: false }),
    order({ id: 'eo_f', status: 'failed', paymentStatus: 'failed', paid: false }),
  ])
  assert.equal(filterBookings(rows, { status: 'confirmed' }).length, 0)
  assert.deepEqual(filterBookings(rows, { status: 'payment_pending' }).map((r) => r.id), ['eo_p'])
  assert.deepEqual(filterBookings(rows, { status: 'expired' }).map((r) => r.id), ['eo_x'])
  assert.deepEqual(filterBookings(rows, { status: 'failed' }).map((r) => r.id), ['eo_f'])
})

test('statuses keep their real labels', () => {
  const label = (o) => orderBadge(o)[1]
  assert.equal(label({ paymentStatus: 'confirmed', status: 'confirmed' }), 'Paid')
  assert.equal(label({ paymentStatus: 'payment_pending', status: 'payment_pending' }), 'Awaiting payment')
  assert.equal(label({ paymentStatus: 'payment_pending', status: 'expired' }), 'Abandoned checkout')
  assert.equal(label({ paymentStatus: 'failed', status: 'failed' }), 'Payment failed')
  assert.equal(label({ paymentStatus: 'cancelled', status: 'cancelled' }), 'Cancelled')
  assert.equal(label({ paymentStatus: 'refund_pending', status: 'refund_pending' }), 'Refund pending')
  assert.equal(label({ paymentStatus: 'refunded', status: 'refunded' }), 'Refunded')
  // An unknown status is shown as-is, never coerced to "Paid".
  assert.equal(label({ paymentStatus: 'mystery', status: 'mystery' }), 'mystery')
})

test('every event status the backend emits has a filter option', () => {
  const values = new Set(STATUS_OPTIONS.filter((o) => o.kinds.includes('event')).map((o) => o.value))
  for (const s of ['confirmed', 'completed', 'payment_pending', 'expired', 'failed', 'cancelled', 'refund_pending', 'refunded']) {
    assert.ok(values.has(s), s)
  }
})

test('search covers ids, names and customer details for both kinds', () => {
  const rows = unifyBookings([venue()], [order()])
  const ids = (query) => filterBookings(rows, { query }).map((r) => r.id)
  assert.deepEqual(ids('eo_aaaa'), ['eo_aaaaaaaaaaaa'])        // order ID
  assert.deepEqual(ids('bk_venue'), ['bk_venue000001'])        // booking ID
  assert.deepEqual(ids('#000001'), ['bk_venue000001'])         // short booking ref
  assert.deepEqual(ids('dandiya'), ['eo_aaaaaaaaaaaa'])        // event name
  assert.deepEqual(ids('grand hall'), ['bk_venue000001'])      // venue name
  assert.deepEqual(ids('ravi'), ['eo_aaaaaaaaaaaa'])           // customer name
  assert.deepEqual(ids('9100000001'), ['bk_venue000001'])      // phone
  assert.deepEqual(ids('pay_X1'), ['eo_aaaaaaaaaaaa'])         // gateway payment id
  assert.equal(ids('').length, 2)
})

test('date filter uses each row\'s own date', () => {
  const today = '2026-10-21'
  const rows = unifyBookings(
    [venue({ id: 'bk_past', date: '2026-10-01' })],
    [order({ id: 'eo_today', date: today }), order({ id: 'eo_next', date: '2026-11-01' })],
  )
  const ids = (date) => filterBookings(rows, { date }, today).map((r) => r.id).sort()
  assert.deepEqual(ids('today'), ['eo_today'])
  assert.deepEqual(ids('upcoming'), ['eo_next'])
  assert.deepEqual(ids('past'), ['bk_past'])
  assert.equal(matchesDate({ date: '' }, 'today', today), false)
})

test('counts add up per kind and to the total', () => {
  const rows = unifyBookings(
    [venue(), venue({ id: 'bk_2' })],
    [order(), order({ id: 'eo_2' }), order({ id: 'eo_3' })],
  )
  const c = countByKind(rows)
  assert.deepEqual(c, { venue: 2, event: 3 })
  assert.equal(c.venue + c.event, rows.length)
  const onlyEvents = filterBookings(rows, { type: 'event' })
  assert.deepEqual(countByKind(onlyEvents), { venue: 0, event: 3 })
})

test('tolerates a backend without eventOrders', () => {
  assert.equal(unifyBookings([venue()], undefined).length, 1)
  assert.equal(unifyBookings(undefined, undefined).length, 0)
})
