import { useId } from 'react';

/**
 * Checkbox — accessible checkbox with a custom check indicator.
 * Forwards `checked`, `onChange`, `disabled`, etc. to the native input.
 */
export default function Checkbox({ label, id, className = '', ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  return (
    <label className={`bmv-check ${className}`.trim()} htmlFor={fid}>
      <input type="checkbox" id={fid} {...rest} />
      <span className="bmv-check__box" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      {label && <span className="bmv-check__label">{label}</span>}
    </label>
  );
}
