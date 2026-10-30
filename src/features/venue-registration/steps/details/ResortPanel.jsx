import { Button, Icon, Select, Switch, TextField } from '@/reg-ui';
import { sanitizeDigitsMax } from '@/utils/validation';
import { PACKAGE_PRICING, RESORT_FACILITIES, RESORT_INCLUSIONS, RESORT_TYPES, blankPackage } from '../../offerings/model';
import { CheckGrid, ClosuresEditor, DaysPicker, FieldError, RangesEditor, RowCard, SubHead } from '../../offerings/ui';
import useOffering from '../../offerings/useOffering';

const digits = (v, n = 6) => sanitizeDigitsMax(v, n);
const DURATIONS = [{ value: 'half_day', label: 'Half Day' }, { value: 'full_day', label: 'Full Day' }];

function priceLabel(p) {
  if (p.pricing === 'per_package') return 'Package price (₹)';
  if (p.pricing === 'per_hour') return 'Adult price per hour (₹)';
  return 'Adult price per person (₹)';
}

function PackageCard({ pkg, o }) {
  const at = (f) => o.err(`packages.${pkg.id}.${f}`);
  const up = (changes) => o.updateRow('packages', pkg.id, changes);
  const pricing = PACKAGE_PRICING[pkg.kind] || PACKAGE_PRICING.day;
  const usesSlots = pkg.kind === 'pool' || pkg.duration === 'half_day';
  return (
    <RowCard
      title={`${pkg.name || 'New package'} · ${pkg.kind === 'pool' ? 'Swimming pool / water park' : pkg.duration === 'half_day' ? 'Half day' : 'Full day'}`}
      enabled={pkg.enabled !== false}
      onToggle={(on) => up({ enabled: on })}
      onRemove={() => o.removeRow('packages', pkg.id)}
      removeLabel={`Remove ${pkg.name || 'package'}`}
    >
      <div className="rv-off-grid-3">
        <TextField label="Package name" required maxLength={120} placeholder={pkg.kind === 'pool' ? 'e.g. Swimming Pool Entry' : 'e.g. Family Day Out'} value={pkg.name} error={at('name')} onChange={(e) => up({ name: e.target.value })} onBlur={o.flushNow} />
        {pkg.kind === 'day' && (
          <Select
            label="Duration"
            options={DURATIONS}
            value={pkg.duration || 'full_day'}
            onChange={(e) => up({ duration: e.target.value, slots: e.target.value === 'half_day' && !(pkg.slots || []).length ? [{ start: '09:00', end: '13:00' }] : pkg.slots })}
            onBlur={o.flushNow}
          />
        )}
        <Select
          label="Pricing"
          options={pricing}
          value={pricing.some((x) => x.value === pkg.pricing) ? pkg.pricing : pricing[0].value}
          onChange={(e) => up({ pricing: e.target.value })}
          onBlur={o.flushNow}
        />
        <TextField label={priceLabel(pkg)} required prefix="₹" inputMode="numeric" value={pkg.price} error={at('price')} onChange={(e) => up({ price: digits(e.target.value, 7) })} onBlur={o.flushNow} />
        {pkg.pricing !== 'per_package' && (
          <TextField label={`Child price${pkg.pricing === 'per_hour' ? ' per hour' : ''} (₹, optional)`} prefix="₹" inputMode="numeric" hint="Empty = same as adult" value={pkg.childPrice} error={at('childPrice')} onChange={(e) => up({ childPrice: digits(e.target.value, 7) })} onBlur={o.flushNow} />
        )}
        <TextField label="Minimum persons" inputMode="numeric" value={pkg.minPersons} error={at('minPersons')} onChange={(e) => up({ minPersons: digits(e.target.value, 4) })} onBlur={o.flushNow} />
        <TextField label="Maximum persons" required inputMode="numeric" value={pkg.maxPersons} error={at('maxPersons')} onChange={(e) => up({ maxPersons: digits(e.target.value, 4) })} onBlur={o.flushNow} />
        <TextField label="Guests per slot, all bookings (optional)" inputMode="numeric" hint="Stops overbooking — empty = no limit" value={pkg.capacity} error={at('capacity')} onChange={(e) => up({ capacity: digits(e.target.value, 6) })} onBlur={o.flushNow} />
        <TextField label="Available from (optional)" type="date" value={pkg.availableFrom} onChange={(e) => up({ availableFrom: e.target.value })} onBlur={o.flushNow} />
        <TextField label="Available until (optional)" type="date" min={pkg.availableFrom || undefined} value={pkg.availableTo} error={at('availableTo')} onChange={(e) => up({ availableTo: e.target.value })} onBlur={o.flushNow} />
      </div>

      {usesSlots ? (
        <div>
          <SubHead note={pkg.kind === 'pool' ? 'Customers pick one of these.' : 'Half-day slots customers can pick from.'}>
            {pkg.kind === 'pool' ? 'Operating time slots' : 'Half-day time slots'}
          </SubHead>
          <RangesEditor value={pkg.slots || []} onChange={(v) => up({ slots: v })} onBlur={o.flushNow} error={at('slots')} />
        </div>
      ) : (
        <div className="rv-off-grid-2">
          <TextField label="Check-in" type="time" step={300} hint={o.block.checkIn ? `Empty = resort check-in (${o.block.checkIn})` : undefined} value={pkg.checkIn} error={at('checkIn')} onChange={(e) => up({ checkIn: e.target.value })} onBlur={o.flushNow} />
          <TextField label="Check-out" type="time" step={300} hint={o.block.checkOut ? `Empty = resort check-out (${o.block.checkOut})` : undefined} value={pkg.checkOut} onChange={(e) => up({ checkOut: e.target.value })} onBlur={o.flushNow} />
        </div>
      )}

      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 10 }}>What’s included?</div>
        <CheckGrid items={RESORT_INCLUSIONS} value={pkg.inclusions || []} onChange={(list) => up({ inclusions: list })} />
        <div style={{ marginTop: 12, maxWidth: 420 }}>
          <TextField label="Other (optional)" maxLength={120} placeholder="e.g. Welcome drink" value={pkg.otherInclusion} onChange={(e) => up({ otherInclusion: e.target.value })} onBlur={o.flushNow} />
        </div>
      </div>
      <TextField label="Description (optional)" maxLength={500} value={pkg.description} onChange={(e) => up({ description: e.target.value })} onBlur={o.flushNow} />
    </RowCard>
  );
}

