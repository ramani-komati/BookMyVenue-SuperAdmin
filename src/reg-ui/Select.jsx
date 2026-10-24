import { useId } from 'react';
import Icon from './Icon';

/**
 * Select — labelled native <select> styled to the design system.
 * `options` accepts strings or { value, label } objects.
 */
export default function Select({
  label,
  hint,
  error,
  required = false,
  placeholder,
  options = [],
  value,
  id,
  ...rest
}) {
  const autoId = useId();
  const fid = id || autoId;
  const errId = `${fid}-err`;
  const hintId = `${fid}-hint`;
  const describedBy = error ? errId : hint ? hintId : undefined;
  const isPlaceholder = value === undefined || value === '' || value == null;

  const selectCls = [
    'bmv-select',
    isPlaceholder ? 'bmv-select--placeholder' : '',
    error ? 'bmv-select--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="bmv-field">
      {label && (
        <label className="bmv-field__label" htmlFor={fid}>
          {label}
          {required && <span className="bmv-field__req">*</span>}
        </label>
      )}
      <div className="bmv-select-wrap">
        <select id={fid} value={value ?? ''} className={selectCls} aria-invalid={!!error} aria-describedby={describedBy} {...rest}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
        <span className="bmv-select__chevron" aria-hidden="true" />
      </div>
      {error ? (
        <span id={errId} className="bmv-field__error" role="alert">
          <Icon name="info" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="bmv-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
