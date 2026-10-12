// The main Bookings page lists TWO kinds of order side by side:
//   * venue bookings   — /bootstrap `bookings`     (bookings.Booking)
//   * event tickets    — /bootstrap `eventOrders`  (events.EventOrder)
// They live in separate tables with separate id spaces ("bk_…" / "eo_…"),
// so every row is keyed by kind + id. Pure functions only (no React), so the
// merge and filter rules are unit-tested in unifiedBookings.test.js.

import { bookingRef } from '../../utils/format.js'

export const KIND_LABEL = { venue: 'Venue booking', event: 'Event ticket' }

// Status filter options. Values match each row's `statusKey`: a venue
// booking's status, or an event order's status as the backend derives it
// (paid orders read confirmed/completed by the clock, a lapsed unpaid hold
// reads expired). Each option says which kinds can carry it.
export const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed / paid', kinds: ['venue', 'event'] },
  { value: 'completed', label: 'Completed', kinds: ['venue', 'event'] },
  { value: 'payment_pending', label: 'Awaiting payment', kinds: ['event'] },
  { value: 'expired', label: 'Abandoned checkout', kinds: ['event'] },
  { value: 'failed', label: 'Payment failed', kinds: ['event'] },
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
  statusKey: b.status,
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

export function matchesDate(row, filterDate, today) {
  if (!filterDate || filterDate === 'All') return true
  const d = bookingISO(row)
  if (!d) return false
  if (filterDate === 'today') return d === today
  if (filterDate === 'upcoming') return d > today
  return d < today // past / "Earlier"
}

export function matchesQuery(row, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  const haystack = [
    row.id, bookingRef(row.id), row.title, row.venue, row.eventName, row.location,
    row.customer, row.phone, row.razorpayOrderId, row.razorpayPaymentId,
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q)
}

export function filterBookings(rows, { type, status, date, query } = {}, today = '') {
  return rows.filter((r) =>
    matchesType(r, type) && matchesStatus(r, status) &&
    matchesDate(r, date, today) && matchesQuery(r, query))
}

export function countByKind(rows) {
  const counts = { venue: 0, event: 0 }
  for (const r of rows) counts[r.kind] = (counts[r.kind] || 0) + 1
  return counts
}
