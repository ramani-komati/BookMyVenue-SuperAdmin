/**
 * Booking status vs payment status — two separate answers for one booking or
 * ticket order, read the same way by My bookings, the vendor dashboard and
 * invoices (the super admin panel has the same table).
 *
 * The SERVER decides both (backend bookings/status_view.py) and sends
 * `bookingState` / `paymentState` on every record. Nothing here can turn a
 * booking into a paid one: when an older server sends only `status`, the
 * answer is derived from that stored lifecycle value — which only the
 * signature-verified payment callback or webhook ever sets to 'confirmed'.
 *
 *   booking: pending | expired | not_confirmed | confirmed | completed | cancelled | removed
 *   payment: pending | unpaid | failed | completed | refund_pending | refunded
 *            | at_venue | free | not_recorded
 *
 * A COMPLETED payment means a verified capture exists — not that the visit
 * happened. A COMPLETED booking means its time has passed — not that money
 * arrived. Pure functions (relative imports only) so `npm test` covers them.
 */

export const BOOKING_STATE_LABEL = {
  pending: 'Pending',
  expired: 'Expired',
  not_confirmed: 'Not confirmed',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  removed: 'Removed',
};

export const PAYMENT_STATE_LABEL = {
  pending: 'Pending',
  unpaid: 'Not paid',
  failed: 'Failed',
  completed: 'Completed',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  at_venue: 'Pay at venue',
  free: 'No payment needed',
  not_recorded: 'No online payment',
};

// Chip colour family per state (the screens map these to their own tokens).
export const BOOKING_STATE_TONE = {
  pending: 'warning', expired: 'neutral', not_confirmed: 'danger', confirmed: 'success',
  completed: 'neutral', cancelled: 'danger', removed: 'neutral',
};
export const PAYMENT_STATE_TONE = {
  pending: 'warning', unpaid: 'neutral', failed: 'danger', completed: 'success',
  refund_pending: 'warning', refunded: 'info', at_venue: 'warning', free: 'neutral', not_recorded: 'neutral',
};

const lower = (v) => String(v ?? '').trim().toLowerCase();
const isOffline = (b) =>
  Boolean(b?.walkIn) || b?.method === 'walk-in' || b?.method === 'venue'
  || (Array.isArray(b?.addons) && b.addons.some((a) => a?.name === 'Pay at venue' && !(Number(a?.price) > 0)));

/**
 * Fallback for a server that predates bookingState/paymentState. `over` says
 * whether the slot / show has ended (only used when the server's own status
 * is a plain 'confirmed').
 */
function derive(b, over) {
  const status = lower(b?.paymentStatus && b?.kind ? b.paymentStatus : b?.status);
  const display = lower(b?.status);
  if (status === 'removed') return ['removed', 'unpaid'];
  if (display === 'expired' || (status === 'payment_pending' && b?.holdExpired)) return ['expired', 'unpaid'];
  if (status === 'payment_pending' || status === 'pending') return ['pending', 'pending'];
  if (status === 'failed' || status === 'payment_failed') return ['not_confirmed', 'failed'];
  if (status === 'cancelled' || status === 'canceled') return ['cancelled', b?.razorpayPaymentId ? 'completed' : 'unpaid'];
  if (status === 'refund_pending' || status === 'refunded') return ['cancelled', status];
  if (status === 'confirmed' || status === 'completed' || !status) {
    // No status at all = a legacy confirmed row.
    const booking = display === 'completed' || over ? 'completed' : 'confirmed';
    if (isOffline(b)) return [booking, 'at_venue'];
    if (!(Number(b?.amount) > 0) && b?.amount != null) return [booking, 'free'];
    return [booking, 'completed'];
  }
  return [status, status];
}

// An unpaid row's 5-minute slot hold (backend bookings/holds.py, record
// `holdState`): who is in the middle of what — never a booking.
export const HOLD_STATE_LABEL = {
  held: 'Slot held (checkout)',
  payment_pending: 'Awaiting payment',
  expired: 'Hold expired',
};

/**
 * { booking, bookingLabel, bookingTone, payment, paymentLabel, paymentTone,
 *   hold, holdLabel } for one record. `over` (optional) — has the booking's time passed? Lets
 * the fallback flip a plain 'confirmed' to 'completed' on the client clock;
 * the server's own bookingState always wins.
 */
export function bookingStates(b, { over = false } = {}) {
  let booking = lower(b?.bookingState);
  let payment = lower(b?.paymentState);
  if (!booking || !payment) {
    const [db, dp] = derive(b, over);
    booking = booking || db;
    payment = payment || dp;
  }
  return {
    booking,
    bookingLabel: b?.bookingStateLabel || BOOKING_STATE_LABEL[booking] || booking,
    bookingTone: BOOKING_STATE_TONE[booking] || 'neutral',
    payment,
    paymentLabel: b?.paymentStateLabel || PAYMENT_STATE_LABEL[payment] || payment,
    paymentTone: PAYMENT_STATE_TONE[payment] || 'neutral',
    hold: lower(b?.holdState),
    holdLabel: HOLD_STATE_LABEL[lower(b?.holdState)] || '',
  };
}

/** Is the money for this record actually held by the platform/vendor now? */
export const paymentCaptured = (states) => states?.payment === 'completed';

/**
 * The words before the amount on a booking card ("Amount paid ₹1,020").
 * Never says "paid" for a booking whose payment is not completed.
 */
export function amountCaption(states, { partial = false } = {}) {
  switch (states?.payment) {
    case 'completed': return partial ? 'Paid' : 'Amount paid';
    case 'refunded': return 'Refunded';
    case 'refund_pending': return 'Refund pending';
    case 'at_venue': return 'Pay at the venue';
    case 'pending': return 'Payment pending';
    case 'failed': return 'Payment failed';
    case 'free': return 'No payment needed';
    default: return 'Booking value';
  }
}
