import { Button, Checkbox, Icon, TextField } from '@/reg-ui';
import { ADDONS } from '@/constants/venue';
import { sanitizeAmount } from '@/utils/validation';
import useDetails from './useDetails';

/**
 * Add-ons panel — predefined extras (water, drinks…) plus custom items.
 * The price field is enabled only when its add-on is ticked.
 */
export default function AddOnsPanel() {
  const {
    details,
    toggleInMap,
    setAddonPrice,
    addCustomAddon,
    removeCustomAddon,
    updateCustomAddon,
    flushNow,
  } = useDetails();

  return (
    <div className="rv-panel">
      <div className="rv-panel-h" style={{ marginBottom: 6 }}>
        Add-ons (optional extras)
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
        Tick the extras you offer and set a price for each. Customers pick which ones they want.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ADDONS.map((a) => {
          const checked = !!details.addons?.[a.key];
          return (
            <div className="rv-addon" data-on={checked} key={a.key}>
              <Checkbox label={a.label} checked={checked} onChange={() => toggleInMap('addons', a.key)} />
              <div style={{ width: 180, flex: '0 0 auto' }}>
                <TextField
                  prefix="₹"
                  inputMode="decimal"
                  placeholder="per unit"
                  value={details.addonPrices?.[a.key] || ''}
                  disabled={!checked}
                  onChange={(e) => setAddonPrice(a.key, sanitizeAmount(e.target.value))}
                  onBlur={flushNow}
                />
              </div>
            </div>
          );
        })}

        {details.customAddons.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 16px',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-card)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <TextField
                placeholder="Add-on name"
                value={c.name}
                onChange={(e) => updateCustomAddon(i, 'name', e.target.value)}
                onBlur={flushNow}
              />
            </div>
            <div style={{ width: 180, flex: '0 0 auto' }}>
              <TextField
                prefix="₹"
                inputMode="decimal"
                placeholder="per unit"
                value={c.price}
                onChange={(e) => updateCustomAddon(i, 'price', sanitizeAmount(e.target.value))}
                onBlur={flushNow}
              />
            </div>
            <button
              type="button"
              className="rv-trash"
              aria-label="Remove add-on"
              onClick={() => removeCustomAddon(i)}
            >
              <Icon name="trash-2" size={18} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Button variant="secondary" size="sm" onClick={addCustomAddon} iconLeft={<Icon name="plus" size={17} />}>
          Add add-on
        </Button>
      </div>
    </div>
  );
}
