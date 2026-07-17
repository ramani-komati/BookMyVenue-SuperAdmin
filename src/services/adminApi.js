// BookMyVenues super-admin — API service layer.
//
// USE_MOCK=true serves the seeded demo data with realistic latency.
// Flip to false (or set VITE_ADMIN_USE_MOCK=false) once the Django backend
// is live — components never talk to the network directly, only this module.
import {
  INITIAL_APPROVALS, INITIAL_AUDIT, INITIAL_BOOKINGS, INITIAL_PAYOUTS,
  INITIAL_REVIEWS, INITIAL_SETTINGS, INITIAL_USERS, INITIAL_VENDORS, INITIAL_VENUES,
} from '../data/mockData.js'

export const USE_MOCK = import.meta.env.VITE_ADMIN_USE_MOCK !== 'false'

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || '/api/admin'
const MOCK_LATENCY_MS = 350
const DEMO_OTP = '246810'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Dev/test hook: `localStorage.setItem('bmv-mock-fail', '1')` makes the next
// data fetch fail so the error/retry state can be exercised without a backend.
const mockFailureArmed = () => {
  try { return localStorage.getItem('bmv-mock-fail') === '1' } catch { return false }
}

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
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}

async function mock(result, { failable = false } = {}) {
  await delay(MOCK_LATENCY_MS)
  if (failable && mockFailureArmed()) throw new Error('Network request failed')
  return typeof result === 'function' ? result() : result
}

export const adminApi = {
  // ---------- auth ----------
  login: ({ email, password }) =>
    USE_MOCK
      ? mock({ otpRequired: true })
      : request('/auth/login', { method: 'POST', body: { email, password } }),

  verifyOtp: ({ email, otp }) =>
    USE_MOCK
      ? mock(() => {
          if (otp !== DEMO_OTP) throw new Error('That code is not right. Demo code: 246810.')
          return { token: 'mock-session' }
        })
      : request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),

  logout: () =>
    USE_MOCK ? mock(null) : request('/auth/logout', { method: 'POST' }),

  // ---------- reads ----------
  fetchAll: () =>
    USE_MOCK
      ? mock(() => ({
          approvals: INITIAL_APPROVALS,
          venues: INITIAL_VENUES,
          vendors: INITIAL_VENDORS,
          users: INITIAL_USERS,
          bookings: INITIAL_BOOKINGS,
          payouts: INITIAL_PAYOUTS,
          reviews: INITIAL_REVIEWS,
          audit: INITIAL_AUDIT,
          settings: INITIAL_SETTINGS,
        }), { failable: true })
      : request('/bootstrap'),

  // ---------- writes (called alongside optimistic local updates) ----------
  updateApproval: (id, patch) =>
    USE_MOCK ? mock({ id, ...patch }) : request(`/approvals/${id}`, { method: 'PATCH', body: patch }),

  updateVenue: (id, patch) =>
    USE_MOCK ? mock({ id, ...patch }) : request(`/venues/${id}`, { method: 'PATCH', body: patch }),

  updateVendor: (id, patch) =>
    USE_MOCK ? mock({ id, ...patch }) : request(`/vendors/${id}`, { method: 'PATCH', body: patch }),

  updateUser: (id, patch) =>
    USE_MOCK ? mock({ id, ...patch }) : request(`/users/${id}`, { method: 'PATCH', body: patch }),

  updateBooking: (id, patch) =>
    USE_MOCK ? mock({ id, ...patch }) : request(`/bookings/${id}`, { method: 'PATCH', body: patch }),

  updatePayout: (id, patch) =>
    USE_MOCK ? mock({ id, ...patch }) : request(`/payouts/${id}`, { method: 'PATCH', body: patch }),

  resolveReview: (id, resolution) =>
    USE_MOCK ? mock({ id, ...resolution }) : request(`/reviews/${id}/resolve`, { method: 'POST', body: resolution }),

  saveSettings: (settings) =>
    USE_MOCK ? mock(settings) : request('/settings', { method: 'PUT', body: settings }),

  appendAudit: (entry) =>
    USE_MOCK ? mock(entry) : request('/audit', { method: 'POST', body: entry }),
}
