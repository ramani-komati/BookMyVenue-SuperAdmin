import Icon from './Icon';

/**
 * SaveIndicator — small autosave status pill for the page header.
 * status: 'idle' | 'saving' | 'saved' | 'error'
 * savedAtLabel: formatted time string shown when status is 'saved'/'idle'.
 * errorDetail: optional human-readable reason shown when status is 'error'.
 */
export default function SaveIndicator({ status = 'idle', savedAtLabel, errorDetail }) {
  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--fw-medium)',
  };

  if (status === 'saving') {
    return (
      <div style={{ ...base, color: 'var(--text-muted)' }} aria-live="polite">
        <Icon name="loader" size={16} className="animate-spin" style={{ color: 'var(--brand-accent)' }} />
        Saving…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ ...base, color: 'var(--error-600)' }} role="status" aria-live="polite">
        <Icon name="info" size={16} />
        {errorDetail ? `Couldn't save — ${errorDetail}` : "Couldn't save — retrying"}
      </div>
    );
  }

  // idle / saved
  return (
    <div style={{ ...base, color: 'var(--text-muted)' }} aria-live="polite">
      <span style={{ color: 'var(--brand-accent)', display: 'inline-flex' }}>
        <Icon name="save" size={16} />
      </span>
      {savedAtLabel ? `Draft saved · ${savedAtLabel}` : 'All changes saved'}
    </div>
  );
}
