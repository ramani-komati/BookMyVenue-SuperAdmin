import { Icon, SafeImg } from '@/reg-ui';

/**
 * PhotoUploader — a gallery of uploaded thumbnails plus an add tile.
 * Each thumbnail shows a loading overlay while its upload is in flight and a
 * remove button once done. Uploads/removals are delegated to the parent.
 */
export default function PhotoUploader({
  title,
  requiredMark = false,
  description,
  photos = [],
  max,
  onAdd,
  onRemove,
  countLabel,
}) {
  const canAdd = photos.length < max;

  return (
    <div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-bold)', color: 'var(--text-heading)' }}>
        {title}
        {requiredMark && <span style={{ color: 'var(--brand-accent)' }}> *</span>}
      </div>
      {description && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
          {description}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
        {photos.map((p) => (
          <div key={p.id} className="rv-upthumb">
            <SafeImg
              src={p.url}
              alt={p.name || 'Uploaded photo'}
              fallback={
                <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-sunken)', color: 'var(--text-muted)' }} role="img" aria-label={p.name || 'Photo unavailable'}>
                  <Icon name="image" size={24} />
                </span>
              }
            />
            {p.uploading ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(6,21,44,.45)',
                  color: '#fff',
                }}
              >
                <Icon name="loader" size={26} className="animate-spin" />
              </div>
            ) : (
              <button
                type="button"
                className="rv-upremove"
                aria-label="Remove photo"
                onClick={() => onRemove(p.id)}
              >
                &times;
              </button>
            )}
          </div>
        ))}

        {canAdd && (
          <label className="rv-uptile">
            <input
              type="file"
              accept="image/*"
              multiple
              aria-label={`Upload ${title || 'photos'}`}
              style={{ display: 'none' }}
              onChange={(e) => {
                onAdd(e.target.files);
                e.target.value = '';
              }}
            />
            <Icon name="upload" size={26} />
          </label>
        )}
      </div>

      {countLabel && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 14 }}>
          {countLabel}
        </div>
      )}
    </div>
  );
}
