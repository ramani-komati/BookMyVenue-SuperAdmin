// Error hierarchy for the register-venue flow (ported from the customer app so
// the ported venueApi / listing-composition modules share the same types).
//
//   AppError            — base type.
//   ├─ ApiError         — HTTP/service failures (carries `status`, `detail`).
//   └─ AuthError        — the impersonation token is missing/expired.

export class AppError extends Error {
  constructor(message, { cause } = {}) {
    super(message)
    this.name = 'AppError'
    this.cause = cause
  }
}

export class ApiError extends AppError {
  constructor(message, { status = 0, cause, detail } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.detail = detail || null
  }
}

export class AuthError extends AppError {
  constructor(message, { reason = 'unauthorized' } = {}) {
    super(message)
    this.name = 'AuthError'
    this.reason = reason
  }
}

/** Map any thrown value to a short user-facing message. */
export function toUserMessage(err) {
  if (err instanceof AuthError) return err.message
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Network error — check your connection and try again.'
    if (err.status === 404) return 'That record no longer exists.'
    if (err.status >= 500) return 'Server error — please try again in a moment.'
    return err.message || 'Request failed. Please try again.'
  }
  if (err instanceof AppError) return err.message
  // adminApi.request throws a plain Error carrying `.status` and the backend's
  // `{detail}` as its message — surface it instead of masking every failure as
  // a generic error (400 invalid phone, 403 not-an-admin/blocked, etc.).
  if (err && typeof err === 'object' && (typeof err.status === 'number' || err.message)) {
    if (err.status === 0) return 'Network error — check your connection and try again.'
    if (err.status === 404) return 'That endpoint isn’t available yet — the backend may not have this feature deployed.'
    if (err.status >= 500) return 'Server error — please try again in a moment.'
    return err.message || 'Request failed. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}
