import { useState } from 'react';

/**
 * AmenityTagInput — free-form tag entry. Type and press Enter (or comma) to add
 * a chip; Backspace on an empty field removes the last chip. Duplicates
 * (case-insensitive) are ignored.
 */
export default function AmenityTagInput({ amenities = [], onAdd, onRemove, onBlurSave }) {
  const [inputValue, setInputValue] = useState('');

  const commit = (raw) => {
    const val = (raw || '').trim();
    if (!val) return;
    const exists = amenities.some((a) => a.toLowerCase() === val.toLowerCase());
    if (!exists) onAdd(val);
    setInputValue('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && amenities.length) {
      onRemove(amenities.length - 1);
    }
  };

  return (
    <div className="rv-taginput">
      {amenities.map((a, i) => (
        <span className="rv-chip" key={`${a}-${i}`}>
          {a}
          <button type="button" aria-label={`Remove ${a}`} onClick={() => onRemove(i)}>
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        className="rv-taginput-field"
        placeholder={amenities.length ? 'Add another…' : 'e.g. AC, Recliners, Dolby Atmos'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit(inputValue);
          onBlurSave?.();
        }}
      />
    </div>
  );
}
