import { useEffect, useRef, useState } from 'react';
import { Button, Icon, TextField } from '@/reg-ui';
import { sanitizeDigitsMax, validateMapsLink } from '@/utils/validation';
import { exactPinCoords, isShortMapsLink, mapEmbedSrc } from '@/utils/maps';
import { catalogApi } from '@/services/catalogApi';
import { COUNTRY, STATE_NAMES, canonicalState, districtsOf, findDistrict } from '@/utils/indiaRegions';
import { useVenueDraftContext } from '../context/VenueDraftContext';
import { SectionSelect, SectionTextField } from '../components/SectionFields';
import { districtCentre, endSuggestSession, geocodeAddress, suggestPlaces } from './addressLookup';

const SUGGEST_DELAY_MS = 300;

const noteStyle = {
  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
  borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-heading)',
};
const headingStyle = { fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-heading)' };

/** A saved value that isn't in the list stays visible (and flagged) instead of vanishing. */
const withSaved = (options, value, what) => (value && !options.includes(value)
  ? [{ value, label: `${value} — not a recognised ${what}, choose from the list` }, ...options]
  : options);

/**
 * Live preview of the map customers will see (same embed builder as the venue
 * page). Rendered once the pasted link is a valid maps URL. A short share
 * link is auto-resolved to the full URL (which carries the vendor's exact
 * pin) and stored in its place; while that isn't possible (resolver not live,
 * offline), the vendor is told the pin is approximate and how to paste a link
 * that is exact — so a wrong pin is fixed HERE, not discovered by customers.
 */
