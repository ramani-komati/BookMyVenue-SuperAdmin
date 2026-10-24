import { useEffect, useRef } from 'react';
import { Icon } from '@/reg-ui';
import { sanitizeDigitsMax, validateMapsLink } from '@/utils/validation';
import { exactPinCoords, isShortMapsLink, mapEmbedSrc } from '@/utils/maps';
import { catalogApi } from '@/services/catalogApi';
import { TELANGANA_DISTRICTS } from '@/constants/venue';
import { useVenueDraftContext } from '../context/VenueDraftContext';
import { SectionSelect, SectionTextField } from '../components/SectionFields';

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
  const { mapsLink = '', houseStreet, area, city, stateName, pincode } = draft.location || {};
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
  const address = [houseStreet, area, city, stateName, pincode]
    .map((x) => x?.trim?.())
    .filter(Boolean)
    .join(', ');
  return (
    <div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 8 }}>
        Map preview — this is exactly where customers will see your venue
      </div>
      {!exact && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10, padding: '10px 14px',
            borderRadius: 'var(--radius-md)', background: 'var(--warning-50)',
            border: '1px solid var(--warning-500)', fontSize: 'var(--text-sm)', color: 'var(--text-heading)',
          }}
        >
          <Icon name="info" size={16} style={{ flex: '0 0 auto', marginTop: 2, color: 'var(--warning-500)' }} />
          <span>
            This link doesn&apos;t include your exact pin, so the map below is approximate. For a precise
            pin, open your venue on <b>Google Maps in a browser</b> and paste the full link from the
            address bar (it contains the coordinates).
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
 * Step 2 · Location — full postal address and a Google Maps link.
 */
export default function LocationStep() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-heading)' }}>
        Address
      </div>

      <SectionTextField
        section="location"
        name="houseStreet"
        label="House no. / Building, Street"
        required
        placeholder="e.g. 8-2-120, Road No. 2"
      />

      <div className="rv-grid-2">
        <SectionTextField section="location" name="area" label="Area / Locality" placeholder="e.g. Kondapur" />
        <SectionSelect
          section="location"
          name="district"
          label="District"
          placeholder="Select your district"
          options={TELANGANA_DISTRICTS}
        />
      </div>

      <div className="rv-grid-2">
        <SectionTextField
          section="location"
          name="pincode"
          label="Pincode"
          required
          inputMode="numeric"
          placeholder="500084"
          sanitize={(v) => sanitizeDigitsMax(v, 6)}
        />
        <SectionTextField section="location" name="city" label="City" placeholder="Hyderabad" />
      </div>

      <div className="rv-grid-2">
        <SectionTextField section="location" name="stateName" label="State" required placeholder="Telangana" />
        <div />
      </div>

      <SectionTextField
        section="location"
        name="mapsLink"
        label="Google Maps link"
        required
        type="url"
        placeholder="https://maps.google.com/..."
      />

      <MapPreview />
    </div>
  );
}
