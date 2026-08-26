import { useState } from 'react';

/**
 * SafeImg — an <img> that never leaves a broken-image icon behind. If the
 * source is missing or fails to load (dead URL, stale blob: from an old
 * session, corrupt file), it renders the `fallback` node instead — pass the
 * placeholder that fits the slot (an <Icon>, a styled box, or null to hide).
 */
export default function SafeImg({ src, alt = '', fallback = null, ...rest }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  // Lazy + async by default — venue photos can be large; below-the-fold ones
  // must not block the first paint. Callers can override via props.
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} {...rest} />;
}
