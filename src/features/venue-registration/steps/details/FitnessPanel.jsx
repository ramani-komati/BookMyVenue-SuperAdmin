import { Button, Checkbox, Icon, Select, TextField } from '@/reg-ui';
import { sanitizeDigitsMax } from '@/utils/validation';
import AmenityTagInput from '../../components/AmenityTagInput';
import {
  DURATION_UNITS, EXPIRY_RULES, FITNESS_AMENITIES, PLAN_KINDS, START_RULES, blankPlan,
} from '../../offerings/model';
import { CheckGrid, ClosuresEditor, DaysPicker, FieldError, RangesEditor, RowCard, SubHead } from '../../offerings/ui';
import useOffering from '../../offerings/useOffering';

const digits = (v, n = 6) => sanitizeDigitsMax(v, n);

/** Amenity checklist + typed extras, both stored in details.amenities. */
export function AmenityChecklist({ items, amenities = [], onChange, onBlur }) {
  const known = new Set(items);
  const extras = amenities.filter((a) => !known.has(a));
  return (
    <>
      <CheckGrid items={items} value={amenities.filter((a) => known.has(a))} onChange={(picked) => onChange([...picked, ...extras])} />
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 8 }}>Anything else? Type it and press Enter.</div>
        <AmenityTagInput
          amenities={extras}
          onAdd={(val) => !amenities.includes(val) && onChange([...amenities, val])}
          onRemove={(i) => onChange(amenities.filter((a) => a !== extras[i]))}
          onBlurSave={onBlur}
        />
      </div>
    </>
  );
}

function PlanCard({ plan, o }) {
  const at = (f) => o.err(`plans.${plan.id}.${f}`);
  const up = (changes) => o.updateRow('plans', plan.id, changes);
  const kindLabel = PLAN_KINDS.find((k) => k.key === plan.kind)?.name || 'Custom plan';
  return (
    <RowCard
      title={plan.name || kindLabel}
      enabled={plan.enabled !== false}
      onToggle={(on) => up({ enabled: on })}
      onRemove={() => o.removeRow('plans', plan.id)}
      removeLabel={`Remove ${plan.name || 'plan'}`}
    >
      <div className="rv-off-grid-3">
        <TextField label="Plan name" required maxLength={120} value={plan.name} error={at('name')} onChange={(e) => up({ name: e.target.value })} onBlur={o.flushNow} />
        <TextField label="Price (₹)" required prefix="₹" inputMode="numeric" value={plan.price} error={at('price')} onChange={(e) => up({ price: digits(e.target.value, 7) })} onBlur={o.flushNow} />
        <TextField label="Joining fee (₹, optional)" prefix="₹" inputMode="numeric" hint="Charged on a member’s first plan only" value={plan.joiningFee} error={at('joiningFee')} onChange={(e) => up({ joiningFee: digits(e.target.value, 7) })} onBlur={o.flushNow} />
        <TextField label="Duration" required inputMode="numeric" value={plan.durationValue} error={at('durationValue')} onChange={(e) => up({ durationValue: digits(e.target.value, 4) })} onBlur={o.flushNow} />
        <Select label="Duration unit" options={DURATION_UNITS} value={plan.durationUnit} onChange={(e) => up({ durationUnit: e.target.value })} onBlur={o.flushNow} />
        <TextField
          label="Permitted visits / classes"
          inputMode="numeric"
          placeholder="Unlimited"
          hint="Leave empty for unlimited"
          value={plan.visits}
          error={at('visits')}
          onChange={(e) => up({ visits: digits(e.target.value, 5) })}
          onBlur={o.flushNow}
        />
        <Select label="Membership start rule" options={START_RULES} value={plan.startRule} onChange={(e) => up({ startRule: e.target.value })} onBlur={o.flushNow} />
        {plan.startRule === 'chosen' ? (
          <TextField label="Must start within (days)" inputMode="numeric" value={plan.startWithinDays} error={at('startWithinDays')} onChange={(e) => up({ startWithinDays: digits(e.target.value, 2) })} onBlur={o.flushNow} />
        ) : <span />}
        <Select label="Membership expiry rule" options={EXPIRY_RULES} value={plan.expiryRule} onChange={(e) => up({ expiryRule: e.target.value })} onBlur={o.flushNow} />
      </div>
      <TextField label="Description (optional)" maxLength={500} placeholder="e.g. Includes a diet consultation" value={plan.description} onChange={(e) => up({ description: e.target.value })} onBlur={o.flushNow} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-end' }}>
        <Checkbox label="Trial session available" checked={Boolean(plan.trialAvailable)} onChange={(e) => up({ trialAvailable: e.target.checked })} />
        {plan.trialAvailable && (
          <div style={{ maxWidth: 220 }}>
            <TextField label="Trial price (₹, 0 = free)" prefix="₹" inputMode="numeric" value={plan.trialPrice} error={at('trialPrice')} onChange={(e) => up({ trialPrice: digits(e.target.value, 6) })} onBlur={o.flushNow} />
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 10 }}>Included facilities</div>
        <CheckGrid items={FITNESS_AMENITIES} value={plan.facilities || []} onChange={(list) => up({ facilities: list })} />
      </div>
    </RowCard>
  );
}

