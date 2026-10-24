// Body-scroll lock with REFERENCE COUNTING.
//
// Several overlays lock page scroll while open — the detail drawer, the confirm
// modal, and the mobile nav — and they can nest (e.g. opening the confirm modal
// from inside the drawer). If each one independently saves and restores
// `document.body.style.overflow`, unwinding them out of order leaves the body
// stuck at `overflow: hidden` (the inner overlay restores the "hidden" it saw
// while an outer overlay was still open) — and the whole page stops scrolling.
//
// Counting fixes that: the body is locked on the FIRST lock and restored only
// when the LAST lock releases, whatever order they open and close in.

let count = 0
let saved = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (count === 0) {
    saved = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  count += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  count = Math.max(0, count - 1)
  if (count === 0) {
    document.body.style.overflow = saved
    saved = ''
  }
}
