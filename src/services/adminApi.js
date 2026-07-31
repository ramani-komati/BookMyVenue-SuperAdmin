// BookMyVenues super-admin — API service layer.
//
// Talks to the real backend only (the demo/mock layer was removed once the
// /api/admin endpoints went live). Components never touch the network
// directly — every call goes through this module.
//
// Auth is a server-set session cookie (credentials: 'include'); errors come
// back as { "detail": "..." } and are surfaced with the HTTP status attached
// so callers can branch on 401/403 (session expired → sign-in screen).

// Default to the production backend so a build without env vars talks to the
// real API out of the box (mirrors frontend/src/services/apiBase.js). Override
// per environment with VITE_ADMIN_API_BASE (no trailing slash).
const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'https://bookmyvenues-backend.onrender.com/api/admin'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try { message = (await res.json()).detail || message } catch { /* non-JSON error body */ }
    const err = new Error(message)
    err.status = res.status // callers branch on 401/403 (session expired → sign-in)
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

  // ---------- writes (called alongside optimistic local updates) ----------
  updateApproval: (id, patch) => request(`/approvals/${id}`, { method: 'PATCH', body: patch }),
  updateVenue: (id, patch) => request(`/venues/${id}`, { method: 'PATCH', body: patch }),
  updateVendor: (id, patch) => request(`/vendors/${id}`, { method: 'PATCH', body: patch }),
  updateUser: (id, patch) => request(`/users/${id}`, { method: 'PATCH', body: patch }),
  updateBooking: (id, patch) => request(`/bookings/${id}`, { method: 'PATCH', body: patch }),
  updatePayout: (id, patch) => request(`/payouts/${id}`, { method: 'PATCH', body: patch }),
  resolveReview: (id, resolution) => request(`/reviews/${id}/resolve`, { method: 'POST', body: resolution }),
  saveSettings: (settings) => request('/settings', { method: 'PUT', body: settings }),
  appendAudit: (entry) => request('/audit', { method: 'POST', body: entry }),
}
