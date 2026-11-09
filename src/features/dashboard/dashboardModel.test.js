import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryBars, countRows, dailySeries, moneyCards, rangeQuery, RANGES } from './dashboardModel.js'

const sample = {
  period: { key: '7d', label: 'Last 7 days', from: '2026-10-30', to: '2026-11-05' },
  totals: { received: 5000, online: 4200, cash: 800, refunded: 700, net: 4300, refundPending: 300, pendingCollection: 500, payments: 6 },
  venue: { received: 3980, online: 3180, cash: 800, refunded: 500, net: 3480 },
  events: { received: 1020, online: 1020, cash: 0, refunded: 200, net: 820 },
  counts: {
    venue: { total: 9, paid: 4, awaitingCash: 1, pendingPayment: 1, expired: 1, failed: 1, cancelled: 1, refundPending: 0, refunded: 0 },
    events: { total: 3, paid: 1, pendingPayment: 0, expired: 0, failed: 1, cancelled: 0, refundPending: 0, refunded: 1, ticketsPaid: 4 },
  },
  categories: [
    { key: 'venue:party hall', label: 'Party hall', source: 'venue', received: 3000, refunded: 500, net: 2500, percent: 60 },
    { key: 'event:dandiya', label: 'Dandiya', source: 'event', received: 1020, refunded: 200, net: 820, percent: 20.4 },
    { key: 'venue:play zone', label: 'Play zone', source: 'venue', received: 980, refunded: 0, net: 980, percent: 19.6 },
  ],
  daily: [{ date: '2026-11-01', venue: 3980, event: 0 }, { date: '2026-11-04', venue: 0, event: 1020 }],
}

test('every preset range sends just its key', () => {
  for (const r of RANGES.filter((x) => x.key !== 'custom')) {
    assert.deepEqual(rangeQuery(r.key), { query: { range: r.key } })
  }
})

test('a custom range needs both dates in order before anything is requested', () => {
  assert.ok(rangeQuery('custom', '', '2026-11-01').error)
  assert.ok(rangeQuery('custom', '2026-11-05', '2026-11-01').error)
  assert.deepEqual(rangeQuery('custom', '2026-11-01', '2026-11-05'), { query: { range: 'custom', from: '2026-11-01', to: '2026-11-05' } })
  assert.ok(rangeQuery('fortnight').error)
})

test('money cards show the server totals verbatim, venue and events separately', () => {
  const cards = Object.fromEntries(moneyCards(sample).map((c) => [c.key, c.value]))
  assert.deepEqual(cards, { received: 5000, venue: 3980, event: 1020, online: 4200, cash: 800, refunded: 700, net: 4300, pending: 500 })
  // Venue + event revenue add up to the total — no double counting.
  assert.equal(cards.venue + cards.event, cards.received)
})

test('money cards survive a missing or partial response', () => {
  assert.ok(moneyCards(null).every((c) => c.value === 0))
})

test('orders and tickets stay separate in the counts', () => {
  const rows = Object.fromEntries(countRows(sample).map((r) => [r.key, r]))
  assert.equal(rows.total.venue, 9)
  assert.equal(rows.total.events, 3)
  assert.equal(rows.paid.events, 1)          // one paid ORDER…
  assert.equal(sample.counts.events.ticketsPaid, 4)   // …holding four tickets
  assert.equal(rows.awaitingCash.events, null) // tickets are never paid at the venue
})

test('category bars keep the server percentages and scale to the largest', () => {
  const bars = categoryBars(sample.categories)
  assert.deepEqual(bars.map((b) => b.width), [100, 34, 33])
  assert.deepEqual(bars.map((b) => b.sourceLabel), ['Venue', 'Event', 'Venue'])
  assert.equal(bars.reduce((s, b) => s + b.received, 0), sample.totals.received)
  assert.deepEqual(categoryBars([{ key: 'x', received: 0 }]), [])
})

test('the daily series covers every day of the period, empty days included', () => {
  const days = dailySeries(sample)
  assert.equal(days.length, 7)
  assert.equal(days[0].date, '2026-10-30')
  assert.deepEqual(days.find((d) => d.date === '2026-11-04'), { date: '2026-11-04', venue: 0, event: 1020 })
  assert.equal(days.reduce((s, d) => s + d.venue + d.event, 0), sample.totals.received)
  assert.deepEqual(dailySeries({ daily: [] }), [])
})

test('all time falls back to the data span and is capped', () => {
  const daily = Array.from({ length: 100 }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), venue: 1, event: 0 }))
  const days = dailySeries({ period: { key: 'all', from: null, to: null }, daily }, 62)
  assert.equal(days.length, 62)
  assert.equal(days[days.length - 1].date, daily[99].date)
})
