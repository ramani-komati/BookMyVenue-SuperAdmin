import { Switch, TextField } from '@/reg-ui';
import { bookablePeriods, closesNextDay, timingsFromDetails, timingsLabel } from '@/utils/venueTimings';
import useDetails from './useDetails';

/**
 * Venue Timings — when the venue is open: an open and a close time, or
 * "Open 24 hours". Shown for every venue category (events schedule each
 * show instead, so they have none). The same panel in vendor registration,
 * vendor venue editing and the super admin's register / edit forms; the
 * rules live in utils/venueTimings.js and the server checks them again.
 */
export default function TimingsPanel() {
  const { details, errors, set, patch, flushNow } = useDetails();
  const allDay = Boolean(details.open24Hours);
  const timings = timingsFromDetails(details);
  const nextDay = closesNextDay(details);
  const narrowed = timings && !allDay && bookablePeriods(timings).some(([s, e]) => s !== 6 * 60 || e !== 24 * 60);

  return (
    <div className="rv-panel">
      <div className="rv-panel-h" style={{ marginBottom: 6 }}>
        Venue Timings
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
        When customers can visit. Shown on your venue page and used for online bookings.
      </div>

      <Switch
        label="Open 24 hours"
        checked={allDay}
        onChange={(e) => {
          const on = e.target.checked;
          patch((prev) => ({ ...prev, open24Hours: on }));
        }}
        onBlur={flushNow}
      />

      {!allDay && (
        <div className="rv-grid-2" style={{ marginTop: 16 }}>
          <TextField
            label="Open time"
            type="time"
            required
            step={300}
            value={details.openTime || ''}
            error={errors.openTime}
            onChange={(e) => set('openTime', e.target.value)}
            onBlur={flushNow}
          />
          <TextField
            label="Close time"
            type="time"
            required
            step={300}
            value={details.closeTime || ''}
            error={errors.closeTime}
            hint={nextDay ? 'Closes after midnight (next day)' : undefined}
            onChange={(e) => set('closeTime', e.target.value)}
            onBlur={flushNow}
          />
        </div>
      )}

      {timings && (
        <div style={{ marginTop: 14, fontSize: 'var(--text-sm)', color: 'var(--text-heading)', fontWeight: 'var(--fw-semibold)' }}>
          Customers see: {timingsLabel(timings)}
        </div>
      )}
      {(allDay || nextDay || narrowed) && (
        <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Online bookings are taken between 6:00 AM and 12:00 AM (midnight)
          {allDay || nextDay ? ' — late-night hours are shown on your page but can’t be booked online yet.' : ', within these hours.'}
        </div>
      )}
    </div>
  );
}
