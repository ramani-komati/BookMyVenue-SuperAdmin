import { Button, Icon, Select, Switch, TextField } from '@/reg-ui';
import { sanitizeDigitsMax } from '@/utils/validation';
import PhotoUploader from '../../components/PhotoUploader';
import { CINEMA_BRANDS, SCREEN_FORMATS, SURPRISE_GALLERIES, THEATRE_TYPES, blankShow } from '../../offerings/model';
import { CheckGrid, ClosuresEditor, DaysPicker, FieldError, RowCard, SubHead } from '../../offerings/ui';
import useOffering from '../../offerings/useOffering';

const digits = (v, n = 6) => sanitizeDigitsMax(v, n);

function ShowCard({ show, o, screens }) {
  const at = (f) => o.err(`shows.${show.id}.${f}`);
  const up = (changes) => o.updateRow('shows', show.id, changes);
  const times = show.times?.length ? show.times : [''];
  return (
    <RowCard
      title={show.movie || 'New show'}
      enabled={show.enabled !== false}
      onToggle={(on) => up({ enabled: on })}
      onRemove={() => o.removeRow('shows', show.id)}
      removeLabel={`Remove ${show.movie || 'show'}`}
    >
      <div className="rv-off-grid-3">
        <TextField label="Movie" required maxLength={150} value={show.movie} error={at('movie')} onChange={(e) => up({ movie: e.target.value })} onBlur={o.flushNow} />
        <TextField label="Language (optional)" maxLength={40} value={show.language} onChange={(e) => up({ language: e.target.value })} onBlur={o.flushNow} />
        <Select
          label="Screen"
          options={Array.from({ length: screens }, (_, i) => ({ value: String(i + 1), label: `Screen ${i + 1}` }))}
          value={String(show.screen || '1')}
          error={at('screen')}
          onChange={(e) => up({ screen: e.target.value })}
          onBlur={o.flushNow}
        />
        <TextField label="Showing from (optional)" type="date" value={show.availableFrom} onChange={(e) => up({ availableFrom: e.target.value })} onBlur={o.flushNow} />
        <TextField label="Showing until (optional)" type="date" min={show.availableFrom || undefined} value={show.availableTo} error={at('availableTo')} onChange={(e) => up({ availableTo: e.target.value })} onBlur={o.flushNow} />
      </div>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 10 }}>Show timings</div>
        <div className="rv-off-actions" style={{ alignItems: 'flex-end' }}>
          {times.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 6 }}>
              <TextField aria-label={`Show time ${i + 1}`} type="time" step={300} value={t} onChange={(e) => up({ times: times.map((x, j) => (j === i ? e.target.value : x)) })} onBlur={o.flushNow} />
              {times.length > 1 && (
                <button type="button" className="rv-trash" aria-label="Remove show time" onClick={() => up({ times: times.filter((_, j) => j !== i) })}>
                  <Icon name="x" size={16} />
                </button>
              )}
            </span>
          ))}
          <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => up({ times: [...times, ''] })}>
            Add time
          </Button>
        </div>
        <FieldError>{at('times')}</FieldError>
      </div>
    </RowCard>
  );
}

/**
 * Big Screen Surprise (Celebrate) — cinema details, media & branding, the
 * surprise settings and the shows customers can book a surprise into. The
 * theatre exterior is the Photos step; the address is the Location step;
 * occasions are picked in the Category panel above.
 */
