// Run with `npm test` (Node's built-in test runner — no extra dependencies).
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  blankForm, cleanAudience, formFromCampaign, isActive, moveImage, needsAllConfirm, rate,
  sameForm, sendProblems, statusBadge, toPayload,
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
  assert.equal(sendProblems({ ...ready(), ctaUrl: 'https://thebookmyvenues.in/x' }).ctaUrl, undefined)
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
