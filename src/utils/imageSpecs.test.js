import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE_KINDS, UPLOAD_SPECS, checkUpload, coverKeep, fitCaption, fitFor, uploadGuidance } from './imageSpecs.js';

// Sizes below are real covers / posters from the live catalogue (2026-10-25).

test('venue and event cards share one 3:2 frame; detail, promo and thumbs differ on purpose', () => {
  assert.equal(IMAGE_KINDS.listing.frame, 1.5);
  assert.equal(IMAGE_KINDS.poster.frame, IMAGE_KINDS.listing.frame);
  assert.equal(IMAGE_KINDS.gallery.frame, 16 / 9);
  assert.equal(IMAGE_KINDS.promo.frame, 2);
  assert.equal(IMAGE_KINDS.thumb.frame, 1);
});

test('coverKeep reports the share of the image a cover crop keeps', () => {
  assert.deepEqual(coverKeep(1500, 1000, 1.5), { width: 1, height: 1 });
  const square = coverKeep(1200, 1200, 1.5);
  assert.equal(square.width, 1);
  assert.ok(Math.abs(square.height - 2 / 3) < 1e-9);
  assert.deepEqual(coverKeep(0, 100, 1.5), { width: 1, height: 1 });
});

test('venue photos fill the card unless the crop would lose too much', () => {
  assert.equal(fitFor('listing', 1599, 1066), 'cover');       // Stayfit, 3:2
  assert.equal(fitFor('listing', 1088, 641), 'cover');        // OG Memories, 1.70
  assert.equal(fitFor('listing', 1200, 1200), 'cover');       // RK Party House, square — keeps 67%
  assert.equal(fitFor('listing', 1536, 473), 'contain');      // Celebrations, 3.25:1 panorama
  assert.equal(fitFor('listing', 739, 1600), 'contain');      // portrait gallery shot
});

test('event posters are never cut: a square poster is shown whole', () => {
  assert.equal(fitFor('poster', 1600, 1600), 'contain');      // Ustav Garba poster
  assert.equal(fitFor('poster', 1011, 665), 'cover');         // Sri Events, 1.52
  assert.match(fitCaption('poster', 1600, 1600), /blurred bands at the sides/);
  assert.match(fitCaption('listing', 1536, 473), /above and below/);
  assert.equal(fitCaption('listing', 1500, 1000), 'Fills the card exactly');
});

test('unknown sizes default to cover with no caption', () => {
  assert.equal(fitFor('listing', undefined, undefined), 'cover');
  assert.equal(fitCaption('listing', 0, 0), '');
});

test('checkUpload refuses wrong types, oversize files and tiny or absurd images', () => {
  assert.match(checkUpload('venuePhoto', { type: 'image/gif' }).problem, /JPEG, PNG, WebP/);
  assert.match(checkUpload('venuePhoto', { bytes: 6 * 1024 * 1024 }).problem, /limit is 5 MB/);
  assert.match(checkUpload('venuePhoto', { width: 382, height: 355 }).problem, /too small/);
  assert.match(checkUpload('eventPoster', { width: 9000, height: 3000 }).problem, /8000px/);
  // Orientation-free minimum: a 300×400 portrait passes like 400×300.
  assert.equal(checkUpload('venuePhoto', { width: 300, height: 400 }).problem, '');
});

test('checkUpload warns (never blocks) about shape and softness', () => {
  const ok = checkUpload('venuePhoto', { width: 1600, height: 1067, bytes: 200_000, type: 'image/jpeg' });
  assert.deepEqual(ok, { problem: '', warnings: [] });
  const square = checkUpload('venuePhoto', { width: 1200, height: 1200 });
  assert.equal(square.problem, '');
  assert.match(square.warnings[0], /trim the edges — shows the middle 67% of the height/);
  const panorama = checkUpload('venuePhoto', { width: 1536, height: 473 });
  assert.match(panorama.warnings[0], /Shown whole/);
  const soft = checkUpload('eventPoster', { width: 654, height: 436 });
  assert.match(soft.warnings.at(-1), /may look soft/);
});

test('size and type can be checked before the dimensions are known', () => {
  assert.deepEqual(checkUpload('eventPoster', { bytes: 1000, type: 'image/png' }), { problem: '', warnings: [] });
});

test('every upload spec has guidance text with the numbers vendors need', () => {
  Object.keys(UPLOAD_SPECS).forEach((key) => {
    const text = uploadGuidance(key);
    assert.match(text, /Recommended \d+×\d+px/);
    assert.match(text, /up to 5 MB/);
  });
});
