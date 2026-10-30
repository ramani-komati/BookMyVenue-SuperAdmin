import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock.js'
import { Field, MoveButtons, dangerLinkBtn, hintStyle, inputStyle } from '../homepage/homepageUi.jsx'
import { LIMITS, moveImage } from './campaignModel.js'

const blankImage = (url) => ({ url, alt: '', link: '', caption: '' })

/** Pick an image already in storage: past campaign images and homepage banner art. */
function LibraryModal({ onPick, onClose }) {
  const [state, setState] = useState({ status: 'loading', images: [], error: '' })
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    let live = true
    adminApi.campaignImages()
      .then((res) => live && setState({ status: 'ready', images: res.images || [], error: '' }))
      .catch((err) => live && setState({ status: 'error', images: [], error: err.message }))
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    lockBodyScroll()
    return () => { live = false; document.removeEventListener('keydown', onKey); unlockBodyScroll() }
  }, [])

  return (
    <div role="dialog" aria-modal="true" aria-label="Choose an image" style={{ position: 'fixed', inset: 0, background: 'rgba(6,21,44,.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface-card)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', width: 760, maxWidth: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>Choose an image</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--neutral-100)', cursor: 'pointer', fontSize: 18, fontWeight: 800 }}>×</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {state.status === 'loading' && <div style={hintStyle}>Loading images…</div>}
          {state.status === 'error' && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{state.error}</div>}
          {state.status === 'ready' && state.images.length === 0 && (
            <div style={hintStyle}>No images yet. Upload one — it is kept here for later campaigns.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {state.images.map((img) => (
              <button
                key={img.url} type="button" onClick={() => onPick(img.url)}
                className="hover-wash"
                style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--surface-card)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}
              >
                <img src={img.url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '2 / 1', objectFit: 'cover', borderRadius: 8, background: 'var(--neutral-100)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{img.source === 'banner' ? 'Homepage banner' : 'Campaign image'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The campaign's images, in email order. The FIRST is the full-width banner
 * at the top of the email; the others follow the text, each with an optional
 * caption and link. Images go to the same storage bucket as banners.
 */
export default function CampaignImages({ images, onChange, disabled, showToast, problem }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [library, setLibrary] = useState(false)
  const full = images.length >= LIMITS.images

  const patch = (index, change) => onChange(images.map((img, i) => (i === index ? { ...img, ...change } : img)))
  const add = (url) => onChange([...images, blankImage(url)])

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await adminApi.uploadCampaignImage(file)
      add(res.url)
      showToast((res.warnings || [])[0] || 'Image uploaded')
    } catch (err) {
      showToast(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {images.map((img, i) => (
        <div key={`${img.url}-${i}`} style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', flex: '0 0 auto' }}>
            <img src={img.url} alt="" style={{ width: 132, aspectRatio: '2 / 1', objectFit: 'cover', borderRadius: 8, background: 'var(--neutral-100)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{i === 0 ? 'Top banner' : `Image ${i + 1}`}</span>
            {!disabled && <MoveButtons index={i} count={images.length} onMove={(idx, d) => onChange(moveImage(images, idx, d))} label={`image ${i + 1}`} />}
          </div>
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <Field label="Description (alt text)" hint="Shown when the reader’s mail app blocks images.">
              <input className="bmva" style={inputStyle} value={img.alt} maxLength={150} disabled={disabled} onChange={(e) => patch(i, { alt: e.target.value })} placeholder="e.g. Diwali party hall offer" />
            </Field>
            <Field label="Caption (optional)">
              <input className="bmva" style={inputStyle} value={img.caption} maxLength={300} disabled={disabled} onChange={(e) => patch(i, { caption: e.target.value })} />
            </Field>
            <Field label="Link when tapped (optional)" hint="https:// link, or a site path such as /venues/grand-hall">
              <input className="bmva" style={inputStyle} value={img.link} maxLength={500} disabled={disabled} onChange={(e) => patch(i, { link: e.target.value })} placeholder="/explore" />
            </Field>
            {!disabled && (
              <button type="button" style={{ ...dangerLinkBtn, alignSelf: 'flex-start' }} onClick={() => onChange(images.filter((_, k) => k !== i))}>Remove image</button>
            )}
          </div>
        </div>
      ))}

      {problem && <div style={{ ...hintStyle, color: 'var(--error-600)' }}>{problem}</div>}

      {!disabled && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="secondary" size="sm" disabled={uploading || full} onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={17} /> {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
          <Button variant="secondary" size="sm" disabled={full} onClick={() => setLibrary(true)}>Choose from library</Button>
          <span style={hintStyle}>
            {full ? `Up to ${LIMITS.images} images.` : 'JPEG or PNG, at least 1200px wide, under 5 MB. The first image is the top banner.'}
          </span>
        </div>
      )}

      {library && (
        <LibraryModal
          onClose={() => setLibrary(false)}
          onPick={(url) => { add(url); setLibrary(false) }}
        />
      )}
    </div>
  )
}
