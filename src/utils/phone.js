/**
 * Indian phone numbers — ONE rule for every phone field (QA audit
 * 2026-10-30: "12345abc12345" passed because the letters were stripped and
 * the remaining 10 digits accepted; an OTP was then requested for a number
 * nobody typed). Mirrors the backend's accounts/serializers.normalize_mobile.
 *
 *   • Letters (or any symbol other than + space ( ) . -) are REFUSED, never
 *     stripped away.
 *   • A +91 / 91 / 0 prefix is removed, leaving the 10-digit number.
 *   • A MOBILE number (sign-in / OTP) must start with 6, 7, 8 or 9.
 *
 * Pure (no imports) so `npm test` covers it.
 */

const ALLOWED = /^\+?[\d\s().-]+$/;

/** The bare 10 digits of a typed number, or null when it isn't one. */
export function normalizePhone(value) {
  const text = String(value ?? '').trim();
  if (!text || !ALLOWED.test(text)) return null;
  let digits = text.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** A 10-digit Indian MOBILE number (OTP sign-in), or null. */
export function normalizeMobile(value) {
  const digits = normalizePhone(value);
  return digits && /^[6-9]/.test(digits) ? digits : null;
}

export const MOBILE_ERROR = 'Enter a valid 10-digit mobile number (starting with 6, 7, 8 or 9)';
