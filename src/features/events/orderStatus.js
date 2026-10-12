// How an event ticket order's payment state reads, shared by the Events →
// Bookings modal and the main Bookings page so the same order never shows
// two different labels.
//
// Keyed on the RAW persisted lifecycle value (`paymentStatus`), never on a
// payment attempt: an order is only "Paid" once the backend recorded a
// verified capture.

export const PAYMENT_BADGE = {
  confirmed: ['live', 'Paid'],
  completed: ['live', 'Paid'],
  payment_pending: ['pending', 'Awaiting payment'],
  refund_pending: ['warning', 'Refund pending'],
  refunded: ['neutral', 'Refunded'],
  cancelled: ['rejected', 'Cancelled'],
  failed: ['error', 'Payment failed'],
}

// [badge tone, label] for one order record from the admin API.
export function orderBadge(order) {
  // An unpaid hold past its 30-minute window is an abandoned checkout, not
  // someone paying right now.
  if (order?.paymentStatus === 'payment_pending' && order?.status === 'expired') {
    return ['neutral', 'Abandoned checkout']
  }
  return PAYMENT_BADGE[order?.paymentStatus] || ['neutral', order?.paymentStatus || 'Unknown']
}