function MapPreview() {
  const { draft, setField } = useVenueDraftContext();
  const { mapsLink = '', houseStreet, area, city, district, stateName, pincode } = draft.location || {};
  const exact = Boolean(exactPinCoords(mapsLink));

  // Swap a pasted short link for the full URL it redirects to — the stored
  // link then carries the exact pin permanently. One attempt per link; on
  // failure the approximate-pin warning below stands.
  const triedRef = useRef('');
  useEffect(() => {
    if (exact || !isShortMapsLink(mapsLink) || triedRef.current === mapsLink) return undefined;
    triedRef.current = mapsLink;
    let alive = true;
    (async () => {
      const full = await catalogApi.resolveMapsLink(mapsLink);
      if (alive && full && exactPinCoords(full)) {
        // setField schedules the debounced autosave itself, so the resolved
        // link is persisted like any other edit.
        setField('location', 'mapsLink', full);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mapsLink, exact, setField]);

  if (!mapsLink.trim() || validateMapsLink(mapsLink)) return null;
  const address = [houseStreet, area, city, district, stateName, pincode]
    .map((x) => x?.trim?.())
    .filter(Boolean)
    .join(', ');
  return (
    <div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 8 }}>
        Map preview — this is exactly where customers will see your venue
      </div>
      {!exact && (
        <div style={{ ...noteStyle, marginBottom: 10, background: 'var(--warning-50)', border: '1px solid var(--warning-500)' }}>
          <Icon name="info" size={16} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--warning-500)' }} />
          <span>
            This link doesn&apos;t include your exact pin, so the map below is approximate. For a precise
            pin, open your venue on <b>Google Maps in a browser</b> and paste the full link from the
            address bar (it contains the coordinates) — or set the map location below.
          </span>
        </div>
      )}
      <iframe
        title="Venue location preview"
        src={mapEmbedSrc({ name: draft.basics?.venueName, address, mapsLink })}
        style={{ width: '100%', height: 260, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/**
 * A location text field with as-you-type suggestions for towns and
 * localities (Google Places through the backend), nudged towards the chosen
 * district. Free text always works — suggestions only help spelling.
 */
function PlaceSuggestField({ name, label, placeholder, required, hint }) {
  const { draft, setField, flushNow, currentErrors, currentSection } = useVenueDraftContext();
  const { stateName = '', district = '' } = draft.location || {};
  const value = draft.location?.[name] ?? '';
  const error = currentSection === 'location' ? currentErrors[name] : undefined;
  const [items, setItems] = useState([]);
  const [focused, setFocused] = useState(false);
  const typedRef = useRef(false);

  useEffect(() => {
    if (!typedRef.current || !focused || value.trim().length < 2) {
      setItems([]);
      return undefined;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      const bias = await districtCentre(stateName, district);
      const found = await suggestPlaces([value, district, stateName].filter(Boolean).join(', '), bias);
      if (alive) setItems(found.slice(0, 5));
    }, SUGGEST_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value, focused, stateName, district]);

  const choose = (item) => {
    typedRef.current = false;
    setField('location', name, item.main);
    endSuggestSession();
    setItems([]);
  };

  return (
    <div style={{ position: 'relative' }}>
      <TextField
        label={label}
        required={required}
        placeholder={placeholder}
        hint={hint}
        value={value}
        error={error}
        autoComplete="off"
        onChange={(e) => {
          typedRef.current = true;
          setField('location', name, e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          flushNow();
        }}
      />
      {focused && items.length > 0 && (
        <ul
          role="listbox"
          aria-label={`Suggestions for ${label}`}
          style={{
            position: 'absolute', zIndex: 5, left: 0, right: 0, top: '100%', margin: '4px 0 0', padding: 4,
            listStyle: 'none', background: 'var(--surface-card)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', maxHeight: 240, overflowY: 'auto',
          }}
        >
          {items.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                // mousedown, not click: the input's blur must not close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(item);
                }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, background: 'none',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                }}
              >
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)' }}>{item.main}</span>
                {item.secondary && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const fixed = (n) => String(Math.round(Number(n) * 1e6) / 1e6);

/**
 * Map location — the venue's exact point, used to show it to customers
 * nearby. An exact pin in the Google Maps link always wins; otherwise the
 * vendor sets one here: from their phone's GPS while AT the venue, from the
 * typed address (geocoded), or by typing the coordinates.
 */
function MapPinField() {
  const { draft, patchSection } = useVenueDraftContext();
  const l = draft.location || {};
  const linkPin = exactPinCoords(l.mapsLink || '');
  const [status, setStatus] = useState({ state: 'idle', message: '' });   // idle | busy | done | error

  const setPin = (lat, lng, message) => {
    patchSection('location', (prev) => ({ ...prev, latitude: fixed(lat), longitude: fixed(lng) }));
    setStatus({ state: 'done', message });
  };

  const fromGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus({ state: 'error', message: 'This browser can’t share its location. Use the address or type the coordinates.' });
      return;
    }
    setStatus({ state: 'busy', message: 'Finding your location…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setPin(pos.coords.latitude, pos.coords.longitude,
        `Pinned from your device (accurate to about ${Math.round(pos.coords.accuracy || 0)} m). Only use this while you are at the venue.`),
      (err) => setStatus({
        state: 'error',
        message: err?.code === 1
          ? 'Location access is blocked for this site. Allow it in your browser settings, or use the address instead.'
          : 'Your device couldn’t find its location right now. Try again, or use the address instead.',
      }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const fromAddress = async () => {
    setStatus({ state: 'busy', message: 'Looking up the address…' });
    const found = await geocodeAddress(
      [l.houseStreet, l.area, l.city, l.pincode],
      { state: l.stateName, district: l.district },
    );
    if (found) {
      setPin(found.lat, found.lng, `Pinned from the address${found.label ? ` (${found.label})` : ''}. Check it on the map below and adjust if needed.`);
    } else {
      setStatus({
        state: 'error',
        message: 'We couldn’t find that address on the map right now. Use your device’s location at the venue, type the coordinates, or paste a Google Maps link that has the pin.',
      });
    }
  };

  const clear = () => {
    patchSection('location', (prev) => ({ ...prev, latitude: '', longitude: '' }));
    setStatus({ state: 'idle', message: '' });
  };

  const hasPin = String(l.latitude ?? '') !== '' && String(l.longitude ?? '') !== '';
  const busy = status.state === 'busy';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)' }}>
        Map location (pin)
      </div>
      {linkPin ? (
        <div style={{ ...noteStyle, background: 'var(--surface-sunken)' }}>
          <Icon name="check-circle" size={16} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--success-600)' }} />
          <span>
            Your Google Maps link pins the exact spot ({fixed(linkPin.lat)}, {fixed(linkPin.lng)}) — customers nearby will
            find your venue from it. Nothing else is needed here.
          </span>
        </div>
      ) : (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Your link has no exact pin, so set the venue&apos;s point here — without one, customers searching nearby
          won&apos;t see your venue.
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button type="button" variant="secondary" size="sm" onClick={fromGps} disabled={busy}>
          <Icon name="map-pin" size={16} /> Use my location (I’m at the venue)
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={fromAddress} disabled={busy}>
          <Icon name="map-pin" size={16} /> Find from the address
        </Button>
        {hasPin && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={busy}>
            Clear pin
          </Button>
        )}
      </div>
      {status.message && (
        <p
          role={status.state === 'error' ? 'alert' : 'status'}
          style={{
            ...noteStyle, margin: 0,
            background: status.state === 'error' ? 'var(--error-50)' : 'var(--surface-sunken)',
            color: status.state === 'error' ? 'var(--error-700)' : 'var(--text-heading)',
          }}
        >
          {status.message}
        </p>
      )}
      <div className="rv-grid-2">
        <SectionTextField section="location" name="latitude" label="Latitude" inputMode="decimal" placeholder="e.g. 17.385044" />
        <SectionTextField section="location" name="longitude" label="Longitude" inputMode="decimal" placeholder="e.g. 78.486671" />
      </div>
      {hasPin && !linkPin && (
        <iframe
          title="Venue pin preview"
          src={mapEmbedSrc({ address: `${l.latitude},${l.longitude}` })}
          style={{ width: '100%', height: 220, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
}

/**
 * Step 2 · Location — anywhere in India: Country → State → District →
 * City / Town → Locality, the street address, PIN code and the map location.
 * Changing the state clears the district and everything inside it; changing
 * the district clears the town and locality.
 */
export default function LocationStep() {
  const { draft, setField, patchSection } = useVenueDraftContext();
  const l = draft.location || {};
  const stateName = l.stateName || '';
  const districts = districtsOf(stateName);

  // Older drafts may hold another spelling ('TS', 'Rangareddy',
  // 'Medchal–Malkajgiri'): switch it to the list's own name once.
  useEffect(() => {
    const state = canonicalState(stateName);
    if (state && state !== stateName) setField('location', 'stateName', state);
    const district = state && l.district ? findDistrict(state, l.district) : null;
    if (district && district !== l.district) setField('location', 'district', district);
    if (!l.country) setField('location', 'country', COUNTRY);
  }, [stateName, l.district, l.country, setField]);

  const onState = (next) => {
    if (next === stateName) return;
    patchSection('location', (prev) => ({ ...prev, stateName: next, district: '', city: '', area: '', latitude: '', longitude: '' }));
  };
  const onDistrict = () => {
    patchSection('location', (prev) => ({ ...prev, city: '', area: '' }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={headingStyle}>Address</div>

      <div className="rv-grid-2">
        <TextField label="Country" value={COUNTRY} readOnly disabled hint="Venues can be registered anywhere in India." />
        <SectionSelect
          section="location"
          name="stateName"
          label="State / Union territory"
          required
          placeholder="Select your state"
          options={withSaved(STATE_NAMES, canonicalState(stateName) ? '' : stateName, 'state')}
          onValue={onState}
        />
      </div>

      <div className="rv-grid-2">
        <SectionSelect
          section="location"
          name="district"
          label="District"
          required
          placeholder={stateName ? 'Select your district' : 'Select a state first'}
          options={withSaved(districts, l.district, 'district')}
          disabled={!districts.length}
          onValue={onDistrict}
        />
        <PlaceSuggestField
          name="city"
          label="City / Town"
          required
          placeholder={l.district ? `e.g. a town in ${l.district}` : 'e.g. Hyderabad'}
        />
      </div>

      <div className="rv-grid-2">
        <PlaceSuggestField name="area" label="Locality / Area" placeholder="e.g. Kondapur" />
        <SectionTextField
          section="location"
          name="pincode"
          label="PIN code"
          required
          inputMode="numeric"
          placeholder="500084"
          sanitize={(v) => sanitizeDigitsMax(v, 6)}
        />
      </div>

      <SectionTextField
        section="location"
        name="houseStreet"
        label="Street address"
        required
        placeholder="e.g. 8-2-120, Road No. 2, Banjara Hills"
      />

      <div className="rv-grid-2">
        <SectionTextField section="location" name="unitNumber" label="Building / Floor / Unit number (optional)" placeholder="e.g. 2nd floor, Unit 4" />
        <SectionTextField section="location" name="roadNumber" label="Road number (optional)" placeholder="e.g. Road No. 12" />
      </div>

      <SectionTextField section="location" name="landmark" label="Landmark (optional)" placeholder="e.g. Opp. Bus Stand" />

      <div style={headingStyle}>Map location</div>

      <SectionTextField
        section="location"
        name="mapsLink"
        label="Google Maps link"
        required
        type="url"
        placeholder="https://maps.google.com/..."
      />

      <MapPreview />
      <MapPinField />
    </div>
  );
}
