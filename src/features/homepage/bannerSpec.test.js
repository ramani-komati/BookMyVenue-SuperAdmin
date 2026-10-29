// features/homepage/bannerSpec.js — run with `npm test` (node --test).
import test from 'node:test'
import assert from 'node:assert/strict'
import { bannerFormError, checkImage, coverCrop, cropCaption, moveItem } from './bannerSpec.js'

// The shape GET /api/admin/homepage sends (backend BANNER_IMAGE_SPEC).
const SPEC = {
  formats: ['JPEG', 'PNG', 'WebP'],
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxBytes: 5 * 1024 * 1024,
  slots: {
    desktop: {
      recommended: { width: 2400, height: 600 }, sharpFrom: { width: 1920, height: 480 },
      minimum: { width: 1200, height: 300 },
      ratio: { label: '4:1', value: 4, warnMin: 3.6, warnMax: 4.4, min: 2.5, max: 6 },
    },
    mobile: {
      recommended: { width: 1200, height: 600 }, sharpFrom: { width: 1080, height: 540 },
      minimum: { width: 600, height: 300 },
      ratio: { label: '2:1', value: 2, warnMin: 1.8, warnMax: 2.3, min: 1.4, max: 3 },
    },
  },
}

test('the recommended desktop image passes cleanly', () => {
  assert.deepEqual(checkImage(SPEC, 'desktop', { width: 2400, height: 600, bytes: 900_000, type: 'image/jpeg' }), { problem: '', warnings: [] })
})

test('wrong type, too big, too small and absurd shapes are blocked before upload', () => {
  assert.match(checkImage(SPEC, 'desktop', { width: 2400, height: 600, type: 'image/gif' }).problem, /JPEG/)
  assert.match(checkImage(SPEC, 'desktop', { width: 2400, height: 600, bytes: 6 * 1024 * 1024 }).problem, /limit is 5 MB/)
  assert.match(checkImage(SPEC, 'desktop', { width: 800, height: 200 }).problem, /too small/)
  assert.match(checkImage(SPEC, 'desktop', { width: 1500, height: 1500 }).problem, /too far/)
  assert.match(checkImage(SPEC, 'mobile', { width: 3000, height: 600 }).problem, /too far/)
})

test('off-ratio or soft images upload with advice', () => {
  const { problem, warnings } = checkImage(SPEC, 'desktop', { width: 1500, height: 500 })
  assert.equal(problem, '')
  assert.equal(warnings.length, 2)
})

test('cover crop matches what the hero frame keeps', () => {
  // A 4:1 image in the 1024px laptop frame (944×280, 3.37:1): sides trimmed.
  const laptop = coverCrop(2400, 600, 944, 280)
  assert.equal(laptop.height, 1)
  assert.ok(Math.abs(laptop.width - 0.843) < 0.01)
  // In the 1920px frame (1840×420, 4.38:1): top/bottom trimmed.
  const wide = coverCrop(2400, 600, 1840, 420)
  assert.equal(wide.width, 1)
  assert.ok(Math.abs(wide.height - 0.913) < 0.01)
  assert.equal(cropCaption(2400, 600, 2400, 600), 'Shows the whole image')
  assert.equal(cropCaption(2400, 600, 944, 280), 'Shows the middle 84% of the width')
})

test('form rules mirror the server', () => {
  const ok = { title: 'Diwali', type: 'percent', value: 10, code: 'DIWALI10', image: 'https://x', showInHero: true, featuredPromotion: true, published: true }
  assert.equal(bannerFormError(ok), '')
  assert.match(bannerFormError({ ...ok, title: ' ' }), /title/)
  assert.match(bannerFormError({ ...ok, value: 150 }), /exceed 100/)
  assert.match(bannerFormError({ ...ok, code: '' }), /promo code/)
  assert.match(bannerFormError({ ...ok, code: 'BAD CODE' }), /letters/)
  assert.match(bannerFormError(ok, { otherCodes: ['diwali10'] }), /already used/)
  assert.match(bannerFormError({ ...ok, image: '' }), /need an image/)
  assert.equal(bannerFormError({ ...ok, image: '', showInHero: false }), '')        // promotion only
  assert.equal(bannerFormError({ ...ok, image: '', published: false }), '')        // a draft can wait
  assert.match(bannerFormError({ ...ok, ctaUrl: 'javascript:alert(1)' }), /button link/)
  assert.match(bannerFormError({ ...ok, from: '2026-12-10', to: '2026-12-01' }), /on or before/)
  assert.equal(bannerFormError({ title: 'Free popcorn', type: 'none', image: 'https://x', showInHero: true, published: true }), '')
})

test('moveItem swaps neighbours and ignores moves off the ends', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c'])
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c'])
})
