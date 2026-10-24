/**
 * Booking time engine — the SINGLE source of truth for slot availability and
 * validation, shared by the customer booking page, the vendor walk-in modal and
 * the API commit checks.
 *
 * Design goals (every edge case handled in one place, not scattered):
 *   • Times are minutes-since-midnight; an end of 00:00 means midnight (1440).
 *   • Slots are stored as labels like "13:30 – 14:30" (en dash, 24h).
 *   • Availability is OVERLAP-aware, so a custom time blocks every slot it covers.
 *   • The UI only ever offers valid choices (future, in-hours, non-overlapping),
 *     and `validateInterval` is the final guard used again at commit time.
 *   • "Today" and "now" use LOCAL time (not UTC) so evening bookings work.
 */

const EN_DASH = '–';

// Business rules — change here, everywhere follows.
export const OPEN_MIN = 6 * 60; // 06:00
export const CLOSE_MIN = 24 * 60; // 00:00 next day (midnight)
export const STEP_MIN = 60; // selection granularity (1-hour slots)
export const MIN_DURATION = 60; // shortest bookable slot (1 hour)
export const MAX_DURATION = 12 * 60; // safety cap on a single booking

// ---- Parsing / formatting -------------------------------------------------

/** Parse a slot label into { start, end } minutes, or null if unparseable. */
export function parseSlotRange(label) {
  const m = String(label).match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  let end = Number(m[3]) * 60 + Number(m[4]);
  if (end === 0) end = CLOSE_MIN; // midnight end
  return end > start ? { start, end } : null;
}

/** Do two [start, end) minute ranges overlap? */
export function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

