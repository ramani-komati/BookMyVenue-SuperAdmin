// TheBookMyVenues super-admin — API service layer.
//
// Talks to the real backend only (the demo/mock layer was removed once the
// /api/admin endpoints went live). Components never touch the network
// directly — every call goes through this module.
//
// Auth is a server-set session cookie (credentials: 'include'); errors come
// back as { "detail": "..." } and are surfaced with the HTTP status attached
// so callers can branch on 401/403 (session expired → sign-in screen).

// Talk to the real admin API. In DEV the base defaults to a RELATIVE
// `/api/admin` so requests go through the Vite dev proxy (vite.config.js)
// server-to-server — the backend's CORS allowlist covers only the production
// domains, so a direct browser call from localhost is refused. Production
// builds default to the absolute onrender URL. Override either with
// VITE_ADMIN_API_BASE (no trailing slash) to point dev at a different backend.
const API_BASE =
  import.meta.env.VITE_ADMIN_API_BASE ||
  (import.meta.env.DEV ? '/api/admin' : 'https://bookmyvenues-backend.onrender.com/api/admin')

// Wake the backend the moment the panel opens — Render's free tier sleeps
// after idle and a cold start takes ~30s, which otherwise lands entirely on
// the admin's first action (login). Fired from main.jsx; by the time
// credentials + OTP are typed the server is warm and /bootstrap is quick.
// `no-cors` because the public health route sits outside the admin CORS
// allowlist — the request still reaches (and wakes) the server; the opaque
// response is never read.
export function wakeBackend() {
  fetch(API_BASE.replace(/\/admin$/, '') + '/v1/health', { mode: 'no-cors' }).catch(() => {})
}

async function request(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    credentials: 'include',
    headers: form
      // Multipart MUST NOT set Content-Type by hand (the browser adds the
      // boundary). X-Requested-With is REQUIRED by the backend upload view:
      // admin writes are CSRF-exempt, and a multipart POST is CORS-"simple"
      // so it is never preflighted — a custom header is what forces the
      // preflight and brings the origin allowlist back into play.
      ? { 'X-Requested-With': 'XMLHttpRequest' }
      : { 'Content-Type': 'application/json' },
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let detail = null
    try {
      detail = await res.json()
      message = detail.detail || message
    } catch { /* non-JSON error body */ }
    const err = new Error(message)
    err.status = res.status // callers branch on 401/403 (session expired → sign-in)
    // The events API answers a refused publish/delete with a code and
    // sometimes the row itself; the page needs both to explain what happened.
    err.code = detail?.code || ''
    err.detail = detail
    throw err
  }
  return res.status === 204 ? null : res.json()
}

export const adminApi = {
  // ---------- auth ----------
  login: ({ email, password }) => request('/auth/login', { method: 'POST', body: { email, password } }),
  verifyOtp: ({ email, otp }) => request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // ---------- reads ----------
  fetchAll: () => request('/bootstrap'),

  // Register-venue: mint a vendor JWT for an owner (create the vendor if the
  // phone is new) so the admin can drive the existing vendor registration
  // endpoints on their behalf. Returns { vendor, token, created }.
  // Backend: POST /api/admin/vendors/token  (see docs / Rohith spec).
  impersonateVendor: ({ phone, name }) =>
    request('/vendors/token', { method: 'POST', body: { phone, name } }),

  // ---------- writes (called alongside optimistic local updates) ----------
  updateApproval: (id, patch) => request(`/approvals/${id}`, { method: 'PATCH', body: patch }),
  updateVenue: (id, patch) => request(`/venues/${id}`, { method: 'PATCH', body: patch }),
  updateVendor: (id, patch) => request(`/vendors/${id}`, { method: 'PATCH', body: patch }),
  updateUser: (id, patch) => request(`/users/${id}`, { method: 'PATCH', body: patch }),
  updateBooking: (id, patch) => request(`/bookings/${id}`, { method: 'PATCH', body: patch }),
  // ---------- ticketed events (admin-owned) ----------
  // Events are a SUPER-ADMIN product: the admin creates, edits, publishes,
  // unpublishes and retires them. Vendors have NO write path — the backend
  // refuses their writes with 403, so this is not merely a hidden button.
  listEvents: () => request('/events'),
  createEvent: (payload) => request('/events', { method: 'POST', body: payload }),
  updateEvent: (id, patch) => request(`/events/${id}`, { method: 'PATCH', body: patch }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
  // Who bought tickets for one event, and whether they actually paid.
  getEventOrders: (id, params = {}) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    ).toString()
    return request(`/events/${id}/orders${query ? `?${query}` : ''}`)
  },
  // Soft-remove an UNPAID booking (failed / cancelled / abandoned). The
  // backend refuses paid and refunded orders with 409 and checks the order
  // belongs to this event, so a wrong id cannot remove another booking.
  // An optional reason is stored on the server-side audit entry.
  removeEventOrder: (eventId, orderId, reason) => request(
    `/events/${eventId}/orders/${encodeURIComponent(orderId)}`,
    { method: 'DELETE', body: reason ? { reason } : undefined },
  ),

  // Image upload -> a permanent public URL (Supabase, the same bucket venue
  // photos use). Used for event posters: the event write endpoints are
  // JSON-only by design, so the file goes up here and arrives there as a URL.
  uploadImage: (file) => {
    const form = new FormData()
    form.append('image', file)
    return request('/uploads', { method: 'POST', form })
  },
  updatePayout: (id, patch) => request(`/payouts/${id}`, { method: 'PATCH', body: patch }),
  resolveReview: (id, resolution) => request(`/reviews/${id}/resolve`, { method: 'POST', body: resolution }),
  saveSettings: (settings) => request('/settings', { method: 'PUT', body: settings }),
  appendAudit: (entry) => request('/audit', { method: 'POST', body: entry }),
}
