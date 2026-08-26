/**
 * Money helpers shared by the booking flows.
 *
 * The backend recomputes every booking amount and rejects mismatches, so the
 * frontend must produce the exact same numbers — including the rounding
 * convention. The backend (Python) rounds half-to-even ("banker's rounding"):
 * 1198.5 → 1198, whereas JS Math.round gives 1199.
 */

/** Parse a rupee amount that may carry legacy commas ("1,499") → integer (0 if unparseable). */
export function parseAmount(v) {
  return parseInt(String(v ?? '').replace(/,/g, ''), 10) || 0;
}

/** Format a rupee amount en-IN ("1499" | "1,499" | 1499 → "1,499"). */
export function formatINR(v) {
  const n = parseAmount(v);
  return n > 0 ? n.toLocaleString('en-IN') : String(v ?? '');
}

/** Round half-to-even, matching the backend's Python round(). */
export function bankersRound(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * The server-stated amount from an amount-mismatch error, or null when the
 * error is something else. The server's number is authoritative — callers
 * retry the booking once with it. Prefers the structured error body
 * ({ code: "AMOUNT_MISMATCH", expectedAmount }) carried on ApiError.detail;
 * falls back to parsing "expected ₹X" out of the message for older shapes.
 */
export function mismatchAmount(err) {
  const structured = Number(err?.detail?.expectedAmount);
  if (Number.isFinite(structured) && structured >= 0) return Math.round(structured);
  const m = /expected\s*₹\s*([\d,]+(?:\.\d+)?)/i.exec(err?.message || '');
  return m ? Math.round(parseFloat(m[1].replace(/,/g, ''))) : null;
}
