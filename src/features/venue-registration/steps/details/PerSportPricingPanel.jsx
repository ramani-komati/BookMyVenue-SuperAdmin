import { Select, TextField } from '@/reg-ui';
import { PLAYZONE_SPORTS, SPORT_CAP_OPTIONS, SPORT_CFG_DEFAULT, SPORT_UNIT } from '@/constants/venue';
import { sanitizeAmount, sanitizeDigitsMax } from '@/utils/validation';
import useDetails from './useDetails';

const clampUnits = (n) => Math.max(1, Math.min(20, parseInt(n || '1', 10) || 1));
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pricing block for a single sport. */
function SportBlock({ sport }) {
  const { details, setSportField, setSportUnit, flushNow } = useDetails();
  const cfg = details.sportConfig?.[sport] || SPORT_CFG_DEFAULT;
  const unit = SPORT_UNIT[sport] || { s: 'unit', p: 'units' };
  const sing = cap1(unit.s);
  const count = clampUnits(cfg.units);
  const isLimited = (cfg.capacity || 'Unlimited persons') === 'Limited persons';
  // With more than one unit, capacity and price are captured per unit below —
  // showing the single fields too would read as an extra phantom unit.
  const single = count <= 1;
  const topCols = 1 + (single ? 1 : 0) + (single && isLimited ? 1 : 0);

  return (
    <div className="rv-subbox">
      <div
        style={{
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--fw-bold)',
          color: 'var(--text-heading)',
          marginBottom: 16,
        }}
      >
        {sport}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${topCols},minmax(0,300px))`,
          gap: 20,
        }}
        className="rv-sport-top"
      >
        <Select
          label="Capacity"
          options={SPORT_CAP_OPTIONS}
          value={cfg.capacity || 'Unlimited persons'}
          onChange={(e) => setSportField(sport, 'capacity', e.target.value)}
          onBlur={flushNow}
        />
        {single && isLimited && (
          <TextField
            label="Max persons"
            inputMode="numeric"
            value={cfg.maxPersons || ''}
            onChange={(e) => setSportField(sport, 'maxPersons', sanitizeDigitsMax(e.target.value, 6))}
            onBlur={flushNow}
          />
        )}
        {single && (
          <TextField
            label="Price per hour (₹)"
            prefix="₹"
            inputMode="decimal"
            value={cfg.price || ''}
            onChange={(e) => setSportField(sport, 'price', sanitizeAmount(e.target.value))}
            onBlur={flushNow}
          />
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <TextField
          label={`No. of ${unit.p}`}
          type="number"
          min={1}
          max={20}
          step={1}
          inputMode="numeric"
          hint={`Customers pick which ${unit.s} at booking. Different ${unit.p} can be booked in parallel.`}
          value={cfg.units ?? ''}
          onChange={(e) => setSportField(sport, 'units', sanitizeDigitsMax(e.target.value, 2))}
          onBlur={(e) => {
            // Allow the field to be emptied while typing, but never leave it
            // blank — fall back to a single unit when the user moves on.
            if (!e.target.value) setSportField(sport, 'units', '1');
            flushNow();
          }}
        />
      </div>

      {count > 1 && (
        <>
          {isLimited && (
          <div className="rv-subbox" style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--fw-bold)',
                color: 'var(--text-heading)',
                marginBottom: 14,
              }}
            >
              Per-{unit.s} max persons
            </div>
            <div className="rv-checkgrid">
              {Array.from({ length: count }, (_, i) => (
                <TextField
                  key={i}
                  label={`${sing} ${i + 1}`}
                  inputMode="numeric"
                  value={(cfg.unitMax || {})[i] || ''}
                  onChange={(e) => setSportUnit(sport, 'unitMax', i, sanitizeDigitsMax(e.target.value, 6))}
                  onBlur={flushNow}
                />
              ))}
            </div>
          </div>
          )}

          <div className="rv-subbox" style={{ marginTop: 16 }}>
            <div
              style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--text-heading)' }}
            >
              Per-{unit.s} price per hour (₹)
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '4px 0 14px' }}>
              Set the hourly price for each {unit.s}.
            </div>
            <div className="rv-checkgrid">
              {Array.from({ length: count }, (_, i) => (
                <TextField
                  key={i}
                  label={`${sing} ${i + 1}`}
                  prefix="₹"
                  inputMode="decimal"
                  placeholder="₹0"
                  value={(cfg.unitPrice || {})[i] || ''}
                  onChange={(e) => setSportUnit(sport, 'unitPrice', i, sanitizeAmount(e.target.value))}
                  onBlur={flushNow}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Per-sport pricing panel (Playzone). One block per selected sport.
 */
export default function PerSportPricingPanel() {
  const { details } = useDetails();
  const selected = PLAYZONE_SPORTS.filter((s) => details.sports?.[s]);

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">Per-sport pricing (per hour)</div>
      {selected.length === 0 ? (
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)' }}>
          Pick sports above to set their per-hour price.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {selected.map((sport) => (
            <SportBlock key={sport} sport={sport} />
          ))}
        </div>
      )}
    </div>
  );
}
