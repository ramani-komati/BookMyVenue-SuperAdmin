// The main Bookings page lists TWO kinds of order side by side:
//   * venue bookings   — /bootstrap `bookings`     (bookings.Booking)
//   * event tickets    — /bootstrap `eventOrders`  (events.EventOrder)
// They live in separate tables with separate id spaces ("bk_…" / event ids:
// "K7M2QX", or "eo_…" for older orders),
// so every row is keyed by kind + id. Pure functions only (no React), so the
// merge and filter rules are unit-tested in unifiedBookings.test.js.

import { bookingRef, displayRef, fmt } from '../../utils/format.js'
import { orderBadge } from '../events/orderStatus.js'
import { bookingStates } from '../../utils/bookingStatus.js'

export const KIND_LABEL = { venue: 'Venue booking', event: 'Event ticket' }

// Status filter options. Values match each row's `statusKey`: the status as
// the backend derives it (paid rows read confirmed/completed by the clock)
// and, for either kind, 'expired' for an unpaid hold whose window lapsed.
// Each option says which kinds can carry it. Both kinds record a failed
// payment attempt as 'failed' (venue bookings did so as 'cancelled' before
// the retry fix, so older failures still read as Cancelled).
export const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed / paid', kinds: ['venue', 'event'] },
  { value: 'completed', label: 'Completed', kinds: ['venue', 'event'] },
  { value: 'payment_pending', label: 'Awaiting payment', kinds: ['venue', 'event'] },
  { value: 'expired', label: 'Abandoned checkout', kinds: ['venue', 'event'] },
  { value: 'failed', label: 'Payment failed', kinds: ['venue', 'event'] },
  { value: 'cancelled', label: 'Cancelled', kinds: ['venue', 'event'] },
  { value: 'refund_pending', label: 'Refund pending', kinds: ['venue', 'event'] },
  { value: 'refunded', label: 'Refunded', kinds: ['venue', 'event'] },
]

const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }

