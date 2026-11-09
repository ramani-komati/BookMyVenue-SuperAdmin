// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  blankForm, cleanAudience, emptyAudienceReason, formFromCampaign, isActive, moveImage, needsAllConfirm,
  promotionalWords, rate, sameForm, segmentAllowed, sendProblems, statusBadge, toPayload, withKind,
} from './campaignModel.js'

const ready = () => ({
  ...blankForm(),
  name: 'Diwali', subject: 'Big savings', heading: 'Hi {{first_name}}', body: 'Book now',
  ctaLabel: 'Book', ctaUrl: '/explore',
})

test('a complete campaign has no problems', () => {
  assert.deepEqual(sendProblems(ready()), {})
})

test('missing subject, heading and content are reported by field', () => {
  const p = sendProblems({ ...blankForm(), name: 'x' })
  assert.ok(p.subject && p.heading && p.body)
})

test('an image alone is enough content, but needs alt text', () => {
  const form = { ...ready(), body: '', images: [{ url: 'https://cdn.x/a.jpg', alt: '', link: '', caption: '' }] }
  assert.match(sendProblems(form).images, /description/)
  form.images[0].alt = 'Banner'
  assert.equal(sendProblems(form).body, undefined)
})

test('a button needs both text and an https or site link', () => {
  assert.ok(sendProblems({ ...ready(), ctaUrl: '' }).ctaUrl)
  assert.ok(sendProblems({ ...ready(), ctaLabel: '' }).ctaLabel)
  assert.ok(sendProblems({ ...ready(), ctaUrl: 'http://x.com' }).ctaUrl)
  assert.ok(sendProblems({ ...ready(), ctaUrl: '//evil.com' }).ctaUrl)
  assert.equal(sendProblems({ ...ready(), ctaUrl: 'https://hapvoo.com/x' }).ctaUrl, undefined)
})

test('audience is cleaned to what the server stores', () => {
  assert.deepEqual(cleanAudience({ segment: 'location', state: 'Telangana', city: '', category: 'x', days: 5 }),
    { segment: 'location', state: 'Telangana' })
  assert.deepEqual(cleanAudience({ segment: 'lapsed', days: '120' }), { segment: 'lapsed', days: 120 })
  assert.deepEqual(cleanAudience({ segment: 'booked', days: '' }), { segment: 'booked' })
  assert.ok(sendProblems({ ...ready(), audience: { segment: 'location' } }).audience)
  assert.ok(sendProblems({ ...ready(), audience: { segment: 'lapsed', days: 0 } }).audience)
})

test('payload trims and drops empty images; round-trips a server row', () => {
  const form = { ...ready(), name: '  Diwali ', images: [{ url: '', alt: '', link: '', caption: '' }] }
  const payload = toPayload(form)
  assert.equal(payload.name, 'Diwali')
  assert.deepEqual(payload.images, [])
  const back = formFromCampaign({ ...payload, audience: { segment: 'all' } })
  assert.ok(sameForm(back, form))
})

test('only sends to everyone need the extra confirmation', () => {
  assert.equal(needsAllConfirm({ segment: 'all' }), true)
  assert.equal(needsAllConfirm(undefined), true)
  assert.equal(needsAllConfirm({ segment: 'booked' }), false)
})

test('helpers', () => {
  assert.equal(rate(1, 4), '25%')
  assert.equal(rate(1, 0), '—')
  assert.deepEqual(moveImage([1, 2, 3], 0, 1), [2, 1, 3])
  assert.deepEqual(moveImage([1, 2, 3], 0, -1), [1, 2, 3])
  assert.equal(isActive('sending'), true)
  assert.equal(isActive('sent'), false)
  assert.deepEqual(statusBadge('nope'), ['neutral', 'nope'])
})

test('interest audiences keep their choices and need at least one', async () => {
  const { audienceProblem, emptyAudienceReason } = await import('./campaignModel.js')
  assert.deepEqual(cleanAudience({ segment: 'interest_city', cities: ['Warangal', ''], state: 'x' }),
    { segment: 'interest_city', cities: ['Warangal'] })
  assert.deepEqual(cleanAudience({ segment: 'interest_category', categories: ['Resort'] }),
    { segment: 'interest_category', categories: ['Resort'] })
  assert.deepEqual(cleanAudience({ segment: 'active', days: '30' }), { segment: 'active', days: 30 })
  assert.equal(audienceProblem({ segment: 'interest_city', cities: [] }), 'Choose at least one city.')
  assert.equal(audienceProblem({ segment: 'interest_category' }), 'Choose at least one category.')
  assert.equal(audienceProblem({ segment: 'interest_city', cities: ['Warangal'] }), '')
  assert.equal(emptyAudienceReason({ count: 3 }), '')
  assert.match(emptyAudienceReason({ count: 0, customers: 5, withEmail: 5, optedIn: 0 }), /opted in/)
  assert.match(emptyAudienceReason({ count: 0, customers: 5, withEmail: 5, optedIn: 2, eligibleTotal: 2 }), /none of them match/)
  assert.match(emptyAudienceReason({ count: 0, customers: 0 }), /no customer accounts/)
})

// ---- Campaign types: promotional vs service (2026-11-03) ----

test('new and old campaigns are promotional unless the server says service', () => {
  assert.equal(blankForm().kind, 'promotional')
  assert.equal(formFromCampaign({ name: 'Old' }).kind, 'promotional')
  const svc = formFromCampaign({ name: 'Notice', kind: 'service', serviceTopic: 'payment' })
  assert.equal(svc.kind, 'service')
  assert.equal(toPayload(svc).serviceTopic, 'payment')
  assert.equal(toPayload({ ...svc, kind: 'promotional' }).serviceTopic, '')
})

test('switching to service resets a marketing-only audience', () => {
  const form = { ...ready(), audience: { segment: 'lapsed', days: 90 } }
  assert.deepEqual(withKind(form, 'service').audience, { segment: 'all' })
  const booked = { ...ready(), audience: { segment: 'booked' } }
  assert.deepEqual(withKind(booked, 'service').audience, { segment: 'booked' })
  assert.equal(segmentAllowed('service', 'interest_city'), false)
  assert.equal(segmentAllowed('promotional', 'interest_city'), true)
})

test('a service email needs a topic and may not carry offers', () => {
  const svc = { ...ready(), kind: 'service', serviceTopic: '', subject: 'Maintenance on Sunday' }
  assert.ok(sendProblems(svc).serviceTopic)
  svc.serviceTopic = 'service_announcement'
  assert.deepEqual(sendProblems(svc), {})
  for (const text of ['Get 20% off', 'Use coupon X', 'Big sale', 'New offers', 'Save ₹500']) {
    assert.ok(sendProblems({ ...svc, body: text }).kind, text)
  }
  assert.deepEqual(promotionalWords({ ...svc, subject: 'Deals and discounts' }), ['deals', 'discounts'])
  // The same words are fine in a promotional campaign.
  assert.equal(sendProblems({ ...ready(), body: 'Get 20% off' }).kind, undefined)
})

test('a service email cannot target a marketing segment', () => {
  const svc = { ...ready(), kind: 'service', serviceTopic: 'account', audience: { segment: 'not_booked' } }
  assert.match(sendProblems(svc).audience, /promotional campaigns only/)
})

test('empty-audience reasons follow the campaign type', () => {
  const est = { count: 0, customers: 5, withEmail: 5, optedIn: 0, eligibleTotal: 5 }
  assert.match(emptyAudienceReason(est), /opted in/)
  assert.match(emptyAudienceReason(est, 'service'), /none of them match/)
})
