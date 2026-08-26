import { Button, Checkbox, Icon, TextField } from '@/reg-ui';
import { sanitizeAmount, sanitizeDigitsMax } from '@/utils/validation';
import useDetails from './useDetails';

/**
 * Pricing packages panel (non-Playzone). Each package is an editable row;
 * customers later choose one of these when booking. REQUIRED: at least one
 * package with a name and price — the submit gate blocks without it.
 */
export default function PricingPackagesPanel() {
  const { details, addPackage, removePackage, updatePackage, flushNow } = useDetails();

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">
        Pricing packages <span style={{ color: 'var(--brand-accent)' }}>*</span>
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
        Add at least one package with a name and price (e.g. a 3-hour birthday package with
        decor). Customers can pick a package while booking; the per-unit booking price above
        still applies to plain slot bookings.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
        {details.packages.map((p, i) => (
          <div className="rv-pkg" key={i}>
            <div className="rv-pkg-grid">
              <TextField
                label="Package label"
                placeholder="Birthday Deluxe"
                value={p.label}
                onChange={(e) => updatePackage(i, 'label', e.target.value)}
                onBlur={flushNow}
              />
              <TextField
                label="Details"
                placeholder="3 hrs, cake, decor"
                value={p.details}
                onChange={(e) => updatePackage(i, 'details', e.target.value)}
                onBlur={flushNow}
              />
              <TextField
                label="Price (₹)"
                prefix="₹"
                inputMode="decimal"
                value={p.price}
                onChange={(e) => updatePackage(i, 'price', sanitizeAmount(e.target.value))}
                onBlur={flushNow}
              />
              <TextField
                label="Duration (hrs)"
                inputMode="numeric"
                placeholder="e.g. 3"
                value={p.duration}
                onChange={(e) => updatePackage(i, 'duration', sanitizeDigitsMax(e.target.value, 3))}
                onBlur={flushNow}
              />
              <TextField
                label="Max persons"
                inputMode="numeric"
                placeholder="e.g. 20"
                value={p.maxPersons}
                onChange={(e) => updatePackage(i, 'maxPersons', sanitizeDigitsMax(e.target.value, 6))}
                onBlur={flushNow}
              />
              <button
                type="button"
                className="rv-trash"
                aria-label="Remove package"
                onClick={() => removePackage(i)}
              >
                <Icon name="trash-2" size={18} />
              </button>
            </div>
            <Checkbox
              label="Charge per hour (price × hours)"
              checked={p.chargePerHour}
              onChange={(e) => updatePackage(i, 'chargePerHour', e.target.checked)}
            />
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addPackage} iconLeft={<Icon name="plus" size={17} />}>
        Add package
      </Button>
    </div>
  );
}
