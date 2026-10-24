/**
 * Field validation + input sanitisation utilities.
 *
 * Two kinds of helpers live here:
 *  - validate*  : take a value, return an error string or `null` when valid.
 *  - sanitize*  : transform raw keystrokes so invalid characters never land in
 *                 state (used by onChange handlers to restrict typing).
 *
 * Keep messages short and user-friendly.
 */

const isBlank = (v) => v == null || String(v).trim() === '';

// ---------------------------------------------------------------------------
// Sanitisers (input restriction)
// ---------------------------------------------------------------------------

/** Keep digits only. */
export const sanitizeDigits = (v) => String(v ?? '').replace(/\D+/g, '');

/** Digits only, capped to `max` length. */
export const sanitizeDigitsMax = (v, max) => sanitizeDigits(v).slice(0, max);

/** Uppercase alphanumerics only (PAN / IFSC), capped to `max`. */
export const sanitizeUpperAlnum = (v, max) =>
  String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, max);

/** Decimal money input: digits + a single dot. */
export const sanitizeAmount = (v) => {
  const cleaned = String(v ?? '').replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
};

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export const validateRequired = (v, label = 'This field') =>
  isBlank(v) ? `${label} is required` : null;

export const validateVenueName = (v) => {
  if (isBlank(v)) return 'Venue name is required';
  const s = String(v).trim();
  if (s.length < 3) return 'Venue name looks too short';
  if (!/[A-Za-z]/.test(s)) return 'Venue name must contain letters, not just numbers';
  return null;
};

export const validateDescription = (v, min = 20) => {
  if (isBlank(v)) return null; // optional
  const s = String(v).trim();
  if (s.length < min) return `Add a little more detail (at least ${min} characters)`;
  // Reject a single character repeated (e.g. "aaaa").
  if (/^(.)\1+$/.test(s.replace(/\s+/g, ''))) return 'Please write a meaningful description';
  return null;
};

export const validateEmail = (v, { required = false } = {}) => {
  if (isBlank(v)) return required ? 'Email is required' : null;
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
  return ok ? null : 'Enter a valid email address';
};

export const validatePhone = (v, { required = true, label = 'Phone number' } = {}) => {
  if (isBlank(v)) return required ? `${label} is required` : null;
  const digits = sanitizeDigits(v);
  return /^\d{10}$/.test(digits) ? null : `${label} must be exactly 10 digits`;
};

export const validatePincode = (v, { required = true } = {}) => {
  if (isBlank(v)) return required ? 'Pincode is required' : null;
  return /^\d{6}$/.test(sanitizeDigits(v)) ? null : 'Pincode must be exactly 6 digits';
};

export const validatePan = (v, { required = false } = {}) => {
  if (isBlank(v)) return required ? 'PAN is required' : null;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(v).toUpperCase())
    ? null
    : 'Enter a valid PAN (e.g. ABCDE1234F)';
};

export const validateIfsc = (v, { required = true } = {}) => {
  if (isBlank(v)) return required ? 'IFSC code is required' : null;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(v).toUpperCase())
    ? null
    : 'Enter a valid IFSC code (e.g. HDFC0001234)';
};

export const validateAccountNumber = (v, { required = true } = {}) => {
  if (isBlank(v)) return required ? 'Account number is required' : null;
  return /^\d{9,18}$/.test(sanitizeDigits(v))
    ? null
    : 'Account number must be 9–18 digits';
};

export const validateUpi = (v, { required = false } = {}) => {
  if (isBlank(v)) return required ? 'UPI ID is required' : null;
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(String(v).trim())
    ? null
    : 'Enter a valid UPI ID (e.g. name@upi)';
};

export const validateMapsLink = (v, { required = true } = {}) => {
  if (isBlank(v)) return required ? 'Google Maps link is required' : null;
  let url;
  try {
    url = new URL(String(v).trim());
  } catch {
    return 'Enter a valid URL';
  }
  if (!/^https?:$/.test(url.protocol)) return 'Link must start with http(s)://';
  const host = url.hostname.toLowerCase();
  const looksLikeMaps =
    /(^|\.)google\.[a-z.]+$/.test(host) ||
    host.includes('goo.gl') ||
    host.includes('maps.app.goo.gl') ||
    host.includes('g.page');
  return looksLikeMaps ? null : 'Enter a valid Google Maps link';
};

/** Whole, non-negative integer (seating, pitches, courts, etc.). */
export const validateWholeNumber = (v, { required = false, label = 'Value', min = 0 } = {}) => {
  if (isBlank(v)) return required ? `${label} is required` : null;
  const s = String(v).trim();
  if (!/^\d+$/.test(s)) return `${label} must be a whole number`;
  if (Number(s) < min) return `${label} must be at least ${min}`;
  return null;
};

/** Non-negative amount (price). Allows decimals. */
export const validateAmount = (v, { required = false, label = 'Price' } = {}) => {
  if (isBlank(v)) return required ? `${label} is required` : null;
  const s = String(v).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return `${label} must be a valid amount`;
  return null;
};
