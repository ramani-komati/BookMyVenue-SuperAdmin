import { sanitizeDigitsMax } from '@/utils/validation';
import { SectionTextField } from '../components/SectionFields';

/**
 * Step 1 · Basics — venue name, description and contact details.
 */
export default function BasicInfoStep() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-heading)' }}>
        Basics
      </div>

      <SectionTextField
        section="basics"
        name="venueName"
        label="Venue name"
        required
        placeholder="e.g. The Grand Pavilion"
        maxLength={80}
      />

      <SectionTextField
        section="basics"
        name="shortDescription"
        label="Short description"
        multiline
        rows={3}
        placeholder="Tell guests what makes your venue special..."
        maxLength={280}
      />

      <div className="rv-grid-2">
        <SectionTextField
          section="basics"
          name="phone"
          label="Contact phone"
          required
          type="tel"
          inputMode="numeric"
          placeholder="90000 00000"
          sanitize={(v) => sanitizeDigitsMax(v, 10)}
        />
        <SectionTextField
          section="basics"
          name="email"
          label="Contact email"
          type="email"
          placeholder="you@venue.com"
        />
      </div>
    </div>
  );
}
