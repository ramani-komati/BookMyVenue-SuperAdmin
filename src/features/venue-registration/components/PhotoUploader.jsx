import { useState } from 'react';
import { Icon } from '@/reg-ui';
import ImageFrame from '@/components/ui/ImageFrame.jsx';
import { IMAGE_KINDS, UPLOAD_SPECS, checkUpload, fitCaption, formatBytes, px } from '@/utils/imageSpecs';

/**
 * PhotoUploader — a gallery of uploaded thumbnails plus an add tile.
 * Each thumbnail shows a loading overlay while its upload is in flight and a
 * remove button once done. Uploads/removals are delegated to the parent.
 *
 * With `spec` (utils/imageSpecs.js UPLOAD_SPECS key) it also says what to
 * upload, and each tile is the customer card's own 3:2 frame with the same
 * fit rule (ImageFrame), with a one-line verdict — the real crop customers get.
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
  spec,
}) {
  const canAdd = photos.length < max;
  const rules = spec ? UPLOAD_SPECS[spec] : null;
  const [sizes, setSizes] = useState({});

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

      {rules && (
        <div style={{ marginTop: 10, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--surface-page, #f7f8fa)', fontSize: 'var(--text-xs)', lineHeight: 1.5, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-heading)' }}>
            Recommended <strong>{px(rules.recommended)}</strong> ({rules.ratioLabel}) — cards are {IMAGE_KINDS[rules.kind].frameLabel}
          </div>
          <div>{rules.formats.join(', ')} · up to {formatBytes(rules.maxBytes)} each · at least {px(rules.minimum)}. {rules.advice}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
        {photos.map((p, i) => (
          <div key={p.id} className="rv-upthumb">
            <ImageFrame
              kind={rules?.kind || 'listing'}
              src={p.url}
              alt={p.name || 'Uploaded photo'}
              radius={0}
              fallback={<Icon name="image" size={24} />}
              onSize={(size) => setSizes((s) => (s[p.url] ? s : { ...s, [p.url]: size }))}
            />
            {rules && i === 0 && !p.uploading && (
              <span style={{ position: 'absolute', top: 8, left: 8, padding: '2px 8px', borderRadius: 999, background: 'var(--brand-accent)', color: '#fff', fontSize: 11, fontWeight: 700 }}>Cover</span>
            )}
            {rules && sizes[p.url] && !p.uploading && (
              <span
                title={checkUpload(spec, sizes[p.url]).warnings[0] || fitCaption(rules.kind, sizes[p.url].width, sizes[p.url].height)}
                style={{
                  position: 'absolute', left: 6, bottom: 6, maxWidth: 'calc(100% - 12px)', padding: '2px 8px', borderRadius: 999,
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  ...(checkUpload(spec, sizes[p.url]).warnings.length
                    ? { background: 'var(--warning-50)', color: 'var(--warning-700)' }
                    : { background: 'var(--success-50)', color: 'var(--success-700)' }),
                }}
              >
                {checkUpload(spec, sizes[p.url]).warnings.length ? 'See note (hover)' : 'Fits the card'}
              </span>
            )}
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
              accept={rules ? rules.mimeTypes.join(',') : 'image/*'}
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
