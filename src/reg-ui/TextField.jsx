import { useId } from 'react';
import Icon from './Icon';

/**
 * TextField — labelled text input / textarea with optional prefix, suffix,
 * hint and error message. Renders a <textarea> when `multiline` is set.
 * All unknown props are forwarded to the underlying control (value, onChange,
 * onBlur, type, placeholder, maxLength, inputMode, disabled, ...).
 */
export default function TextField({
  label,
  hint,
  error,
  required = false,
  prefix,
  suffix,
  id,
  multiline = false,
  rows,
  className,
  ...rest
}) {
  const autoId = useId();
  const fid = id || autoId;
  const errId = `${fid}-err`;
  const hintId = `${fid}-hint`;
  const describedBy = error ? errId : hint ? hintId : undefined;

  const inputCls = [
    'bmv-input',
    error ? 'bmv-input--error' : '',
    prefix ? (String(prefix).length > 1 ? 'bmv-input--has-wide-prefix' : 'bmv-input--has-prefix') : '',
    suffix ? 'bmv-input--has-suffix' : '',
    multiline ? 'bmv-input--textarea' : '',
    className || '',
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
      <div className="bmv-input-wrap">
        {prefix && <span className="bmv-input__affix bmv-input__affix--prefix">{prefix}</span>}
        {multiline ? (
          <textarea id={fid} className={inputCls} rows={rows || 4} aria-invalid={!!error} aria-describedby={describedBy} {...rest} />
        ) : (
          <input id={fid} className={inputCls} aria-invalid={!!error} aria-describedby={describedBy} {...rest} />
        )}
        {suffix && <span className="bmv-input__affix bmv-input__affix--suffix">{suffix}</span>}
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