export default function SurprisePanel() {
  const o = useOffering('surprise');
  const b = o.block;
  const manager = b.manager || {};
  const screens = Math.max(1, Math.min(50, parseInt(b.screens || '1', 10) || 1));
  const occasions = Object.keys(o.details.subCategories || {}).filter((k) => o.details.subCategories[k]);

  return (
    <>
      <div className="rv-panel">
        <div className="rv-panel-h">Cinema details</div>
        <div className="rv-off-grid-3">
          <Select label="Cinema brand" placeholder="Select" options={CINEMA_BRANDS} value={b.brand} onChange={(e) => o.set('brand', e.target.value)} onBlur={o.flushNow} />
          {b.brand === 'Other' && (
            <TextField label="Brand name" maxLength={60} value={b.brandOther} onChange={(e) => o.set('brandOther', e.target.value)} onBlur={o.flushNow} />
          )}
          <Select label="Theatre type" placeholder="Select" options={THEATRE_TYPES} value={b.theatreType} onChange={(e) => o.set('theatreType', e.target.value)} onBlur={o.flushNow} />
          <TextField label="Screens available for this service" required inputMode="numeric" value={b.screens} error={o.err('screens')} onChange={(e) => o.set('screens', digits(e.target.value, 2))} onBlur={o.flushNow} />
        </div>
        <SubHead>Screen format</SubHead>
        <CheckGrid items={SCREEN_FORMATS} value={b.formats || []} onChange={(v) => o.set('formats', v)} />
        {(b.formats || []).includes('Other') && (
          <div style={{ marginTop: 12, maxWidth: 320 }}>
            <TextField label="Other format" maxLength={40} value={b.formatOther} onChange={(e) => o.set('formatOther', e.target.value)} onBlur={o.flushNow} />
          </div>
        )}
        <SubHead note="For our team only — never shown to customers.">Theatre manager / authorised representative</SubHead>
        <div className="rv-off-grid-3">
          <TextField label="Name" maxLength={100} value={manager.name || ''} onChange={(e) => o.setIn('manager', 'name', e.target.value)} onBlur={o.flushNow} />
          <TextField label="Official contact number" prefix="+91" inputMode="numeric" value={manager.phone || ''} error={o.err('manager.phone')} onChange={(e) => o.setIn('manager', 'phone', digits(e.target.value, 10))} onBlur={o.flushNow} />
          <TextField label="Official email" type="email" maxLength={120} value={manager.email || ''} error={o.err('manager.email')} onChange={(e) => o.setIn('manager', 'email', e.target.value.trim())} onBlur={o.flushNow} />
        </div>
        {o.payoutEditable && (
          <div className="rv-off-grid-2" style={{ marginTop: 14 }}>
            <TextField label="Business name" maxLength={150} value={o.payout.businessName || ''} onChange={(e) => o.setPayout('businessName', e.target.value)} onBlur={o.flushNow} />
            <TextField label="GSTIN (if applicable)" maxLength={15} placeholder="36ABCDE1234F1Z5" value={o.payout.gstin || ''} onChange={(e) => o.setPayout('gstin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onBlur={o.flushNow} />
          </div>
        )}
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Media &amp; branding</div>
        <div className="rv-off-note">The theatre exterior photos are the Photos step. Add the auditorium, the screen and your logo here.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {SURPRISE_GALLERIES.map((g) => {
            const list = o.photos[g.key] || [];
            return (
              <PhotoUploader
                key={g.key}
                title={`${g.label} (optional)`}
                spec="serviceImage"
                photos={list}
                max={g.max}
                onAdd={(files) => o.addPhotos(g.key, files)}
                onRemove={(id) => o.removePhoto(g.key, id)}
                countLabel={`${list.length} / ${g.max} uploaded`}
              />
            );
          })}
          <TextField label="Short description of the experience" multiline rows={3} maxLength={500} placeholder="e.g. Your message on our 70 ft screen right before the movie starts." value={b.experience} onChange={(e) => o.set('experience', e.target.value)} onBlur={o.flushNow} />
        </div>
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">Surprise settings</div>
        <div className="rv-off-grid-3">
          <TextField label="Price per surprise (₹)" required prefix="₹" inputMode="numeric" value={b.price} error={o.err('price')} onChange={(e) => o.set('price', digits(e.target.value, 7))} onBlur={o.flushNow} />
          <TextField label="Maximum bookings per show" inputMode="numeric" hint="Surprises one show can play" value={b.maxBookingsPerShow} error={o.err('maxBookingsPerShow')} onChange={(e) => o.set('maxBookingsPerShow', digits(e.target.value, 2))} onBlur={o.flushNow} />
          <TextField label="Surprise shows per day (optional)" inputMode="numeric" hint="Across all screens; empty = no limit" value={b.showsPerDay} error={o.err('showsPerDay')} onChange={(e) => o.set('showsPerDay', digits(e.target.value, 4))} onBlur={o.flushNow} />
          <TextField label="Book at least (hours before the show)" inputMode="numeric" value={b.minLeadHours} error={o.err('minLeadHours')} onChange={(e) => o.set('minLeadHours', digits(e.target.value, 3))} onBlur={o.flushNow} />
          <TextField label="Available from (optional)" type="date" value={b.availableFrom} onChange={(e) => o.set('availableFrom', e.target.value)} onBlur={o.flushNow} />
          <TextField label="Available until (optional)" type="date" min={b.availableFrom || undefined} value={b.availableTo} error={o.err('availableTo')} onChange={(e) => o.set('availableTo', e.target.value)} onBlur={o.flushNow} />
        </div>
        {occasions.length > 0 && (
          <>
            <SubHead note="Optional — a different price for some occasions. Empty uses the price above.">Custom pricing</SubHead>
            <div className="rv-off-grid-3">
              {occasions.map((occ) => (
                <TextField
                  key={occ}
                  label={`${occ} (₹)`}
                  prefix="₹"
                  inputMode="numeric"
                  value={b.occasionPrices?.[occ] || ''}
                  error={o.err(`occasionPrices.${occ}`)}
                  onChange={(e) => o.setIn('occasionPrices', occ, digits(e.target.value, 7))}
                  onBlur={o.flushNow}
                />
              ))}
            </div>
          </>
        )}
        <SubHead>Available days</SubHead>
        <DaysPicker value={b.availableDays} onChange={(v) => o.set('availableDays', v)} label="Available days" />
        <SubHead>Unavailable dates</SubHead>
        <ClosuresEditor value={b.closures || []} onChange={(v) => o.set('closures', v)} onBlur={o.flushNow} error={o.err('closures')} addLabel="Add unavailable dates" />
        <SubHead>What customers can send</SubHead>
        <div className="rv-grid-2">
          <div className="rv-toggle">
            <span>Allow photo upload</span>
            <Switch checked={Boolean(b.allowPhoto)} onChange={(e) => o.set('allowPhoto', e.target.checked)} />
          </div>
          <div className="rv-toggle">
            <span>Allow video upload</span>
            <Switch checked={Boolean(b.allowVideo)} onChange={(e) => o.set('allowVideo', e.target.checked)} />
          </div>
        </div>
      </div>

      <div className="rv-panel">
        <div className="rv-panel-h">
          Shows &amp; timings <span style={{ color: 'var(--brand-accent)' }}>*</span>
        </div>
        <div className="rv-off-note">
          The movies customers can book a surprise into. One screen plays one show at a time, so a screen and time can
          only be sold up to “Maximum bookings per show”.
        </div>
        <div className="rv-off-list">
          {(b.shows || []).map((s) => <ShowCard key={s.id} show={s} o={o} screens={screens} />)}
        </div>
        <FieldError>{o.err('shows')}</FieldError>
        <Button variant="secondary" size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => o.addRow('shows', blankShow())}>
          Add show
        </Button>
      </div>
    </>
  );
}
