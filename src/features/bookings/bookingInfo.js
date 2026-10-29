// Booking Info for the super admin — the record details shown ONLY in a
// booking's expanded row (never as table columns): invoice number, when the
// booking was created, when its payment actually succeeded and where that
// time came from, plus the gateway references. Every value is the server's
// (backend bookings/invoices.py, bookings/payment_record.py); anything
// missing reads "Not available" and is never guessed — in particular the
// creation time is never shown as the payment time. Pure functions, tested
// in bookingInfo.test.js.

export const NOT_AVAILABLE = 'Not available'

// "25 Oct 2026, 7:42 pm IST" — India time whatever the admin's browser zone.
export function formatDateTimeIST(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return `${d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })} IST`
  } catch {
    return ''
  }
}

export const PAID_SOURCE_LABEL = {
  gateway: 'Razorpay capture time (signed webhook)',
  checkout: 'Server time of verified checkout signature',
  webhook: 'Server time the signed webhook arrived',
}

const UNPAID = new Set(['payment_pending', 'expired', 'failed', 'cancelled'])

function missingPaymentNote(row) {
  const method = String(row?.method || '').toLowerCase()
  if (row?.walkIn || method === 'walk-in') return 'Walk-in — no online payment'
  if (method === 'venue') return 'Pay at venue — no online payment'
  if (row?.razorpayPaymentId) return 'Paid before payment times were recorded'
  if (UNPAID.has(String(row?.statusKey || row?.paymentStatus || row?.status || '').toLowerCase())) {
    return 'No successful payment recorded'
  }
  return ''
}

// [{ key, label, value, note, mono }] for one unified row (venue or event).
// `references: false` leaves out the gateway ids for a panel that already
// prints them (the event-order details line).
export function adminBookingInfo(row, { references = true } = {}) {
  const paid = formatDateTimeIST(row?.paidAt)
  const rows = [
    { key: 'invoice', label: 'Invoice number', value: row?.invoiceNumber || NOT_AVAILABLE, note: '', mono: Boolean(row?.invoiceNumber) },
    { key: 'created', label: 'Booking created', value: formatDateTimeIST(row?.createdAt) || NOT_AVAILABLE, note: '', mono: false },
    {
      key: 'paid', label: 'Payment received', value: paid || NOT_AVAILABLE,
      note: paid ? PAID_SOURCE_LABEL[row?.paidAtSource] || '' : missingPaymentNote(row), mono: false,
    },
  ]
  if (!references) return rows
  if (row?.razorpayOrderId) rows.push({ key: 'order', label: 'Gateway order', value: row.razorpayOrderId, note: '', mono: true })
  if (row?.razorpayPaymentId) rows.push({ key: 'payment', label: 'Payment ID', value: row.razorpayPaymentId, note: '', mono: true })
  return rows
}
