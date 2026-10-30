/**
 * Venue Timings — a venue's opening hours as the registration / edit forms
 * collect them: one open time and one close time, or "Open 24 hours". Every
 * venue category has them except Events (events schedule each show).
 *
 * Draft fields (details):  openTime "09:00" · closeTime "22:00" · open24Hours
 * Record (detail.timings): { open, close, open24Hours }
 *
 * The SAME rules as the backend (venues/timings.py), which re-checks every
 * save. A close time earlier than the open time means the venue closes after
 * midnight. Online bookings are still taken on the platform's 6:00 AM –
 * midnight grid; the timings narrow that grid, and the venue page shows the
 * real hours. An identical copy lives in the super admin app (diff them).
 * Pure functions, relative imports only, so `npm test` covers them.
 */

const CLOCK = /^(\d{1,2}):(\d{2})$/;
const GRID_OPEN = 6 * 60;
const GRID_CLOSE = 24 * 60;
const STEP = 30;

/** "09:30" → 570, or null when it is not a time. */
export function toMinutes(text) {
  const m = CLOCK.exec(String(text ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

const pad = (n) => String(n).padStart(2, '0');
const clock = (minute) => `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;

/** The draft's timings in the record shape, or null when none are set. */
export function timingsFromDetails(details = {}) {
  if (details.open24Hours) return { open: '', close: '', open24Hours: true };
  const open = toMinutes(details.openTime);
  const close = toMinutes(details.closeTime);
  if (open == null || close == null) return null;
  return { open: clock(open), close: clock(close), open24Hours: false };
}

/** A record's timings back into draft fields (for editing). */
export function detailsFromTimings(timings) {
  if (!timings) return {};
  return {
    openTime: timings.open24Hours ? '' : timings.open || '',
    closeTime: timings.open24Hours ? '' : timings.close || '',
    open24Hours: Boolean(timings.open24Hours),
  };
}

/** The bookable periods on the 06:00–24:00 grid ([[start, end] minutes]). */
export function bookablePeriods(timings) {
  if (!timings || timings.open24Hours) return [[GRID_OPEN, GRID_CLOSE]];
  const start = toMinutes(timings.open);
  let end = toMinutes(timings.close);
  if (start == null || end == null) return [[GRID_OPEN, GRID_CLOSE]];
  if (end === 0) end = GRID_CLOSE;
  const up = Math.ceil(start / STEP) * STEP;
  const down = (m) => Math.floor(m / STEP) * STEP;
  const raw = end > start ? [[up, down(end)]] : [[GRID_OPEN, down(end)], [up, GRID_CLOSE]];
  return raw
    .map(([s, e]) => [Math.max(s, GRID_OPEN), Math.min(e, GRID_CLOSE)])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
}

/** True when the venue closes after midnight. */
export function closesNextDay(details = {}) {
  if (details.open24Hours) return false;
  const open = toMinutes(details.openTime);
  const close = toMinutes(details.closeTime);
  return open != null && close != null && close !== 0 && close < open;
}

/**
 * Field errors for the Venue Timings section: { openTime?, closeTime? }.
 * Empty object = valid. `required` (the default) demands timings.
 */
export function timingsErrors(details = {}, { required = true } = {}) {
  if (details.open24Hours) return {};
  const errors = {};
  const openText = String(details.openTime ?? '').trim();
  const closeText = String(details.closeTime ?? '').trim();
  if (!openText && !closeText && !required) return {};
  const open = toMinutes(openText);
  const close = toMinutes(closeText);
  if (!openText) errors.openTime = 'Enter the opening time, or turn on Open 24 hours';
  else if (open == null) errors.openTime = 'Enter a valid time';
  if (!closeText) errors.closeTime = 'Enter the closing time';
  else if (close == null) errors.closeTime = 'Enter a valid time';
  if (Object.keys(errors).length) return errors;
  if (open === close) {
    return { closeTime: 'Opening and closing times are the same — turn on Open 24 hours if the venue never closes' };
  }
  if (bookablePeriods(timingsFromDetails(details)).length === 0) {
    return { closeTime: 'These hours leave no bookable time — online bookings run 6:00 AM to midnight' };
  }
  return {};
}

const ampm = (minute) => {
  const m = minute % (24 * 60);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`;
};

/** "Open 24 hours" · "9:00 AM – 10:00 PM" · "6:00 PM – 2:00 AM (next day)" · ''. */
export function timingsLabel(timings) {
  if (!timings) return '';
  if (timings.open24Hours) return 'Open 24 hours';
  const open = toMinutes(timings.open);
  const close = toMinutes(timings.close);
  if (open == null || close == null) return '';
  return `${ampm(open)} – ${ampm(close)}${close < open && close !== 0 ? ' (next day)' : ''}`;
}
