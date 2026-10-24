// Vendor-take arithmetic — what the VENDOR actually earns from bookings.
//
// Each booking's `fee` is the platform fee FROZEN at booking time — WHATEVER
// number was configured then (₹20, ₹10, ₹35… the admin can set any value), so
// vendor revenue must subtract each row's own fee — never today's setting,
// which is only the fallback for records from before fees were stored per
// booking. Walk-ins
// carry no platform fee: the vendor keeps the full amount. Online and
// pay-at-venue both surrender the fee (online: withheld from the weekly
// payout; at-venue: recovered from it).
//
// Only money the vendor keeps counts: cancelled / refunded / refund-pending /
// unpaid-hold rows contribute nothing. (A partially-refunded row is excluded
// whole — its kept remainder is settled manually per the payout rules, so the
// conservative number is the honest one.)

const DEAD_STATUSES = new Set(['cancelled', 'refunded', 'refund_pending', 'payment_pending'])

/** Does this booking represent money the vendor keeps? (No status = legacy row, kept.) */
export const keepsMoney = (b) => !DEAD_STATUSES.has(String(b?.status || '').toLowerCase())

/**
 * The platform's fee on one booking: ₹0 for walk-ins (no fee exists), else the
 * fee FROZEN on the record at booking time — whatever amount was configured
 * when the customer booked. Today's settings fee is only the legacy fallback.
 */
export const platformFeeOf = (b, fallbackFee = 20) => {
  if (b?.walkIn === true || String(b?.method || '').toLowerCase() === 'walk-in') return 0
  return b?.fee != null && Number.isFinite(Number(b.fee)) ? Number(b.fee) : Number(fallbackFee) || 0
}

/**
 * The vendor's take on one booking: amount + platform-promo top-up − the
 * booking-time frozen fee. Platform-funded promos are made whole to the vendor
 * (payout rule: the platform eats its own discount), so `discountAmount` is
 * added back when `offer.source === "platform"`; venue-funded offers aren't.
 * Same formula the backend uses for the vendor dashboard and payouts.
 */
export const vendorTake = (b, fallbackFee = 20) => {
  const amount = Number(b?.amountNum) || 0
  if (!amount) return 0
  const promoTopUp = b?.offer?.source === 'platform' ? Number(b?.discountAmount) || 0 : 0
  return Math.max(0, amount + promoTopUp - platformFeeOf(b, fallbackFee))
}

// A booking belongs to a venue when it targets the venue itself or one of its
// per-unit listings ("RK PARTY HOUSE — Screen 2") — same matcher the vendor
// suspend guard uses.
const isFor = (bookingVenue, venueName) => {
  const n = String(bookingVenue || '')
  const v = String(venueName || '')
  return n === v || n.startsWith(v + ' — ')
}

/** Σ vendor take across one venue's bookings (its unit listings included). */
export const venueVendorRevenue = (venueName, bookings, fallbackFee) =>
  (bookings || []).reduce(
    (sum, b) => (keepsMoney(b) && isFor(b.venue, venueName) ? sum + vendorTake(b, fallbackFee) : sum),
    0,
  )

/** Σ vendor take across ALL of a vendor's venues (each booking counted once). */
export const vendorEarnings = (vendorName, venues, bookings, fallbackFee) => {
  const theirs = (venues || []).filter((v) => v.vendor === vendorName)
  return (bookings || []).reduce(
    (sum, b) =>
      keepsMoney(b) && theirs.some((v) => isFor(b.venue, v.name)) ? sum + vendorTake(b, fallbackFee) : sum,
    0,
  )
}
