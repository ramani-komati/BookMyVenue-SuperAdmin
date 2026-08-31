import { TextField } from '@/reg-ui';
import { sanitizeAmount, sanitizeDigitsMax } from '@/utils/validation';
import useDetails from './useDetails';

/**
 * Extra-person pricing (non-Playzone, non-Resort). Lets customers add guests
 * beyond a package limit for a per-head fee.
 */
export default function ExtraPersonPanel() {
  const { details, errors, set, flushNow } = useDetails();

  return (
    <div className="rv-panel">
      <div className="rv-panel-h" style={{ marginBottom: 6 }}>
        Extra person pricing
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
        Customers can add guests beyond the package limit. Set max to 0 to disable.
      </div>
      <div className="rv-grid-2">
        <TextField
          label="Price per extra person (₹)"
          prefix="₹"
          inputMode="decimal"
          placeholder="e.g. 199"
          error={errors.extraPersonPrice}
          value={details.extraPersonPrice}
          onChange={(e) => set('extraPersonPrice', sanitizeAmount(e.target.value))}
          onBlur={flushNow}
        />
        <TextField
          label="Max extra persons allowed"
          inputMode="numeric"
          placeholder="e.g. 10"
          value={details.maxExtraPersons}
          onChange={(e) => set('maxExtraPersons', sanitizeDigitsMax(e.target.value, 4))}
          onBlur={flushNow}
        />
      </div>

      <div className="rv-panel-h" style={{ marginTop: 24, marginBottom: 6 }}>
        Extra hour pricing (optional)
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
        Customers can extend their booking beyond the slot. Leave blank or set max to 0 to disable.
      </div>
      <div className="rv-grid-2">
        <TextField
          label="Price per extra hour (₹)"
          prefix="₹"
          inputMode="decimal"
          placeholder="e.g. 499"
          error={errors.extraHourPrice}
          value={details.extraHourPrice}
          onChange={(e) => set('extraHourPrice', sanitizeAmount(e.target.value))}
          onBlur={flushNow}
        />
        <TextField
          label="Max extra hours allowed"
          inputMode="numeric"
          placeholder="e.g. 3"
          value={details.maxExtraHours}
          onChange={(e) => set('maxExtraHours', sanitizeDigitsMax(e.target.value, 4))}
          onBlur={flushNow}
        />
      </div>
    </div>
  );
}
