/**
 * Safe localStorage helpers (ported from the customer app).
 * Browser storage can throw (private mode, quota, disabled cookies), so every
 * access is wrapped — callers get sensible fallbacks instead of a crash.
 */

export function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function readString(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : raw
  } catch {
    return fallback
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
