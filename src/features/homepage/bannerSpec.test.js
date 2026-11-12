// features/homepage/bannerSpec.js — run with `npm test` (node --test).
import test from 'node:test'
import assert from 'node:assert/strict'
import { bannerFormError, bannerLink, bannerName, checkImage, coverCrop, cropCaption, heroDisplaySize, linkLabel, moveItem } from './bannerSpec.js'

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
  assert.match(bannerFormError({ ...ok, ctaUrl: 'javascript:alert(1)' }), /link must be a page on this site/)
  assert.match(bannerFormError({ ...ok, from: '2026-12-10', to: '2026-12-01' }), /on or before/)
  assert.equal(bannerFormError({ title: 'Free popcorn', type: 'none', image: 'https://x', showInHero: true, published: true }), '')
})

test('moveItem swaps neighbours and ignores moves off the ends', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c'])
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c'])
})

test('a hero banner can be published with its image alone', () => {
  const imageOnly = { title: '', text: '', type: 'none', image: 'https://x', showInHero: true, featuredPromotion: false, published: true }
  assert.equal(bannerFormError(imageOnly), '')
  assert.equal(bannerFormError({ ...imageOnly, published: false }), '')           // draft too
  assert.match(bannerFormError({ ...imageOnly, image: '' }), /image, or give the banner a title/)
  // Featured promotions print the title, so they still need one.
  assert.match(bannerFormError({ ...imageOnly, featuredPromotion: true }), /Featured promotions need a title/)
  assert.equal(bannerName(imageOnly), 'Image banner')
  assert.equal(bannerName({ title: 'Diwali' }), 'Diwali')
})

test('hero banner links: site pages, real https sites, or none (not clickable)', () => {
  assert.deepEqual(bannerLink(''), { type: 'none' })
  assert.deepEqual(bannerLink('/events'), { type: 'internal', to: '/events' })
  assert.deepEqual(bannerLink('/venues'), { type: 'internal', to: '/venues' })
  assert.deepEqual(bannerLink('https://example.com/x'), { type: 'external', href: 'https://example.com/x' })
  for (const bad of ['javascript:alert(1)', '//evil.example.com', 'https://', 'https://intranet', 'events', '/a b']) {
    assert.equal(bannerLink(bad), null, bad)
    assert.match(bannerFormError({ image: 'https://x', showInHero: true, featuredPromotion: false, published: true, ctaUrl: bad }), /link must be/)
  }
  assert.equal(linkLabel(''), 'Not clickable — no link')
  assert.equal(linkLabel('/events'), 'Opens /events')
  assert.equal(linkLabel('https://www.example.com/a'), 'Opens www.example.com in a new tab')
  assert.equal(linkLabel('javascript:x'), 'Link not valid')
})

test('the preview size: full banner width at the image’s own shape, never cropped', () => {
  // 2400×600 desktop art on a 1440px laptop (1360px banner) → 1360×340.
  assert.deepEqual(heroDisplaySize(1360, 2400, 600), { width: 1360, height: 340, scale: 1360 / 2400 })
  // The same art on a phone with no phone image: scaled down whole.
  assert.equal(heroDisplaySize(358, 2400, 600).height, 90)
  // Phone art 1200×600 → 358×179; an off-ratio 3000×1000 image keeps 3:1.
  assert.equal(heroDisplaySize(358, 1200, 600).height, 179)
  assert.equal(heroDisplaySize(1840, 3000, 1000).height, 613)
  assert.equal(heroDisplaySize(1360, 0, 600), null)
})

test('off-ratio images are explained as shown whole, not trimmed', () => {
  const { warnings } = checkImage(SPEC, 'desktop', { width: 1500, height: 500 })
  assert.match(warnings[0], /shows whole/)
  assert.match(warnings[0], /taller than 4:1 banners/)
  assert.doesNotMatch(warnings.join(' '), /trimmed|cut off/)
})
