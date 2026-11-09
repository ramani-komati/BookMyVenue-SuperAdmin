/**
 * Dashboard — the date filter and the shaping of GET /api/admin/dashboard
 * (backend reports/finance.py) into what the page draws. Every money figure
 * is computed by the SERVER from verified payments only; nothing here adds
 * up booking amounts on its own (that was the old "Gross booking value",
 * which counted failed and abandoned checkouts too).
 *
 * Dependency-free so `npm test` (node --test) can load it.
 */

export const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
]
export const DEFAULT_RANGE = '30d'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The query for a filter choice, or { error } when a custom range is
 * incomplete or reversed (the request is then not sent at all).
 */
export function rangeQuery(key, from = '', to = '') {
  if (!RANGES.some((r) => r.key === key)) return { error: 'Unknown date range.' }
  if (key !== 'custom') return { query: { range: key } }
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to)) return { error: 'Pick both a start and an end date.' }
  if (from > to) return { error: 'The start date is after the end date.' }
  return { query: { range: 'custom', from, to } }
}

/** The money cards, in reading order: [{ key, label, value, hint, tone, icon }]. */
export function moneyCards(data) {
  const t = data?.totals || {}
  const v = data?.venue || {}
  const e = data?.events || {}
  const n = (x) => Number(x) || 0
  return [
    { key: 'received', label: 'Total successful payments', value: n(t.received), icon: 'indian-rupee', tone: 'navy',
      hint: `${n(t.payments).toLocaleString('en-IN')} payments` },
    { key: 'venue', label: 'Venue booking revenue', value: n(v.received), icon: 'building-2', tone: 'accent',
      hint: n(v.refunded) ? `net ₹${n(v.net).toLocaleString('en-IN')} after refunds` : 'online + cash collected' },
    { key: 'event', label: 'Event ticket revenue', value: n(e.received), icon: 'ticket', tone: 'accent',
      hint: n(e.refunded) ? `net ₹${n(e.net).toLocaleString('en-IN')} after refunds` : 'online ticket payments' },
    { key: 'online', label: 'Online payments', value: n(t.online), icon: 'credit-card', tone: 'navy',
      hint: 'captured by Razorpay' },
    { key: 'cash', label: 'Cash collected', value: n(t.cash), icon: 'wallet', tone: 'success',
      hint: 'marked collected by the vendor' },
    { key: 'refunded', label: 'Refunds issued', value: n(t.refunded), icon: 'rotate-ccw', tone: 'warning',
      hint: n(t.refundPending) ? `₹${n(t.refundPending).toLocaleString('en-IN')} more still to refund` : 'on these payments' },
    { key: 'net', label: 'Net revenue', value: n(t.net), icon: 'trending-up', tone: 'success',
      hint: 'successful payments − refunds' },
    { key: 'pending', label: 'Pending collections', value: n(t.pendingCollection), icon: 'clock', tone: 'warning',
      hint: 'cash still due at venues — not revenue' },
  ]
}

/** Booking / order counts as table rows: [{ key, label, venue, events }]. */
export function countRows(data) {
  const v = data?.counts?.venue || {}
  const e = data?.counts?.events || {}
  const row = (key, label, vKey = key, eKey = key) => ({
    key, label, venue: Number(v[vKey]) || 0, events: eKey == null ? null : Number(e[eKey]) || 0,
  })
  return [
    row('total', 'Total'),
    row('paid', 'Paid (successful)'),
    row('awaitingCash', 'Confirmed — cash still due', 'awaitingCash', null),
    row('pendingPayment', 'Payment pending'),
    row('expired', 'Abandoned checkout'),
    row('failed', 'Payment failed'),
    row('cancelled', 'Cancelled'),
    row('refundPending', 'Refund pending'),
    row('refunded', 'Refunded'),
  ]
}

/** Category bars, largest first, widths relative to the largest row. */
export function categoryBars(categories = []) {
  const rows = (categories || []).filter((c) => Number(c.received) > 0)
  const max = Math.max(0, ...rows.map((c) => Number(c.received)))
  return rows.map((c) => ({
    ...c,
    sourceLabel: c.source === 'event' ? 'Event' : 'Venue',
    width: max ? Math.max(2, Math.round((Number(c.received) / max) * 100)) : 0,
  }))
}

/**
 * The daily series for the stacked bars: every day of the period (empty days
 * included, so gaps read as gaps), capped at the last `maxDays` days.
 */
export function dailySeries(data, maxDays = 62) {
  const byDay = new Map((data?.daily || []).map((d) => [d.date, d]))
  const from = data?.period?.from || (data?.daily?.[0]?.date ?? null)
  const to = data?.period?.to || (data?.daily?.[data.daily.length - 1]?.date ?? null)
  if (!from || !to) return []
  const days = []
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    const key = d.toISOString().slice(0, 10)
    const row = byDay.get(key) || {}
    days.push({ date: key, venue: Number(row.venue) || 0, event: Number(row.event) || 0 })
  }
  return days.slice(-maxDays)
}

export const inr = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN')
