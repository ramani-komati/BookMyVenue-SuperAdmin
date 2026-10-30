import { Button, Checkbox, Icon, TextField } from '@/reg-ui';
import { WEEKDAYS } from './model';
import './offerings-form.css';

/**
 * Small building blocks shared by the Fitness, Resort and Big Screen
 * Surprise panels. The super admin app carries the same file with its own
 * UI-kit import (@/reg-ui) — otherwise identical.
 */

export function SubHead({ children, note }) {
  return (
    <>
      <div className="rv-off-sub">{children}</div>
      {note && <div className="rv-off-note">{note}</div>}
    </>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return (
    <div className="rv-off-error" role="alert">
      {children}
    </div>
  );
}

/** Multi-select checkbox grid over `items`; `value` is the list picked. */
export function CheckGrid({ items, value = [], onChange }) {
  const on = new Set(value);
  const toggle = (item) => onChange(on.has(item) ? value.filter((v) => v !== item) : [...value, item]);
  return (
    <div className="rv-checkgrid">
      {items.map((item) => (
        <div key={item} className="rv-amenity" data-on={on.has(item)}>
          <Checkbox label={item} checked={on.has(item)} onChange={() => toggle(item)} />
        </div>
      ))}
    </div>
  );
}

/** The same grid over a { name: true } map (the draft's subCategories). */
export function CheckMap({ items, value = {}, onToggle }) {
  return (
    <div className="rv-checkgrid">
      {items.map((item) => (
        <div key={item} className="rv-amenity" data-on={Boolean(value[item])}>
          <Checkbox label={item} checked={Boolean(value[item])} onChange={() => onToggle(item)} />
        </div>
      ))}
    </div>
  );
}

export function DaysPicker({ value = [], onChange, label = 'Days' }) {
  const on = new Set(value);
  return (
    <div className="rv-off-days" role="group" aria-label={label}>
      {WEEKDAYS.map((d) => (
        <button
          key={d.key}
          type="button"
          className="rv-off-day"
          aria-pressed={on.has(d.key)}
          onClick={() => onChange(WEEKDAYS.map((w) => w.key).filter((k) => (k === d.key ? !on.has(k) : on.has(k))))}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

/** Editable list of same-day time ranges ({start, end}). */
export function RangesEditor({ value = [], onChange, onBlur, addLabel = 'Add time slot', error }) {
  const update = (i, key, v) => onChange(value.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  return (
    <div>
      <div className="rv-off-list" style={{ marginBottom: 10 }}>
        {value.map((r, i) => (
          <div className="rv-off-row" key={i}>
            <TextField label="From" type="time" step={300} value={r.start || ''} onChange={(e) => update(i, 'start', e.target.value)} onBlur={onBlur} />
            <TextField label="To" type="time" step={300} value={r.end || ''} onChange={(e) => update(i, 'end', e.target.value)} onBlur={onBlur} />
            <button type="button" className="rv-trash" aria-label="Remove time slot" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="trash-2" size={18} />
            </button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={() => onChange([...value, { start: '', end: '' }])} iconLeft={<Icon name="plus" size={16} />}>
        {addLabel}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Holiday / temporary closures: [{from, to, reason}]. */
export function ClosuresEditor({ value = [], onChange, onBlur, error, addLabel = 'Add closure' }) {
  const update = (i, key, v) => onChange(value.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  return (
    <div>
      <div className="rv-off-list" style={{ marginBottom: 10 }}>
        {value.map((c, i) => (
          <div className="rv-off-row rv-off-row--4" key={i}>
            <TextField label="From" type="date" value={c.from || ''} onChange={(e) => update(i, 'from', e.target.value)} onBlur={onBlur} />
            <TextField label="To" type="date" value={c.to || ''} min={c.from || undefined} onChange={(e) => update(i, 'to', e.target.value)} onBlur={onBlur} />
            <TextField label="Reason (optional)" maxLength={120} placeholder="e.g. Diwali holiday" value={c.reason || ''} onChange={(e) => update(i, 'reason', e.target.value)} onBlur={onBlur} />
            <button type="button" className="rv-trash" aria-label="Remove closure" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="trash-2" size={18} />
            </button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={() => onChange([...value, { from: '', to: '', reason: '' }])} iconLeft={<Icon name="plus" size={16} />}>
        {addLabel}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** A removable, switchable card around one plan / package / show. */
export function RowCard({ title, enabled = true, onToggle, onRemove, removeLabel, children }) {
  return (
    <div className="rv-off-card" data-off={!enabled}>
      <div className="rv-off-cardhead">
        <span className="rv-off-cardtitle">{title}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          {onToggle && <Checkbox label={enabled ? 'Enabled' : 'Disabled'} checked={enabled} onChange={(e) => onToggle(e.target.checked)} />}
          {onRemove && (
            <button type="button" className="rv-trash" aria-label={removeLabel} onClick={onRemove}>
              <Icon name="trash-2" size={18} />
            </button>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}
