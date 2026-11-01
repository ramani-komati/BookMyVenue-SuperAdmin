// The sidebar is black with the red brand accent (tokens.css --sidebar-bg),
// on every page — AdminLayout renders both the desktop rail and the mobile
// drawer. Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const tokens = read('../../styles/tokens.css')
const layout = read('./AdminLayout.jsx')
const token = (name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('the sidebar background is black / near-black, not navy', () => {
  const bg = token('sidebar-bg')
  assert.ok(bg, '--sidebar-bg is defined')
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16))
  assert.ok(Math.max(r, g, b) <= 0x14, `${bg} is near-black`)
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 4, `${bg} has no blue tint`)
})

test('both sidebars (desktop and mobile drawer) use it, and none uses navy', () => {
  const asides = layout.match(/<aside[^>]*>/g) || []
  assert.equal(asides.length, 2)
  for (const tag of asides) {
    assert.match(tag, /var\(--sidebar-bg\)/)
    assert.doesNotMatch(tag, /navy/)
  }
})

test('sidebar text stays readable (WCAG AA) and the red active accent is kept', () => {
  const bg = token('sidebar-bg')
  assert.ok(contrast('#FFFFFF', bg) >= 4.5)
  assert.ok(contrast(token('sidebar-fg-muted'), bg) >= 4.5)
  assert.match(layout, /borderLeft: `3px solid \$\{isActive \? 'var\(--brand-accent\)'/)
  assert.match(layout, /aria-current=\{isActive \? 'page' : undefined\}/)
  assert.match(read('../../styles/global.css'), /\.admin-sidebar button:focus-visible/)
})
