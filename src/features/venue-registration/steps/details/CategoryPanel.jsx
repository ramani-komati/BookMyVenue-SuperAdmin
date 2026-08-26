import { Checkbox, Select } from '@/reg-ui';
import { HALL_SUBCATS, PLAYZONE_SPORTS, PRIMARY_CATEGORIES } from '@/constants/venue';
import useDetails from './useDetails';

/** Grid of selectable checkbox tiles (sub-categories / sports). */
function ToggleGrid({ title, items, isOn, onToggle }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--fw-semibold)',
          color: 'var(--text-heading)',
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div className="rv-checkgrid">
        {items.map((label) => (
          // The Checkbox's own <label> is the only click handler — a second
          // onClick on the tile would fire together with it and undo the toggle.
          <div key={label} className="rv-amenity" data-on={isOn(label)}>
            <Checkbox label={label} checked={isOn(label)} onChange={() => onToggle(label)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Category panel — primary category plus category-specific taxonomy
 * (occasions for Private Hall, sports for Playzone).
 */
export default function CategoryPanel() {
  const { details, errors, set, toggleInMap, flushNow } = useDetails();
  const isHall = details.primaryCategory === 'Private Hall';
  const isPlayzone = details.primaryCategory === 'Playzone';

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">Category</div>

      <Select
        label="Primary category"
        required
        placeholder="Select a category"
        options={PRIMARY_CATEGORIES}
        value={details.primaryCategory}
        error={errors.primaryCategory}
        onChange={(e) => set('primaryCategory', e.target.value)}
        onBlur={flushNow}
      />

      {isHall && (
        <ToggleGrid
          title="Sub-categories (occasions you host)"
          items={HALL_SUBCATS}
          isOn={(k) => !!details.subCategories?.[k]}
          onToggle={(k) => toggleInMap('subCategories', k)}
        />
      )}

      {isPlayzone && (
        <ToggleGrid
          title="Sports available"
          items={PLAYZONE_SPORTS}
          isOn={(k) => !!details.sports?.[k]}
          onToggle={(k) => toggleInMap('sports', k)}
        />
      )}
    </div>
  );
}
