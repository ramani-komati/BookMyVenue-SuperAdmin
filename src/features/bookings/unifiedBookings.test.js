// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import { orderBadge } from '../events/orderStatus.js'
import { displayRef } from '../../utils/format.js'
import {
  STATUS_OPTIONS,
  countByKind,
  createdISO,
  exportFilename,
  exportParams,
  deletePrompt,
  filterBookings,
  matchesDate,
  statusBadge,
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

// ---- booking IDs ---------------------------------------------------------

test('a new event order shows its actual 6-character id; venue bookings unchanged', () => {
  const rows = unifyBookings([venue()], [order({ id: 'A7K29X' })])
  const ev = rows.find((r) => r.kind === 'event')
  const vb = rows.find((r) => r.kind === 'venue')
  assert.equal(displayRef(ev), '#A7K29X')
  assert.equal(ev.id, 'A7K29X')                  // the id IS the booking ID
  assert.equal(ev.key, 'event:A7K29X')
  assert.equal(displayRef(vb), '#000001')        // venue: derived, as before
  assert.equal(displayRef({ id: 'bk_3f8a92c1d04e' }), '#C1D04E')
})

test('older event orders keep their long id and short display, as before', () => {
  assert.equal(displayRef({ id: 'eo_100a524e06f6' }), '#4E06F6')
  // No separate reference field is read any more.
  assert.equal(displayRef({ id: 'eo_100a524e06f6', reference: 'ZZZZZZ' }), '#4E06F6')
})

test('search finds an event order by its id, with or without #, both id shapes', () => {
  const rows = unifyBookings([venue()], [order({ id: 'A7K29X' }), order({ id: 'eo_100a524e06f6' })])
  const ids = (query) => filterBookings(rows, { query }).map((r) => r.id)
  assert.deepEqual(ids('a7k29x'), ['A7K29X'])
  assert.deepEqual(ids('#A7K29X'), ['A7K29X'])
  assert.deepEqual(ids('eo_100a524e06f6'), ['eo_100a524e06f6'])
  assert.deepEqual(ids('#4e06f6'), ['eo_100a524e06f6'])
})

// ---- statuses ------------------------------------------------------------

test('venue statuses get their real labels and are never shown as paid when unpaid', () => {
  const label = (b) => statusBadge(unifyBookings([venue(b)], [])[0])[1]
  assert.equal(label({ status: 'confirmed', paymentStatus: 'confirmed' }), 'Confirmed')
  assert.equal(label({ status: 'completed', paymentStatus: 'confirmed' }), 'Completed')
  assert.equal(label({ status: 'payment_pending', paymentStatus: 'payment_pending' }), 'Awaiting payment')
  assert.equal(label({ status: 'payment_pending', paymentStatus: 'payment_pending', holdExpired: true }), 'Abandoned checkout')
  assert.equal(label({ status: 'cancelled', paymentStatus: 'cancelled' }), 'Cancelled')
  assert.equal(label({ status: 'refund_pending' }), 'Refund pending')
  assert.equal(label({ status: 'refunded' }), 'Refunded')
  assert.equal(label({ status: 'mystery' }), 'mystery')
})

test('event statuses: paid, pending, failed, cancelled, completed', () => {
  const label = (o) => statusBadge(unifyBookings([], [order(o)])[0])[1]
  assert.equal(label({ status: 'confirmed', paymentStatus: 'confirmed' }), 'Paid')
  assert.equal(label({ status: 'completed', paymentStatus: 'confirmed' }), 'Completed')
  assert.equal(label({ status: 'payment_pending', paymentStatus: 'payment_pending', paid: false }), 'Awaiting payment')
  assert.equal(label({ status: 'failed', paymentStatus: 'failed', paid: false }), 'Payment failed')
  assert.equal(label({ status: 'cancelled', paymentStatus: 'cancelled', paid: false }), 'Cancelled')
  // A completed label is only given to a PAID order.
  assert.notEqual(label({ status: 'completed', paymentStatus: 'payment_pending' }), 'Completed')
})

test('abandoned venue checkouts filter under "Abandoned checkout", not "Awaiting payment"', () => {
  const rows = unifyBookings([
    venue({ id: 'bk_live', status: 'payment_pending' }),
    venue({ id: 'bk_lapsed', status: 'payment_pending', holdExpired: true }),
  ], [])
  assert.deepEqual(filterBookings(rows, { status: 'payment_pending' }).map((r) => r.id), ['bk_live'])
  assert.deepEqual(filterBookings(rows, { status: 'expired' }).map((r) => r.id), ['bk_lapsed'])
  assert.equal(filterBookings(rows, { status: 'confirmed' }).length, 0)
})

test('venue bookings can be filtered by awaiting payment / abandoned', () => {
  const venueValues = STATUS_OPTIONS.filter((o) => o.kinds.includes('venue')).map((o) => o.value)
  assert.ok(venueValues.includes('payment_pending'))
  assert.ok(venueValues.includes('expired'))
})

test('a failed venue payment reads "Payment failed" and is never paid', () => {
  const rows = unifyBookings([
    venue({ id: 'bk_f', status: 'failed', paymentStatus: 'failed' }),
    venue({ id: 'bk_ok' }),
  ], [])
  assert.equal(statusBadge(rows.find((r) => r.id === 'bk_f'))[1], 'Payment failed')
  assert.deepEqual(filterBookings(rows, { type: 'venue', status: 'failed' }).map((r) => r.id), ['bk_f'])
  assert.deepEqual(filterBookings(rows, { status: 'confirmed' }).map((r) => r.id), ['bk_ok'])
  assert.ok(STATUS_OPTIONS.find((o) => o.value === 'failed').kinds.includes('venue'))
})

// ---- delete confirmation ----------------------------------------------------

test('delete prompt names the booking by its booking ID', () => {
  const [ev] = unifyBookings([], [order({ id: 'B4X821', status: 'failed', paymentStatus: 'failed', paid: false })])
  const p = deletePrompt(ev)
  assert.equal(p.title, 'Delete booking #B4X821?')
  assert.match(p.body, /Ravi/)
  assert.match(p.body, /2 tickets for ABC Dandiya Night/)
  assert.match(p.body, /nothing is refunded or charged/)

  const [vb] = unifyBookings([venue({ status: 'cancelled' })], [])
  const q = deletePrompt(vb)
  assert.equal(q.title, 'Delete booking #000001?')
  assert.match(q.body, /booking at Grand Hall/)
  assert.match(q.body, /1,220/)
})

test('removing a deleted row updates the list and both counts', () => {
  const bookings = [venue(), venue({ id: 'bk_2', status: 'cancelled' })]
  const orders = [order(), order({ id: 'eo_2', status: 'failed' })]
  const before = unifyBookings(bookings, orders)
  assert.deepEqual(countByKind(before), { venue: 2, event: 2 })
  // What AdminContext.deleteBooking does once the API accepts the delete.
  const after = unifyBookings(bookings.filter((b) => b.id !== 'bk_2'), orders.filter((o) => o.id !== 'eo_2'))
  assert.equal(after.length, 2)
  assert.deepEqual(countByKind(after), { venue: 1, event: 1 })
})

// ---- date range / basis and the Excel export -----------------------------

test('custom range filters on the event / slot date by default', () => {
  const rows = unifyBookings(
    [venue({ id: 'bk_v1', date: '2026-10-20' }), venue({ id: 'bk_v2', date: '2026-10-25' })],
    [order({ id: 'eo_e1', date: '2026-10-21' })],
  )
  const ids = (f) => filterBookings(rows, f, '2026-10-13').map((r) => r.id).sort()
  assert.deepEqual(ids({ date: 'range', from: '2026-10-20', to: '2026-10-21' }), ['bk_v1', 'eo_e1'])
  assert.deepEqual(ids({ date: 'range', from: '2026-10-21' }), ['bk_v2', 'eo_e1'])
  assert.deepEqual(ids({ date: 'range', to: '2026-10-20' }), ['bk_v1'])
  assert.deepEqual(ids({ date: 'range', from: '2026-10-21', to: '2026-10-21', type: 'event' }), ['eo_e1'])
  // A range with no ends filters nothing out.
  assert.equal(ids({ date: 'range' }).length, 3)
})

test('the "booked on" basis reads the creation day in IST', () => {
  // 19:00 UTC on 9 Oct is 00:30 IST on 10 Oct.
  const late = venue({ id: 'bk_late', createdAt: '2026-10-09T19:00:00Z' })
  const early = venue({ id: 'bk_early', createdAt: '2026-10-09T10:00:00Z' })
  assert.equal(createdISO(late), '2026-10-10')
  assert.equal(createdISO(early), '2026-10-09')
  assert.equal(createdISO({}), '')
  const rows = unifyBookings([late, early], [])
  const ids = (f) => filterBookings(rows, f, '2026-10-13').map((r) => r.id)
  assert.deepEqual(ids({ date: 'range', basis: 'created', from: '2026-10-10', to: '2026-10-10' }), ['bk_late'])
  // Presets honour the basis too: both were booked before "today".
  assert.equal(ids({ date: 'past', basis: 'created' }).length, 2)
  assert.equal(ids({ date: 'past', basis: 'scheduled' }).length, 0)
})

test('existing date presets are unchanged', () => {
  const rows = unifyBookings([venue({ date: '2026-10-13' })], [order({ date: '2026-10-20' })])
  const n = (date) => filterBookings(rows, { date }, '2026-10-13').length
  assert.equal(n('today'), 1)
  assert.equal(n('upcoming'), 1)
  assert.equal(n('past'), 0)
  assert.equal(n('All'), 2)
})

test('export params carry exactly the page filters', () => {
  assert.deepEqual(exportParams({}, '2026-10-13'), { type: 'All', status: 'All', date: 'All' })
  assert.deepEqual(
    exportParams({ type: 'event', status: 'failed', date: 'range', basis: 'scheduled', from: '2026-10-20', to: '2026-10-21', query: '  Dandiya ' }, '2026-10-13'),
    { type: 'event', status: 'failed', date: 'range', basis: 'scheduled', today: '2026-10-13', from: '2026-10-20', to: '2026-10-21', q: 'Dandiya' },
  )
  assert.deepEqual(
    exportParams({ type: 'venue', status: 'All', date: 'upcoming', basis: 'created', from: '2026-01-01' }, '2026-10-13'),
    { type: 'venue', status: 'All', date: 'upcoming', basis: 'created', today: '2026-10-13' },
  )
  // Range ends are ignored unless the custom range is selected.
  assert.equal(exportParams({ date: 'All', from: '2026-10-01' }).from, undefined)
})

test('every status filter value is one the export endpoint accepts', () => {
  // adminpanel/exports.py STATUS_KEYS — keep the two in step.
  const server = ['confirmed', 'completed', 'payment_pending', 'expired', 'failed', 'cancelled', 'refund_pending', 'refunded']
  assert.deepEqual(STATUS_OPTIONS.map((o) => o.value).sort(), [...server].sort())
})

test('export filename', () => {
  assert.equal(exportFilename('2026-10-13'), 'bookmyvenues_bookings_2026-10-13.xlsx')
})