/** Minutes → "HH:MM" (24h; 1440 wraps to "00:00"). */
function fmt24(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Minutes → friendly 12-hour label, e.g. 810 → "1:30 PM", 1440 → "12:00 AM". */
export function formatMin(min) {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

/** Minutes → "1 hr 30 min" style duration. */
export function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

/** Build a slot label from minute bounds, e.g. (810, 870) → "13:30 – 14:30". */
export function makeSlotLabel(startMin, endMin) {
  return `${fmt24(startMin)} ${EN_DASH} ${fmt24(endMin)}`;
}

/**
 * The end minute SHOWN to a human for a slot. A slot is stored as a half-open
 * range [start, end) — e.g. 07:00–08:00 means "up to but not including 08:00".
 * Showing the raw 08:00 makes it look shared with the next slot (which starts at
 * 08:00), so every user-facing range shows the inclusive last minute instead:
 * 07:00–08:00 reads as "7:00 – 7:59". Stored labels / overlap math are unchanged.
 */
export function displayEndMin(endMin) {
  return endMin - 1;
}

/** A booked label shown in 12-hour form, e.g. "1:30 PM – 2:29 PM". */
export function prettyLabel(label) {
  const r = parseSlotRange(label);
  return r ? `${formatMin(r.start)} – ${formatMin(displayEndMin(r.end))}` : label;
}

/** A stored label reformatted for display in 24h form with the inclusive end,
 *  e.g. "19:00 – 20:00" → "19:00 – 19:59". Falls back to the raw label. */
export function formatSlotLabel(label) {
  const r = parseSlotRange(label);
  return r ? `${fmt24(r.start)} ${EN_DASH} ${fmt24(displayEndMin(r.end))}` : label;
}

/**
 * Rewrite every time RANGE embedded in an already-formatted display string so
 * its END shows the inclusive last minute:
 *   "6:00 PM – 7:00 PM"            → "6:00 PM – 6:59 PM"
 *   "Aug 15 · 18:00 – 19:00"       → "Aug 15 · 18:00 – 18:59"
 * Works on both 12-hour (with AM/PM) and 24-hour ranges and leaves any text
 * without a parseable range untouched. Used for booking-time strings the
 * backend pre-formats (the admin app renders those verbatim). ASSUMES the
 * source shows the half-open boundary end (X:00); do not double-apply.
 */
export function displayInclusiveEnd(text) {
  if (text == null) return text;
  return String(text).replace(
    /(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?\s*[–—-]\s*)(\d{1,2}):(\d{2})(\s*)([AaPp][Mm])?/g,
    (full, head, eh, em, sp, ap) => {
      const endH = Number(eh);
      const endM = Number(em);
      const h24 = ap ? (endH % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0) : endH;
      let endMin = h24 * 60 + endM;
      if (endMin === 0) endMin = 24 * 60; // a midnight end (00:00) means 1440
      const inc = endMin - 1;
      const nh = Math.floor(inc / 60) % 24;
      const nm = String(inc % 60).padStart(2, '0');
      if (ap) {
        const suffix = nh >= 12 ? 'PM' : 'AM';
        const cased = ap === ap.toLowerCase() ? suffix.toLowerCase() : suffix;
        const h12 = nh % 12 === 0 ? 12 : nh % 12;
        return `${head}${h12}:${nm}${sp || ' '}${cased}`;
      }
      return `${head}${String(nh).padStart(2, '0')}:${nm}`;
    },
  );
}

/** Slot length in minutes (defaults to 60 if the label can't be parsed). */
export function slotDurationMin(label) {
  const r = parseSlotRange(label);
  return r ? r.end - r.start : 60;
}

// ---- Local clock (never UTC — that shifted the date after 6:30pm IST) ------

/** Local calendar date as "YYYY-MM-DD". */
export function localTodayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Current clock time as minutes-since-midnight (local time). */
export function nowMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Has this booking finished? True when its date is before today, or it's
 * today and the LAST booked slot has ended (a 6–8 AM booking is "completed"
 * from 8 AM, not from midnight). Unparseable/absent slots fall back to the
 * date-only rule so the booking stays "upcoming" for its whole day.
 */
export function isBookingOver(dateISO, slotLabels = [], now = new Date()) {
  const date = String(dateISO || '');
  if (!date) return false;
  const today = localTodayISO(now);
  if (date < today) return true;
  if (date > today) return false;
  const ends = (Array.isArray(slotLabels) ? slotLabels : [])
    .map((l) => parseSlotRange(l)?.end)
    .filter((n) => Number.isFinite(n));
  return ends.length > 0 && Math.max(...ends) <= nowMinutes(now);
}

// ---- Availability ----------------------------------------------------------

/** Booked labels → sorted, parsed { start, end } intervals. */
export function bookedIntervals(bookedLabels = []) {
  return bookedLabels.map(parseSlotRange).filter(Boolean).sort((a, b) => a.start - b.start);
}

/**
 * Is `label` unavailable given already-booked labels? True when it overlaps any
 * booked range (covers custom times); falls back to exact match if unparseable.
 */
export function isSlotTaken(label, bookedLabels = []) {
  const r = parseSlotRange(label);
  if (!r) return bookedLabels.includes(label);
  return bookedLabels.some((b) => {
    const br = parseSlotRange(b);
    return br ? rangesOverlap(r, br) : b === label;
  });
}

/**
 * Is this slot in the past? True only when `dateISO` is today (local) AND the
 * slot's start time has already passed. Future dates are never past.
 */
export function isPastSlot(label, dateISO, now = new Date()) {
  if (dateISO !== localTodayISO(now)) return false;
  const r = parseSlotRange(label);
  return r ? r.start < nowMinutes(now) : false;
}

/** The earliest a new booking may start on `dateISO` (STEP-aligned). */
export function earliestStart(dateISO, now = new Date()) {
  if (dateISO !== localTodayISO(now)) return OPEN_MIN;
  return Math.max(OPEN_MIN, Math.ceil(nowMinutes(now) / STEP_MIN) * STEP_MIN);
}

/**
 * Candidate START times (minutes) for a date: STEP-aligned, from now/open until
 * there's room for at least MIN_DURATION, excluding anything that would fall in
 * a booked-or-already-selected interval.
 */
export function availableStarts(dateISO, bookedLabels = [], selected = [], now = new Date()) {
  const taken = bookedIntervals([...bookedLabels, ...selected]);
  const out = [];
  for (let t = earliestStart(dateISO, now); t + MIN_DURATION <= CLOSE_MIN; t += STEP_MIN) {
    const probe = { start: t, end: t + MIN_DURATION };
    if (!taken.some((iv) => rangesOverlap(iv, probe))) out.push(t);
  }
  return out;
}

/** Longest duration (minutes) bookable from `startMin` before the next booking/close. */
export function maxDurationFrom(startMin, bookedLabels = [], selected = []) {
  let limit = CLOSE_MIN;
  bookedIntervals([...bookedLabels, ...selected]).forEach((iv) => {
    if (iv.start >= startMin && iv.start < limit) limit = iv.start;
  });
  return Math.min(MAX_DURATION, limit - startMin);
}

/** Duration options (STEP increments) that fit from `startMin`. */
export function durationOptions(startMin, bookedLabels = [], selected = []) {
  const max = maxDurationFrom(startMin, bookedLabels, selected);
  const out = [];
  for (let d = MIN_DURATION; d <= max; d += STEP_MIN) out.push(d);
  return out;
}

/**
 * The final guard. Returns an error string if the interval is invalid for the
 * date, or null if it's good. Used both when adding in the UI and again at
 * commit time in the API, so nothing invalid is ever persisted.
 */
export function validateInterval({ startMin, endMin, dateISO, bookedLabels = [], selected = [], now = new Date() }) {
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return 'Enter a valid time.';
  if (endMin <= startMin) return 'End time must be after the start.';
  if (endMin - startMin < MIN_DURATION) return `Minimum booking is ${MIN_DURATION} minutes.`;
  if (endMin - startMin > MAX_DURATION) return 'That booking is too long.';
  if (startMin < OPEN_MIN || endMin > CLOSE_MIN) return 'Time must be within business hours (6:00 AM–12:00 AM).';
  if (!dateISO) return 'Pick a date first.';
  if (dateISO < localTodayISO(now)) return 'That date has already passed.';
  if (dateISO === localTodayISO(now) && startMin < nowMinutes(now)) return 'That time has already passed today.';
  const label = makeSlotLabel(startMin, endMin);
  if (isSlotTaken(label, bookedLabels)) return 'That time is already booked.';
  if (isSlotTaken(label, selected)) return 'That overlaps a time you already picked.';
  return null;
}
