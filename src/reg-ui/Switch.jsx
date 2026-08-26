import { useId } from 'react';

/**
 * Switch — accessible on/off toggle. Forwards `checked`, `onChange`, `disabled`.
 */
export default function Switch({ label, id, className = '', ...rest }) {
  const autoId = useId();
  const fid = id || autoId;
  return (
    <label className={`bmv-switch ${className}`.trim()} htmlFor={fid}>
      <input type="checkbox" role="switch" id={fid} {...rest} />
      <span className="bmv-switch__track" aria-hidden="true" />
      {label && <span>{label}</span>}
    </label>
  );
}
