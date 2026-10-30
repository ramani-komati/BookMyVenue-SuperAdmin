import { useState } from 'react';
import { Button, Checkbox, Select, TextField } from '@/reg-ui';
import { OTHERS, draftGroup, onlyTypeOf, primaryOptions, typeOptions } from '@/constants/categories';
import {
  OTHERS_OPTION, addCustomSubcategory, gridItems, removeCustomSubcategory, subcatMapKey, supportsCustom,
  withCustomList,
} from '@/constants/subcategories';
import AmenityTagInput from '../../components/AmenityTagInput';
import useDetails from './useDetails';
import useSubcategoryOptions from './useSubcategoryOptions';

// Who approves a new custom sub-category, as this app tells the user.
// (The vendor portal's copy says they wait for the super admin's approval.)
const CUSTOM_NOTE = 'Subcategories you add here are approved straight away and offered to vendors too.';

const SUBCAT_TITLES = {
  'Private Hall': 'Sub-categories (occasions you host)',
  Playzone: 'Sports available',
  Playstation: 'Setups you offer',
  Gym: 'Fitness services you offer (main category: Gym and Fitness)',
  'Big Screen Surprise': 'Occasions you offer',
};

const BADGE = {
  yours: 'New',
  pending: 'Pending approval',
};

/**
 * The venue type's sub-category tiles — the built-in list, the shared
 * custom names (constants/subcategories.js), the draft's own — with an
 * "Others" option at the bottom that reveals "Enter Your Subcategory".
 * A list that already has its own "Others" tile (Private Hall occasions,
 * Big Screen Surprise "Other") keeps it: ticking it still means what it
 * always did, and also opens the box.
 */
