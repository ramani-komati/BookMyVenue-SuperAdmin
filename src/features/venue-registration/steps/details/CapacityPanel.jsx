import { Switch, TextField } from '@/reg-ui';
import { CAT_UNIT } from '@/constants/venue';
import { sanitizeAmount, sanitizeDigitsMax } from '@/utils/validation';
import useDetails from './useDetails';

const unitFor = (cat) => CAT_UNIT[cat] || 'screen';
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const clampCount = (n) => Math.max(1, Math.min(20, parseInt(n || '1', 10) || 1));

/**
 * Capacity & facilities panel.
 * Playzone venues capture a single on-site capacity; everything else captures
 * a bookable-unit count (halls / lawns / screens) with per-unit max persons.
 */
export default function CapacityPanel() {
  const { details, errors, set, setScreenField, toggleBool, flushNow } = useDetails();
  const isPlayzone = details.primaryCategory === 'Playzone';
  const unit = unitFor(details.primaryCategory);
  const count = clampCount(details.numScreens);

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">Capacity &amp; facilities</div>

      {!isPlayzone && (
        <>
          <div style={{ maxWidth: 300 }}>
            <TextField
              label={`No. of ${unit}s`}
              type="number"
              min={1}
              max={20}
              step={1}
              inputMode="numeric"
              hint={`Customers pick a ${unit} at booking time. Different ${unit}s can be booked in parallel.`}
              value={details.numScreens ?? ''}
              onChange={(e) => set('numScreens', sanitizeDigitsMax(e.target.value, 2))}
              onBlur={(e) => {
                if (!e.target.value) set('numScreens', '1');
                flushNow();
              }}
            />
          </div>

          <div className="rv-subbox" style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--fw-bold)',
                color: 'var(--text-heading)',
                marginBottom: 4,
              }}
            >
              Per-{unit} capacity &amp; pricing
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
              Set the max persons and the booking price for each {unit}.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: count }, (_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '92px 1fr 1fr',
                    gap: 14,
                    alignItems: 'start',
                    maxWidth: 560,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--fw-semibold)',
                      color: 'var(--text-heading)',
                      paddingTop: 34,
                    }}
                  >
                    {cap1(unit)} {i + 1}
                  </span>
                  <TextField
                    label="Max persons"
                    inputMode="numeric"
                    placeholder="e.g. 20"
                    error={i === 0 ? errors.capacity : undefined}
                    value={(details.screenConfig?.[i] || {}).max || ''}
                    onChange={(e) => setScreenField(i, 'max', sanitizeDigitsMax(e.target.value, 6))}
                    onBlur={flushNow}
                  />
                  <TextField
                    label="Price (₹)"
                    prefix="₹"
                    inputMode="decimal"
                    placeholder="e.g. 2000"
                    error={i === 0 ? errors.price : undefined}
                    value={(details.screenConfig?.[i] || {}).price || ''}
                    onChange={(e) => setScreenField(i, 'price', sanitizeAmount(e.target.value))}
                    onBlur={flushNow}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isPlayzone && (
        <TextField
          label="Capacity (max people on-site at once)"
          inputMode="numeric"
          placeholder="e.g. 150"
          error={errors.seatingCapacity}
          value={details.seatingCapacity}
          onChange={(e) => set('seatingCapacity', sanitizeDigitsMax(e.target.value, 6))}
          onBlur={flushNow}
        />
      )}

      <div className="rv-grid-2" style={{ marginTop: 20 }}>
        <div className="rv-toggle">
          <span>Parking available</span>
          <Switch checked={details.parkingAvailable} onChange={() => toggleBool('parkingAvailable')} />
        </div>
        <div className="rv-toggle">
          <span>Dining available</span>
          <Switch checked={details.diningAvailable} onChange={() => toggleBool('diningAvailable')} />
        </div>
      </div>
    </div>
  );
}