/**
 * Fitness (Gym and Fitness) — services, amenities, operating days and
 * capacity, and the membership plans (mandatory). Opening / closing time is
 * the Venue Timings panel above; photos are the Photos step.
 */
export default function FitnessPanel() {
  const o = useOffering('fitness');
  const b = o.block;
  const plans = b.plans || [];
  const unused = PLAN_KINDS.filter((k) => !plans.some((p) => p.kind === k.key));

  return (
    <>
      {/* The services themselves are picked in the Category panel above
          (details.subCategories — what the Fitness filters read). */}
      <div className="rv-panel">
        <div className="rv-panel-h">Facilities</div>
        <AmenityChecklist items={FITNESS_AMENITIES} amenities={o.details.amenities || []} onChange={o.setAmenities} onBlur={o.flushNow} />
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Operating days &amp; capacity</div>
        <SubHead>Days of operation</SubHead>
        <DaysPicker value={b.operatingDays} onChange={(v) => o.set('operatingDays', v)} label="Days of operation" />
        <div className="rv-off-grid-2" style={{ marginTop: 18 }}>
          <TextField label="Maximum members allowed at one time" inputMode="numeric" value={b.maxMembersAtOnce} error={o.err('maxMembersAtOnce')} onChange={(e) => o.set('maxMembersAtOnce', digits(e.target.value))} onBlur={o.flushNow} />
          <TextField label="Maximum capacity per group class" inputMode="numeric" value={b.maxClassCapacity} error={o.err('maxClassCapacity')} onChange={(e) => o.set('maxClassCapacity', digits(e.target.value))} onBlur={o.flushNow} />
        </div>

        <SubHead note="Separate timings for Yoga, Zumba and other classes.">Class timings</SubHead>
        <div className="rv-off-list">
          {(b.classTimings || []).map((c, i) => (
            <div key={i} className="rv-subbox">
              <div className="rv-off-row rv-off-row--4">
                <TextField label="Class" maxLength={60} placeholder="e.g. Morning Yoga" value={c.name || ''} onChange={(e) => o.set('classTimings', b.classTimings.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} onBlur={o.flushNow} />
                <TextField label="Starts" type="time" step={300} value={c.start || ''} onChange={(e) => o.set('classTimings', b.classTimings.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} onBlur={o.flushNow} />
                <TextField label="Ends" type="time" step={300} value={c.end || ''} onChange={(e) => o.set('classTimings', b.classTimings.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} onBlur={o.flushNow} />
                <button type="button" className="rv-trash" aria-label="Remove class" onClick={() => o.set('classTimings', b.classTimings.filter((_, j) => j !== i))}>
                  <Icon name="trash-2" size={18} />
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <DaysPicker value={c.days || []} onChange={(v) => o.set('classTimings', b.classTimings.map((x, j) => (j === i ? { ...x, days: v } : x)))} label={`${c.name || 'Class'} days`} />
              </div>
              <FieldError>{o.err(`classTimings.${i}`)}</FieldError>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.set('classTimings', [...(b.classTimings || []), { name: '', days: [], start: '', end: '' }])}>
          Add class timing
        </Button>

        <SubHead>Peak-hour timings</SubHead>
        <RangesEditor value={b.peakHours || []} onChange={(v) => o.set('peakHours', v)} onBlur={o.flushNow} addLabel="Add peak hours" error={o.err('peakHours')} />

        <SubHead note="The gym is shown as closed on these dates.">Holiday / temporary closures</SubHead>
        <ClosuresEditor value={b.closures || []} onChange={(v) => o.set('closures', v)} onBlur={o.flushNow} error={o.err('closures')} />
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">
          Memberships &amp; pricing <span style={{ color: 'var(--brand-accent)' }}>*</span>
        </div>
        <div className="rv-off-note">
          Customers buy these plans online. Turn a plan off to stop selling it — members who already bought it keep it.
        </div>
        <div className="rv-off-list">
          {plans.map((p) => <PlanCard key={p.id} plan={p} o={o} />)}
        </div>
        <FieldError>{o.err('plans')}</FieldError>
        <div className="rv-off-actions" style={{ marginTop: 10 }}>
          {unused.map((k) => (
            <Button key={k.key} variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.addRow('plans', blankPlan(k.key))}>
              {k.name}
            </Button>
          ))}
          <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.addRow('plans', blankPlan('custom'))}>
            Custom plan
          </Button>
        </div>
      </div>
    </>
  );
}
