/** Money helpers (ported from the customer app; used by listing composition). */

/** Parse a rupee amount that may carry legacy commas ("1,499") → integer (0 if unparseable). */
export function parseAmount(v) {
  return parseInt(String(v ?? '').replace(/,/g, ''), 10) || 0
}

/** Format a rupee amount en-IN ("1499" | "1,499" | 1499 → "1,499"). */
export function formatINR(v) {
  const n = parseAmount(v)
  return n > 0 ? n.toLocaleString('en-IN') : String(v ?? '')
}
