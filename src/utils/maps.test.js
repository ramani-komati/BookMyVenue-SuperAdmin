/**
 * utils/maps.js — run with `npm test` (node --test). Same cases as the
 * backend's venues/test_discovery_audit.py MapsLinkFormatTests: the browser
 * and the server must read the SAME pin from a vendor's link.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { exactPinCoords, isShortMapsLink, openInMapsUrl } from './maps.js';

test('exact pins in every supported link format', () => {
  const cases = {
    'https://www.google.com/maps/place/X/data=!3d17.9683809!4d79.5987069': '17.9683809,79.5987069',
    'https://www.google.com/maps/search/17.9689,+79.5941': '17.9689,79.5941',
    'https://www.google.com/maps/dir/Home/17.9689,79.5941': '17.9689,79.5941',
    'https://maps.google.com/?q=loc:17.9,79.5': '17.9,79.5',
    'https://maps.google.com/?q=17.44,78.35': '17.44,78.35',
    "https://www.google.com/maps/place/17%C2%B058'08.0%22N+79%C2%B035'38.8%22E/@1,2,17z": '17.9688889,79.5941111',
  };
  for (const [link, pin] of Object.entries(cases)) assert.equal(exactPinCoords(link), pin, link);
});

test('a viewport, a place name or a short link is never a pin', () => {
  for (const link of [
    'https://www.google.com/maps/place/Foo/@17.9,79.5,17z',
    'https://www.google.com/maps/place/Stayfit/data=!4m2!3m1!1s0x3a33:0x4ce7',
    'https://maps.app.goo.gl/BKEP2ax5yc7AdfCU8',
    'https://www.google.com/maps/search/0,0',
    '',
  ]) {
    assert.equal(exactPinCoords(link), null, link);
  }
});

test('short link hosts', () => {
  assert.ok(isShortMapsLink('https://maps.app.goo.gl/x'));
  assert.ok(isShortMapsLink('https://g.page/r/abc'));
  assert.ok(!isShortMapsLink('https://www.google.com/maps/place/x'));
});

test('Open in Google Maps: pin → link → name search, never invented', () => {
  assert.equal(
    openInMapsUrl({ coordinates: { lat: 17.96, lng: 79.59 }, mapsLink: 'https://maps.app.goo.gl/x' }),
    'https://www.google.com/maps/search/?api=1&query=17.96,79.59',
  );
  assert.equal(openInMapsUrl({ coordinates: null, mapsLink: 'https://maps.app.goo.gl/x' }), 'https://maps.app.goo.gl/x');
  assert.equal(
    openInMapsUrl({ name: 'RK Party House', address: 'Warangal' }),
    'https://www.google.com/maps/search/?api=1&query=RK%20Party%20House%2C%20Warangal',
  );
  assert.equal(openInMapsUrl({ mapsLink: 'javascript:alert(1)' }), '');
  assert.equal(openInMapsUrl({}), '');
});
