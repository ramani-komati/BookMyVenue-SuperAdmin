import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

/**
 * BackButton — round top-left arrow that returns to the previous page.
 * When the page was opened directly (no in-app history to go back to, e.g. a
 * shared link in a fresh tab), it falls back to `fallback` instead of leaving
 * the site or doing nothing.
 */
export default function BackButton({ fallback = '/home', label = 'Go back', style }) {
  const navigate = useNavigate();
  const goBack = () => {
    // React Router stamps its entry index on history.state — idx 0 means this
    // is the first in-app entry, so there is no previous page to return to.
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button type="button" className="bmv-backbtn" onClick={goBack} aria-label={label} title={label} style={style}>
      <Icon name="arrow-left" size={20} />
    </button>
  );
}