// The booking's calendar date as "YYYY-MM-DD" for date filtering. Prefers the
// backend's ISO `date` (the event date) — authoritative, with the year — and
// only falls back to reading day+month out of the display slot string
// ("21 Sep, 18:00 – 19:00" or "Sep 21 · …") when that field is absent. Returns
// '' only when no date can be read at all (such rows appear under "All dates").
export function bookingISO(b, now = new Date()) {
  // An explicit ISO event date wins — it carries the year, so no guessing.
  const isoDate = String(b?.date || '').match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`
  // Fallback: the display slot string has a day + month but NO year.
  const s = String(b?.slot || '')
  const dayMon = s.match(/\b(\d{1,2})\s+([A-Za-z]{3})/) // "21 Sep"
  const monDay = s.match(/\b([A-Za-z]{3})\w*\s+(\d{1,2})\b/) // "Sep 21"
  let d, mon
  if (dayMon && MONTHS[dayMon[2].toLowerCase()]) { d = Number(dayMon[1]); mon = MONTHS[dayMon[2].toLowerCase()] }
  else if (monDay && MONTHS[monDay[1].toLowerCase()]) { d = Number(monDay[2]); mon = MONTHS[monDay[1].toLowerCase()] }
  else return ''
  const monthIdx = Number(mon) - 1
  // Infer the missing YEAR by anchoring to when the booking was CREATED: an
  // event falls on or after its creation day, so it's the first occurrence of
  // this day/month on or after createdAt (this also wraps Dec→Jan correctly and
  // never drags a year-old booking forward into "today"/"upcoming").
  const created = b?.createdAt ? new Date(b.createdAt) : null
  if (created && !Number.isNaN(created.getTime())) {
    let y = created.getFullYear()
    if (new Date(y, monthIdx, d) < new Date(y, created.getMonth(), created.getDate())) y += 1
    return `${y}-${mon}-${String(d).padStart(2, '0')}`
  }
  // Last resort (no creation date): nearest year to today across prev/this/next.
  const y0 = now.getFullYear()
  const best = [y0 - 1, y0, y0 + 1]
    .map((y) => new Date(y, monthIdx, d))
    .reduce((a, c) => (Math.abs(c - now) < Math.abs(a - now) ? c : a))
  return `${best.getFullYear()}-${mon}-${String(d).padStart(2, '0')}`
}

const venueRow = (b) => ({
  ...b,
  kind: 'venue',
  key: `venue:${b.id}`,
  // The backend flags a lapsed unpaid hold; it is an abandoned checkout,
  // not someone paying right now (event orders arrive already as 'expired').
  statusKey: b.status === 'payment_pending' && b.holdExpired ? 'expired' : b.status,
  title: b.venue || '',
})

const eventRow = (o) => ({
  ...o,
  kind: 'event',
  key: `event:${o.id}`,
  statusKey: o.status,
  title: o.eventName || '',
  // The venue table's money column reads amountNum.
  amountNum: Number(o.amount) || 0,
})

const createdMs = (r) => {
  const t = Date.parse(r.createdAt || '')
  return Number.isNaN(t) ? 0 : t
}

// One list, newest first. A row that somehow arrives twice (same kind + id)
// is kept once, so a reload or a stale merge can never double-list an order.
export function unifyBookings(bookings = [], eventOrders = []) {
  const byKey = new Map()
  for (const b of bookings || []) if (b?.id != null) {
    const row = venueRow(b)
    if (!byKey.has(row.key)) byKey.set(row.key, row)
  }
  for (const o of eventOrders || []) if (o?.id != null) {
    const row = eventRow(o)
    if (!byKey.has(row.key)) byKey.set(row.key, row)
  }
  // Array.prototype.sort is stable, so equal timestamps keep API order.
  return [...byKey.values()].sort((a, b) => createdMs(b) - createdMs(a))
}

export const matchesType = (row, type) => !type || type === 'All' || row.kind === type

export const matchesStatus = (row, status) => !status || status === 'All' || row.statusKey === status

// Which date the date filter reads. 'scheduled' (the default, and the page's
// original behaviour) is the event date / booked slot date; 'created' is the
// day the booking was made.
export const DATE_BASIS_OPTIONS = [
  { value: 'scheduled', label: 'Event / slot date' },
  { value: 'created', label: 'Booked on' },
]

// The day a booking was MADE, as "YYYY-MM-DD" in IST — the same calendar the
// backend export cuts days on, whatever the admin's browser time zone.
export function createdISO(row) {
  const t = new Date(row?.createdAt || '')
  if (Number.isNaN(t.getTime())) return ''
  return t.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

// `range` is { basis, from, to } (ISO days, inclusive, either end optional).
export function matchesDate(row, filterDate, today, { basis = 'scheduled', from = '', to = '' } = {}) {
  if (!filterDate || filterDate === 'All') return true
  if (filterDate === 'range' && !from && !to) return true
  const d = basis === 'created' ? createdISO(row) : bookingISO(row)
  if (!d) return false
  if (filterDate === 'range') return (!from || d >= from) && (!to || d <= to)
  if (filterDate === 'today') return d === today
  if (filterDate === 'upcoming') return d > today
  return d < today // past / "Earlier"
}

export function matchesQuery(row, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const haystack = [
    row.id, bookingRef(row.id), displayRef(row), row.title, row.venue, row.eventName, row.location,
    row.customer, row.phone, row.razorpayOrderId, row.razorpayPaymentId,
    // Searchable, though only displayed inside the expanded row.
    row.invoiceNumber,
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q)
}

export function filterBookings(rows, { type, status, date, basis, from, to, query } = {}, today = '') {
  return rows.filter((r) =>
    matchesType(r, type) && matchesStatus(r, status) &&
    matchesDate(r, date, today, { basis, from, to }) && matchesQuery(r, query))
}

// Query params for GET /api/admin/bookings/export — the page's filters, sent
// as-is so the server applies the same rules (adminpanel/exports.py) and the
// spreadsheet lists exactly the rows on screen. `today` pins today/upcoming/
// past to the day the page split on.
export function exportParams({ type, status, date, basis, from, to, query } = {}, today = '') {
  const params = { type: type || 'All', status: status || 'All', date: date || 'All' }
  if (params.date !== 'All') {
    params.basis = basis || 'scheduled'
    params.today = today
  }
  if (params.date === 'range') {
    if (from) params.from = from
    if (to) params.to = to
  }
  const q = String(query || '').trim()
  if (q) params.q = q
  return params
}

// "bookmyvenues_bookings_2026-10-13.xlsx" — matches the server's filename.
export const exportFilename = (today) => `bookmyvenues_bookings_${today}.xlsx`

// Venue booking badges, keyed by the status the backend reports.
const VENUE_BADGE = {
  confirmed: ['success', 'Confirmed'],
  completed: ['neutral', 'Completed'],
  payment_pending: ['pending', 'Awaiting payment'],
  failed: ['error', 'Payment failed'],
  cancelled: ['error', 'Cancelled'],
  refund_pending: ['warning', 'Refund pending'],
  refunded: ['info', 'Refunded'],
}

// [badge tone, label] for any unified row. Read from the persisted status
// only — an unknown value is shown as-is, never coerced into a paid state.
export function statusBadge(row) {
  if (row?.kind === 'event') return orderBadge(row)
  if (row?.statusKey === 'expired') return ['neutral', 'Abandoned checkout']
  return VENUE_BADGE[row?.status] || ['neutral', row?.status ? String(row.status) : 'Unknown']
}

// Badge tone per state tone (utils/bookingStatus *_TONE → components/ui/Badge).
const BADGE_TONE = { success: 'success', neutral: 'neutral', danger: 'error', warning: 'warning', info: 'info' }

// Booking status and payment status as TWO badges — the server's answers
// (backend bookings/status_view.py: bookingState / paymentState), derived
// from the raw lifecycle only when an older server sends neither. The
// combined one-line statusBadge above stays for compact contexts.
export function stateBadges(row) {
  const s = bookingStates(row)
  return {
    // An unpaid row says which kind of unpaid it is: a live 5-minute slot
    // hold, a payment in progress, or a hold that expired.
    booking: s.holdLabel
      ? [s.hold === 'expired' ? 'neutral' : 'warning', s.holdLabel]
      : [BADGE_TONE[s.bookingTone] || 'neutral', s.bookingLabel],
    payment: [BADGE_TONE[s.paymentTone] || 'neutral', `Payment: ${s.paymentLabel}`],
  }
}

// The confirmation shown before deleting one booking. The server enforces
// the real rule (unpaid only); this just tells the admin what will happen.
export function deletePrompt(row) {
  const ref = displayRef(row)
  const what = row?.kind === 'event'
    ? `${row.tickets || 0} ticket${row.tickets === 1 ? '' : 's'} for ${row.eventName || 'this event'}`
    : `booking at ${row?.venue || 'this venue'}`
  return {
    title: `Delete booking ${ref}?`,
    body: `${row?.customer || 'This customer'}'s ${what} (${fmt(row?.amountNum)}, no payment captured) will be removed from the Bookings list and the totals. The record is kept on the server for the audit trail; nothing is refunded or charged.`,
  }
}

export function countByKind(rows) {
  const counts = { venue: 0, event: 0 }
  for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1
  return counts
}
