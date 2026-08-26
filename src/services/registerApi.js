/**
 * registerApi — lets the super-admin drive the EXISTING vendor venue-registration
 * endpoints (`/venues/drafts/*`, `/vendors/me/listings`) on behalf of an owner.
 *
 * Those endpoints require a vendor JWT, but the admin panel authenticates with a
 * cookie session. The bridge is `adminApi.impersonateVendor(phone)` (backend:
 * POST /api/admin/vendors/token) which returns a normal vendor JWT for the owner
 * (creating the vendor if the phone is new). We hold that token in memory for the
 * registration session and send it as `Authorization: Bearer …` on every call.
 *
 * Base: dev uses a relative `/api` (Vite proxy → backend, same as adminApi);
 * prod uses the absolute backend URL. NOTE this is the plain `/api` root, NOT
 * `/api/admin` — these are the vendor endpoints.
 */

import { ApiError, AuthError } from '@/services/errors'
import { PATCH_SECTIONS } from '@/features/register-venue/model'

const VENDOR_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://bookmyvenues-backend.onrender.com/api')

// In-memory impersonation token — set once the admin resolves an owner phone,
// cleared when the flow resets. Never persisted (a page reload restarts the flow).
let vendorToken = null
export function setVendorToken(token) {
  vendorToken = token || null
}
export function hasVendorToken() {
  return Boolean(vendorToken)
}

// ---- Backend payload shims (ported from the customer app's venueApi) --------
// The wizard's field names predate the backend contract; the server validates
// formats and computes completion against ITS key names, so add those alongside.
const FORMAT_OK = {
  phone: (v) => /^\d{10}$/.test(v),
  email: (v) => /^\S+@\S+\.\S+$/.test(v),
  pincode: (v) => /^\d{6}$/.test(v),
  ifsc: (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v),
  pan: (v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v),
  accountNumber: (v) => /^\d{9,18}$/.test(v),
  upi: (v) => /^[\w.-]{2,}@[A-Za-z]{2,}$/.test(v),
}

function holdInvalid(out, key, check) {
  const v = out[key]
  if (v == null) return
  const s = String(v).trim()
  if (s !== '' && !check(s)) delete out[key]
}

function toServerSection(section, data = {}, { strict = false } = {}) {
  const out = { ...data }
  const hold = strict ? () => {} : holdInvalid
  if (section === 'basics') {
    hold(out, 'phone', FORMAT_OK.phone)
    hold(out, 'email', FORMAT_OK.email)
  } else if (section === 'location') {
    hold(out, 'pincode', FORMAT_OK.pincode)
  } else if (section === 'details') {
    const cap = data.primaryCategory === 'Playzone' ? data.seatingCapacity : data.screenConfig?.[0]?.max
    if (cap != null && String(cap).trim() !== '') out.capacity = String(cap).trim()
    const price = data.primaryCategory === 'Playzone' ? null : data.screenConfig?.[0]?.price
    if (price != null && String(price).trim() !== '') out.price = String(price).trim()
  } else if (section === 'payout') {
    if ('acctHolder' in out) out.accountHolder = out.acctHolder
    if ('acctNumber' in out) out.accountNumber = out.acctNumber
    if ('payoutPhone' in out) out.phone = out.payoutPhone
    if ('upiId' in out) out.upi = out.upiId
    ;['ifsc', 'pan', 'accountNumber', 'phone', 'upi'].forEach((k) => hold(out, k, FORMAT_OK[k]))
  }
  return out
}

function toServerDraft(draft = {}) {
  const out = {}
  PATCH_SECTIONS.forEach((s) => {
    if (draft[s]) out[s] = toServerSection(s, draft[s])
  })
  return out
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const auth = vendorToken ? { Authorization: `Bearer ${vendorToken}` } : {}
  let res
  try {
    res = await fetch(`${VENDOR_API_BASE}${path}`, {
      method,
      headers: isForm ? auth : { 'Content-Type': 'application/json', ...auth },
      body: isForm ? body : body != null ? JSON.stringify(body) : undefined,
    })
  } catch (networkErr) {
    throw new ApiError('Network error — check your connection', { status: 0, cause: networkErr })
  }
  if (!res.ok) {
    let detail = null
    try {
      detail = await res.json()
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401) {
      // The impersonation token expired/invalid — NOT the admin's own session.
      vendorToken = null
      throw new AuthError(detail?.message || 'Owner session expired — re-enter the owner phone.')
    }
    throw new ApiError(detail?.message || `Request failed (${res.status})`, { status: res.status, detail })
  }
  return res.status === 204 ? null : res.json()
}

export const registerApi = {
  createDraft: (initial = {}) => request('/venues/drafts', { method: 'POST', body: toServerDraft(initial) }),

  patchDraft: (draftId, section, data, { strict = false } = {}) =>
    request(`/venues/drafts/${draftId}/sections/${section}`, {
      method: 'PATCH',
      body: toServerSection(section, data, { strict }),
    }),

  // V1 uploads the raw file (no on-device compression — that util isn't ported).
  uploadPhoto: (draftId, file, gallery = 'venuePhotos') => {
    const form = new FormData()
    form.append('file', file)
    form.append('gallery', gallery)
    return request(`/venues/drafts/${draftId}/photos`, { method: 'POST', body: form, isForm: true })
  },

  deletePhoto: (draftId, photoId, gallery = 'venuePhotos') =>
    request(`/venues/drafts/${draftId}/photos/${photoId}?gallery=${gallery}`, { method: 'DELETE' }),

  submitDraft: (draftId) => request(`/venues/drafts/${draftId}/submit`, { method: 'POST' }),

  publishListing: (record) => request('/vendors/me/listings', { method: 'POST', body: record }),
}