function SubcategoryGrid({ type, details, shared, onToggle, onAdd, onRemove }) {
  const [openOwn, setOpenOwn] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mapKey = subcatMapKey(type);
  const isOn = (k) => !!details[mapKey]?.[k];
  const { items, othersTile } = gridItems(type, shared, details);
  const builtInOthers = items.find((i) => i.others);
  const open = othersTile ? openOwn : builtInOthers ? isOn(builtInOthers.name) : false;

  const add = () => {
    const result = onAdd(text);
    if (result.error) {
      setError(result.error);
      setNotice('');
      return;
    }
    setError('');
    setText('');
    setNotice(result.existed ? `"${result.name}" is already in the list — selected it.` : `Added "${result.name}".`);
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 12 }}>
        {SUBCAT_TITLES[type]}
      </div>
      <div className="rv-checkgrid">
        {items.map((item) => (
          // The Checkbox's own <label> is the only click handler — a second
          // onClick on the tile would fire together with it and undo the toggle.
          <div key={item.name} className="rv-amenity" data-on={isOn(item.name)}>
            <Checkbox label={item.name} checked={isOn(item.name)} onChange={() => onToggle(item.name)} />
            {BADGE[item.status] && (
              <span style={{ flex: '0 0 auto', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--warning-700)', background: 'var(--warning-50)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', marginLeft: 6 }}>
                {BADGE[item.status]}
              </span>
            )}
            {item.status === 'yours' && (
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onRemove(item.name)}
                style={{ flex: '0 0 auto', border: 0, background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 0 4px 8px' }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {othersTile && (
          <div className="rv-amenity" data-on={openOwn}>
            <Checkbox label={OTHERS_OPTION} checked={openOwn} onChange={() => setOpenOwn((v) => !v)} />
          </div>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px' }}>
              <TextField
                label="Enter Your Subcategory"
                placeholder="Enter subcategory name"
                maxLength={40}
                value={text}
                error={error || undefined}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    add();
                  }
                }}
              />
            </div>
            <Button type="button" variant="secondary" onClick={add} style={{ marginBottom: error ? 22 : 0 }}>
              Add
            </Button>
          </div>
          {notice && <div style={{ marginTop: 8, fontSize: 'var(--text-sm)', color: 'var(--success-700)' }}>{notice}</div>}
          <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{CUSTOM_NOTE}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Category panel — the primary category (Celebrate, Sports, Gaming, Resorts,
 * Fitness), Celebrate's venue type (Private Hall / Private Theatre / Open Air
 * Theatre), then the category's own taxonomy (occasions, sports, setups).
 *
 * The draft still stores the VENUE TYPE in `primaryCategory` (the values it
 * always held, so every existing draft opens unchanged) plus the chosen
 * primary category in `categoryGroup`. The model lives in
 * constants/categories.js — shared by every registration and edit screen.
 *
 * `allowOthers` offers the "Others" escape hatch (vendor registration). A
 * draft that already uses it always keeps it on offer, so it stays editable.
 */
export default function CategoryPanel({ allowOthers = false }) {
  const { details, errors, set, patch, flushNow } = useDetails();
  const { sharedFor } = useSubcategoryOptions();
  const group = draftGroup(details);
  const type = details.primaryCategory;
  const isOthers = type === OTHERS;
  const types = typeOptions(group);

  // For "Others" the vendor types their own sub-categories — they live in the
  // same `subCategories` map (key → true) that the fixed lists use, so
  // everything downstream reads them the same way. Ordered list for display.
  const manualSubcats = Object.keys(details.subCategories || {}).filter((k) => details.subCategories[k]);
  const addManualSubcat = (val) =>
    patch((prev) => ({ ...prev, subCategories: { ...prev.subCategories, [val]: true } }));
  const removeManualSubcat = (i) =>
    patch((prev) => {
      const next = { ...prev.subCategories };
      delete next[manualSubcats[i]];
      return { ...prev, subCategories: next };
    });

  // Switching venue type clears the previous one's taxonomy — hall occasions
  // and PlayStation setups share the `subCategories` map, so keeping stale
  // entries would leak e.g. "PS5" into a hall's occasions. Sports reset for
  // the same reason.
  const changeType = (nextGroup, nextType) => {
    if (nextGroup === group && nextType === type) return;
    patch((prev) => ({
      ...prev,
      categoryGroup: nextGroup,
      primaryCategory: nextType,
      // Leaving "Others" drops its typed name so a stale value can't be
      // autosaved or submitted under a fixed category.
      customCategory: nextType === OTHERS ? prev.customCategory : '',
      ...(nextType === prev.primaryCategory ? {} : { subCategories: {}, sports: {}, customSubCategories: [] }),
    }));
  };

  // Ticking / adding / removing a sub-category keeps
  // details.customSubCategories (the names the server records as custom)
  // in step with what is ticked.
  const toggleSub = (name) => {
    const mapKey = subcatMapKey(type);
    patch((prev) => withCustomList({ ...prev, [mapKey]: { ...prev[mapKey], [name]: !prev[mapKey]?.[name] } }, type));
  };
  const addCustom = (raw) => {
    const result = addCustomSubcategory(details, type, raw, sharedFor(type));
    if (!result.error) patch((prev) => addCustomSubcategory(prev, type, raw, sharedFor(type)).details);
    return result;
  };
  const removeCustom = (name) => patch((prev) => removeCustomSubcategory(prev, type, name));
  // A one-type category picks its type at once; Celebrate waits for the
  // venue-type choice below (and keeps a Celebrate type already chosen).
  const changeGroup = (nextGroup) => {
    const only = onlyTypeOf(nextGroup);
    const keep = typeOptions(nextGroup).some((o) => o.value === type) ? type : '';
    changeType(nextGroup, only || keep);
  };

  return (
    <div className="rv-panel">
      <div className="rv-panel-h">Category</div>

      <Select
        label="Primary category"
        required
        placeholder="Select a category"
        options={primaryOptions({ others: allowOthers || isOthers })}
        value={group}
        error={errors.primaryCategory && !group ? errors.primaryCategory : undefined}
        onChange={(e) => changeGroup(e.target.value)}
        onBlur={flushNow}
      />

      {types.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <Select
            label="Venue type"
            required
            placeholder="Select the venue type"
            options={types}
            value={types.some((o) => o.value === type) ? type : ''}
            error={errors.primaryCategory && group ? errors.primaryCategory : undefined}
            onChange={(e) => changeType(group, e.target.value)}
            onBlur={flushNow}
          />
        </div>
      )}

      {isOthers && (
        <>
          <div style={{ marginTop: 18 }}>
            <TextField
              label="Category name"
              required
              maxLength={50}
              placeholder="e.g. Rooftop Lounge, Banquet Garden"
              value={details.customCategory || ''}
              error={errors.customCategory}
              onChange={(e) => set('customCategory', e.target.value)}
              onBlur={flushNow}
            />
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-heading)', marginBottom: 12 }}>
              Sub-categories (type your own)
            </div>
            <AmenityTagInput
              amenities={manualSubcats}
              onAdd={addManualSubcat}
              onRemove={removeManualSubcat}
              onBlurSave={flushNow}
            />
          </div>
        </>
      )}

      {supportsCustom(type) && (
        <SubcategoryGrid
          type={type}
          details={details}
          shared={sharedFor(type)}
          onToggle={toggleSub}
          onAdd={addCustom}
          onRemove={removeCustom}
        />
      )}
    </div>
  );
}
