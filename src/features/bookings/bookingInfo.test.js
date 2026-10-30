// Run with `npm test` (Node's built-in test runner — no extra dependencies).
//
// Booking Info in the super admin's expanded booking row: the server's
// invoice number, created time and verified payment time (with its source),
// "Not available" when missing — and none of it as table columns.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { NOT_AVAILABLE, adminBookingInfo, formatDateTimeIST } from './bookingInfo.js'
import { filterBookings, unifyBookings } from './unifiedBookings.js'

const byKey = (rows, key) => rows.find((r) => r.key === key)

const venuePaid = {
  id: 'K7M2QX', kind: 'venue', status: 'confirmed', paymentStatus: 'confirmed', method: 'upi',
  invoiceNumber: 'INV-2627-000123',
  createdAt: '2026-10-25T13:58:00+00:00',     // 7:28 pm IST
  paidAt: '2026-10-25T14:12:30+00:00',        // 7:42 pm IST
  paidAtSource: 'gateway',
  razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ',
}

test('times are India time with an IST suffix', () => {
  assert.match(formatDateTimeIST(venuePaid.paidAt), /25 Oct 2026.*7:42.*IST$/)
  assert.equal(formatDateTimeIST('garbage'), '')
  assert.equal(formatDateTimeIST(null), '')
})

test('a paid booking: invoice, created and paid times, source and gateway references', () => {
  const rows = adminBookingInfo(venuePaid)
  assert.deepEqual(rows.map((r) => r.label),
    ['Invoice number', 'Booking created', 'Payment received', 'Gateway order', 'Payment ID'])
  assert.equal(byKey(rows, 'invoice').value, 'INV-2627-000123')
  assert.match(byKey(rows, 'created').value, /7:28/)
  assert.match(byKey(rows, 'paid').value, /7:42/)
  assert.equal(byKey(rows, 'paid').note, 'Razorpay capture time (signed webhook)')
  assert.equal(byKey(rows, 'payment').value, 'pay_XYZ')
})

test('the event panel can leave out references it already prints', () => {
  const rows = adminBookingInfo({ ...venuePaid, kind: 'event' }, { references: false })
  assert.deepEqual(rows.map((r) => r.key), ['invoice', 'created', 'paid'])
})

test('no payment time is ever made up from the creation time', () => {
  const rows = adminBookingInfo({ ...venuePaid, paidAt: null, paidAtSource: null })
  assert.equal(byKey(rows, 'paid').value, NOT_AVAILABLE)
  assert.equal(byKey(rows, 'paid').note, 'Paid before payment times were recorded')
  assert.match(byKey(rows, 'created').value, /7:28/)
})

test('pending, failed, abandoned and cancelled rows say no payment succeeded', () => {
  for (const status of ['payment_pending', 'failed', 'cancelled']) {
    const rows = adminBookingInfo({ id: 'X', status, paymentStatus: status, invoiceNumber: 'INV-2627-000009' })
    assert.equal(byKey(rows, 'paid').value, NOT_AVAILABLE, status)
    assert.equal(byKey(rows, 'paid').note, 'No successful payment recorded', status)
    assert.equal(byKey(rows, 'invoice').value, 'INV-2627-000009', status)   // number ≠ paid
  }
  const expired = adminBookingInfo({ id: 'Y', status: 'payment_pending', statusKey: 'expired' })
  assert.equal(byKey(expired, 'paid').note, 'No successful payment recorded')
})

test('walk-ins and pay-at-venue explain the missing online payment', () => {
  assert.equal(byKey(adminBookingInfo({ method: 'walk-in', status: 'confirmed' }), 'paid').note, 'Walk-in — no online payment')
  assert.equal(byKey(adminBookingInfo({ method: 'venue', status: 'confirmed' }), 'paid').note, 'Pay at venue — no online payment')
})

test('older records without the new fields read "Not available"', () => {
  const rows = adminBookingInfo({ id: 'bk_3f8a92c1d04e', status: 'confirmed' })
  assert.equal(byKey(rows, 'invoice').value, NOT_AVAILABLE)
  assert.equal(byKey(rows, 'created').value, NOT_AVAILABLE)
  assert.equal(byKey(rows, 'paid').value, NOT_AVAILABLE)
  assert.equal(rows.length, 3)
})

test('the search box finds a booking by its invoice number', () => {
  const rows = unifyBookings([venuePaid, { ...venuePaid, id: 'OTHER1', invoiceNumber: 'INV-2627-000124' }], [])
  const hits = filterBookings(rows, { query: 'inv-2627-000123' })
  assert.deepEqual(hits.map((r) => r.id), ['K7M2QX'])
})

test('the bookings table gains no invoice / timestamp columns', () => {
  const page = readFileSync(new URL('./BookingsPage.jsx', import.meta.url), 'utf8')
  const header = page.match(/<div>Booking<\/div>.*<div>Status<\/div>/)
  assert.ok(header, 'table header not found')
  assert.doesNotMatch(header[0], /Invoice|Paid|Created/)
  // Still the same seven columns; Status widened 150px → 190px to fit its
  // second badge (booking status + payment status), no column added.
  assert.match(page, /const GRID = \{ display: 'grid', gridTemplateColumns: '120px 1\.5fr 1\.1fr 1\.3fr 110px 95px 190px'/)
  // Booking Info renders only inside expanded panels.
  const uses = page.match(/<BookingRecord row=\{[bo]\}[^/]*\/>/g) || []
  assert.equal(uses.length, 3)
  assert.doesNotMatch(page, /\{b\.invoiceNumber\}|\{b\.paidAt\}|\{o\.invoiceNumber\}/)
})
