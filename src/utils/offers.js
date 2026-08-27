/**
 * Offer / coupon helpers shared by the vendor form, the venue detail page and
 * the booking flow.
 *
 * A vendor can attach discount offers to their venue. Each offer is either a
 * PERCENT (e.g. 10% off, optionally capped) or a FLAT rupee amount off, with an
 * optional minimum spend and expiry date. The discount applies to the venue's
 * own charge (slots + add-ons) — NOT to the ₹20 platform fee, and never to the
 * "pay at venue" items (packages / extra persons).
 *
 * The booking payload carries `offer` + `discountAmount` so the discount can be
 * validated/applied once the coupon APIs are wired.
 */

import { bankersRound, parseAmount } from './money';

export const OFFER_TYPES = [
  { value: 'percent', label: '% off' },
  { value: 'flat', label: '₹ off' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** A single blank offer row for the vendor form. */
export const blankOffer = () => ({
  title: '',
  code: '',
  type: 'percent',
  value: '',
  minAmount: '',
  maxDiscount: '',
  expiry: '',
  // How many times ONE user may redeem this offer. Blank/0 = unlimited.
  perUserLimit: '',
});

/**
 * Normalize a raw offer (form/stored shape, string fields) into a clean object
 * with numeric fields and an uppercased code. Returns null for empty rows.
 */
export function normalizeOffer(raw, i = 0) {
  if (!raw) return null;
  const type = raw.type === 'flat' ? 'flat' : 'percent';
  const value = parseAmount(raw.value);
  const title = String(raw.title || '').trim();
  const code = String(raw.code || '').trim().toUpperCase();
  // An offer needs a positive value and at least a title or a code to exist.
  if (value <= 0 || (!title && !code)) return null;
  return {
    id: code || `offer-${i}`,
    title: title || (code ? `Coupon ${code}` : 'Offer'),
    code,
    type,
    value,
    minAmount: Math.max(0, parseAmount(raw.minAmount)),
    maxDiscount: Math.max(0, parseAmount(raw.maxDiscount)),
    expiry: String(raw.expiry || '').trim(),
    // Per-user redemption cap (0 = unlimited). Enforced server-side.
    perUserLimit: Math.max(0, parseAmount(raw.perUserLimit)),
  };
}

/** Normalize + drop empties for a list of raw offers. */
export function normalizeOffers(list) {
  return (Array.isArray(list) ? list : [])
    .map((o, i) => normalizeOffer(o, i))
    .filter(Boolean);
}

/** True while the offer is still live (not past its expiry date). */
export function isOfferActive(offer, today = todayISO()) {
  if (!offer) return false;
  return !offer.expiry || offer.expiry >= today;
}

/** Only the offers a customer can still see/use today. */
export function activeOffers(list, today = todayISO()) {
  return normalizeOffers(list).filter((o) => isOfferActive(o, today));
}

/**
 * Evaluate an offer against the discountable base (slots + add-ons, in rupees).
 * Returns { eligible, discount, reason, shortBy } — `discount` is 0 unless
 * eligible; `shortBy` is how many rupees more are needed to meet a minimum.
 */
export function evalOffer(offer, base, today = todayISO()) {
  const o = offer && offer.value != null ? offer : normalizeOffer(offer);
  if (!o || o.value <= 0) return { eligible: false, discount: 0, reason: 'Invalid offer', shortBy: 0 };
  if (!isOfferActive(o, today)) return { eligible: false, discount: 0, reason: 'This offer has expired', shortBy: 0 };
  if (o.minAmount > 0 && base < o.minAmount) {
    return {
      eligible: false,
      discount: 0,
      reason: `Add ₹${(o.minAmount - base).toLocaleString('en-IN')} more to use this offer`,
      shortBy: o.minAmount - base,
    };
  }
  let discount = o.type === 'percent' ? bankersRound((base * o.value) / 100) : o.value;
  if (o.type === 'percent' && o.maxDiscount > 0) discount = Math.min(discount, o.maxDiscount);
  discount = Math.max(0, Math.min(discount, base)); // never exceed the base
  if (discount <= 0) return { eligible: false, discount: 0, reason: 'This offer gives no discount here', shortBy: 0 };
  return { eligible: true, discount, reason: '', shortBy: 0 };
}

/** Just the headline discount, e.g. "₹200 OFF" or "10% OFF" — for the compact
 *  venue-card badge (no min-spend / cap / expiry details). */
export function offerShort(offer) {
  const o = offer && offer.value != null ? offer : normalizeOffer(offer);
  if (!o) return '';
  return o.type === 'percent' ? `${o.value}% OFF` : `₹${o.value.toLocaleString('en-IN')} OFF`;
}

/** A one-line human summary of an offer's terms, e.g. "10% OFF up to ₹200 · Min ₹500". */
export function offerSummary(offer) {
  const o = offer && offer.value != null ? offer : normalizeOffer(offer);
  if (!o) return '';
  const head = o.type === 'percent' ? `${o.value}% OFF` : `₹${o.value.toLocaleString('en-IN')} OFF`;
  const parts = [o.type === 'percent' && o.maxDiscount > 0 ? `${head} up to ₹${o.maxDiscount.toLocaleString('en-IN')}` : head];
  if (o.minAmount > 0) parts.push(`Min ₹${o.minAmount.toLocaleString('en-IN')}`);
  if (o.perUserLimit > 0) parts.push(`${o.perUserLimit} use${o.perUserLimit === 1 ? '' : 's'}/user`);
  if (o.expiry) {
    const dt = new Date(`${o.expiry}T00:00`);
    if (!Number.isNaN(dt.getTime())) parts.push(`Till ${dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
  }
  return parts.join(' · ');
}