/**
 * Resort — resort details, owner, facilities, accommodation, availability,
 * business documents and the bookable packages (as many as the resort
 * wants). Opening / closing time is the Venue Timings panel; photos are
 * the Photos step; bank details are the last step.
 */
export default function ResortPanel() {
  const o = useOffering('resort');
  const b = o.block;
  const owner = b.owner || {};
  const acc = b.accommodation || {};
  const facilities = b.facilities || {};

  return (
    <>
      <div className="rv-panel">
        <div className="rv-panel-h">Resort details</div>
        <SubHead note="Pick every type that fits.">Resort type</SubHead>
        <CheckGrid items={RESORT_TYPES} value={b.types || []} onChange={(v) => o.set('types', v)} />
        <div className="rv-off-grid-2" style={{ marginTop: 16 }}>
          {(b.types || []).includes('Other') && (
            <TextField label="Other resort type" maxLength={60} value={b.otherType} onChange={(e) => o.set('otherType', e.target.value)} onBlur={o.flushNow} />
          )}
          <TextField label="Year established" inputMode="numeric" placeholder="e.g. 2015" value={b.yearEstablished} error={o.err('yearEstablished')} onChange={(e) => o.set('yearEstablished', digits(e.target.value, 4))} onBlur={o.flushNow} />
        </div>
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Owner details</div>
        <div className="rv-off-note">For our team only — never shown to customers.</div>
        <div className="rv-off-grid-3">
          <TextField label="Owner name" maxLength={100} value={owner.name || ''} onChange={(e) => o.setIn('owner', 'name', e.target.value)} onBlur={o.flushNow} />
          <TextField label="Contact person" maxLength={100} value={owner.contactPerson || ''} onChange={(e) => o.setIn('owner', 'contactPerson', e.target.value)} onBlur={o.flushNow} />
          <TextField label="Mobile number" prefix="+91" inputMode="numeric" value={owner.mobile || ''} error={o.err('owner.mobile')} onChange={(e) => o.setIn('owner', 'mobile', digits(e.target.value, 10))} onBlur={o.flushNow} />
          <TextField label="WhatsApp number" prefix="+91" inputMode="numeric" value={owner.whatsapp || ''} error={o.err('owner.whatsapp')} onChange={(e) => o.setIn('owner', 'whatsapp', digits(e.target.value, 10))} onBlur={o.flushNow} />
          <TextField label="Email address" type="email" maxLength={120} value={owner.email || ''} error={o.err('owner.email')} onChange={(e) => o.setIn('owner', 'email', e.target.value.trim())} onBlur={o.flushNow} />
          <TextField label="Alternate number" prefix="+91" inputMode="numeric" value={owner.alternate || ''} error={o.err('owner.alternate')} onChange={(e) => o.setIn('owner', 'alternate', digits(e.target.value, 10))} onBlur={o.flushNow} />
        </div>
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Facilities &amp; amenities</div>
        {RESORT_FACILITIES.map((g) => (
          <div key={g.key}>
            <SubHead>{g.label}</SubHead>
            <CheckGrid items={g.items} value={facilities[g.key] || []} onChange={(v) => o.setIn('facilities', g.key, v)} />
          </div>
        ))}
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Accommodation</div>
        <Switch label="The resort provides accommodation" checked={Boolean(acc.available)} onChange={(e) => o.setIn('accommodation', 'available', e.target.checked)} />
        {acc.available && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ maxWidth: 320 }}>
              <TextField label="Maximum overnight capacity (persons)" inputMode="numeric" value={acc.maxOvernight || ''} error={o.err('maxOvernight')} onChange={(e) => o.setIn('accommodation', 'maxOvernight', digits(e.target.value))} onBlur={o.flushNow} />
            </div>
            <SubHead note="Shown on your resort page. Overnight stays are arranged with you directly.">Rooms</SubHead>
            <div className="rv-off-list">
              {(acc.rooms || []).map((r, i) => {
                const setRoom = (key, v) => o.setIn('accommodation', 'rooms', acc.rooms.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
                return (
                  <div key={i} className="rv-pkg">
                    <div className="rv-pkg-grid">
                      <TextField label="Room type" maxLength={60} placeholder="e.g. AC Cottage" value={r.type || ''} onChange={(e) => setRoom('type', e.target.value)} onBlur={o.flushNow} />
                      <TextField label="Rooms" inputMode="numeric" value={r.count || ''} onChange={(e) => setRoom('count', digits(e.target.value, 4))} onBlur={o.flushNow} />
                      <TextField label="Guests per room" inputMode="numeric" value={r.maxGuests || ''} onChange={(e) => setRoom('maxGuests', digits(e.target.value, 2))} onBlur={o.flushNow} />
                      <TextField label="Price per night (₹)" prefix="₹" inputMode="numeric" value={r.pricePerNight || ''} onChange={(e) => setRoom('pricePerNight', digits(e.target.value, 7))} onBlur={o.flushNow} />
                      <span />
                      <button type="button" className="rv-trash" aria-label="Remove room type" onClick={() => o.setIn('accommodation', 'rooms', acc.rooms.filter((_, j) => j !== i))}>
                        <Icon name="trash-2" size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.setIn('accommodation', 'rooms', [...(acc.rooms || []), { type: '', count: '', maxGuests: '', pricePerNight: '' }])}>
                Add room type
              </Button>
            </div>
            <TextField label="Accommodation details (optional)" multiline rows={3} maxLength={500} value={acc.details || ''} onChange={(e) => o.setIn('accommodation', 'details', e.target.value)} onBlur={o.flushNow} />
          </div>
        )}
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Availability</div>
        <div className="rv-off-note">Opening and closing time are under Venue Timings above.</div>
        <div className="rv-off-grid-2">
          <TextField label="Check-in time" type="time" step={300} value={b.checkIn} onChange={(e) => o.set('checkIn', e.target.value)} onBlur={o.flushNow} />
          <TextField label="Check-out time" type="time" step={300} value={b.checkOut} error={o.err('checkOut')} onChange={(e) => o.set('checkOut', e.target.value)} onBlur={o.flushNow} />
        </div>
        <SubHead>Available days</SubHead>
        <DaysPicker value={b.availableDays} onChange={(v) => o.set('availableDays', v)} label="Available days" />
        <SubHead note="Packages can’t be booked on these dates.">Temporary closures &amp; unavailable dates</SubHead>
        <ClosuresEditor value={b.closures || []} onChange={(v) => o.set('closures', v)} onBlur={o.flushNow} error={o.err('closures')} addLabel="Add unavailable dates" />
      </div>

      {o.payoutEditable && (
        <div className="rv-panel">
          <div className="rv-panel-h">Business documents</div>
          <div className="rv-off-note">Optional. Kept private with your bank details.</div>
          <div className="rv-off-grid-3">
            <TextField label="Business / trade name" maxLength={150} value={o.payout.businessName || ''} onChange={(e) => o.setPayout('businessName', e.target.value)} onBlur={o.flushNow} />
            <TextField label="PAN" maxLength={10} placeholder="ABCDE1234F" value={o.payout.pan || ''} onChange={(e) => o.setPayout('pan', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onBlur={o.flushNow} />
            <TextField label="GSTIN (if applicable)" maxLength={15} placeholder="36ABCDE1234F1Z5" value={o.payout.gstin || ''} onChange={(e) => o.setPayout('gstin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onBlur={o.flushNow} />
          </div>
        </div>
      )}

      <div className="rv-panel">
        <div className="rv-panel-h">
          Resort packages &amp; booking <span style={{ color: 'var(--brand-accent)' }}>*</span>
        </div>
        <div className="rv-off-note">
          Add as many packages as you sell — a family day out, a bachelor’s party, pool entry… Customers pick a
          package, date, time and number of guests and pay online.
        </div>
        <div className="rv-off-list">
          {(b.packages || []).map((p) => <PackageCard key={p.id} pkg={p} o={o} />)}
        </div>
        <FieldError>{o.err('packages')}</FieldError>
        <div className="rv-off-actions" style={{ marginTop: 10 }}>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.addRow('packages', blankPackage('day'))}>
            Add day package
          </Button>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.addRow('packages', blankPackage('pool'))}>
            Add swimming pool / water park
          </Button>
        </div>
      </div>
    </>
  );
}
