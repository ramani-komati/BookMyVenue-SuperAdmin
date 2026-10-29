import { useRef, useState } from 'react'
import { adminApi } from '../../services/adminApi.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import ImageFrame from '../../components/ui/ImageFrame.jsx'
import { UPLOAD_SPECS, checkUpload, fitCaption, px } from '../../utils/imageSpecs.js'
import { readImageSize } from '../../utils/imageFile.js'

/**
 * EventPhotos — the event's photo set, the same shape venues have.
 *
 * An event used to carry a single poster, which is not enough to show what a
 * night actually looks like; venues have always had a gallery and their cards
 * run a slideshow off it. This brings events up to the same standard: upload
 * several, and the customer card and detail page show them all.
 *
 * ORDER IS THE CONTRACT. Photo #1 is the banner — the card's cover image and
 * the detail hero — and the rest follow it in the slideshow. So the list is
 * reorderable, and "Make cover" is one tap rather than a re-upload.
 *
 * Uploads go one at a time through POST /api/admin/uploads, which returns a
 * permanent Supabase URL. Each file reports its own outcome: one rejected
 * file (wrong type, too large) must not discard the others the admin picked
 * in the same go.
 *
 * IMAGE STANDARD: the customer event card draws photo #1 in a 3:2 frame
 * (utils/imageSpecs.js "eventPoster", same as vendors get). Tiles here use
 * that frame and the same fit rule, so the admin sees the card's real crop;
 * a too-small file is refused before upload (the server checks again) and
 * an off-shape one gets a note, never a silent stretch or crop.
 */

const MAX_PHOTOS = 8          // matches MAX_GALLERY in events/writes.py
const MAX_BYTES = 6 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const SPEC = UPLOAD_SPECS.eventPoster

export default function EventPhotos({ photos, onChange, disabled }) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [errors, setErrors] = useState([])
  const [notes, setNotes] = useState([])
  // Natural sizes of the photos, read as each tile loads.
  const [sizes, setSizes] = useState({})
  const fileRef = useRef(null)
  const [urlDraft, setUrlDraft] = useState('')

  const room = MAX_PHOTOS - photos.length

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    setErrors([])
    setNotes([])

    const problems = []
    const advice = []
    const queue = []
    for (const file of files) {
      if (queue.length >= room) {
        problems.push(`${file.name}: only ${MAX_PHOTOS} photos per event.`)
        continue
      }
      if (!ALLOWED.includes(file.type)) {
        problems.push(`${file.name}: JPEG, PNG or WebP only.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: larger than 6 MB.`)
        continue
      }
      // Pixel rules (size limit above is this endpoint's own 6 MB).
      const dims = await readImageSize(file)
      const verdict = checkUpload('eventPoster', dims || {})
      if (verdict.problem) {
        problems.push(`${file.name}: ${verdict.problem}`)
        continue
      }
      verdict.warnings.forEach((w) => advice.push(`${file.name}: ${w}`))
      queue.push(file)
    }

    setBusy(true)
    const added = []
    for (let i = 0; i < queue.length; i += 1) {
      setProgress(`Uploading ${i + 1} of ${queue.length}…`)
      try {
        const res = await adminApi.uploadImage(queue[i])
        if (res?.url) added.push(res.url)
        else problems.push(`${queue[i].name}: the server returned no URL.`)
      } catch (err) {
        // Named per file — "upload failed" with five files selected tells the
        // admin nothing about which one to fix.
        problems.push(`${queue[i].name}: ${err.message || 'upload failed.'}`)
      }
    }
    setBusy(false)
    setProgress('')
    setErrors(problems)
    setNotes(advice)
    if (added.length) onChange([...photos, ...added])
    if (fileRef.current) fileRef.current.value = ''
  }

  const addUrl = () => {
    const url = urlDraft.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setErrors(['A photo URL must start with http:// or https://'])
      return
    }
    if (photos.includes(url)) {
      setErrors(['That photo is already in the list.'])
      return
    }
    if (room <= 0) {
      setErrors([`Only ${MAX_PHOTOS} photos per event.`])
      return
    }
    setErrors([])
    onChange([...photos, url])
    setUrlDraft('')
  }

  const remove = (index) => onChange(photos.filter((_, i) => i !== index))

  const move = (index, delta) => {
    const next = [...photos]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const makeCover = (index) => {
    if (index === 0) return
    const next = [...photos]
    const [picked] = next.splice(index, 1)
    onChange([picked, ...next])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            // Fills the row on a desktop and collapses to two tiles on a
            // phone without a media query.
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}
        >
          {photos.map((url, index) => (
            <figure
              key={`${url}-${index}`}
              style={{
                margin: 0, borderRadius: 12, overflow: 'hidden',
                border: index === 0 ? '2px solid var(--brand-accent)' : '1px solid var(--border-subtle)',
                background: 'var(--surface-card)',
                display: 'flex', flexDirection: 'column', minWidth: 0,
              }}
            >
              <ImageFrame
                kind="poster"
                src={url}
                alt={index === 0 ? 'Event banner photo' : `Event photo ${index + 1}`}
                radius={0}
                fallback={<Icon name="image" size={22} />}
                onSize={(size) => setSizes((s) => (s[url] ? s : { ...s, [url]: size }))}
              >
                {index === 0 && (
                  <span
                    style={{
                      position: 'absolute', top: 6, left: 6, padding: '2px 8px',
                      borderRadius: 999, background: 'var(--brand-accent)', color: '#fff',
                      fontSize: 11, fontWeight: 800, letterSpacing: '.02em',
                    }}
                  >
                    BANNER
                  </span>
                )}
              </ImageFrame>
              {sizes[url] && (
                <div
                  title={fitCaption('poster', sizes[url].width, sizes[url].height)}
                  style={{
                    padding: '4px 6px 0', fontSize: 11.5, lineHeight: 1.35,
                    color: checkUpload('eventPoster', sizes[url]).warnings.length ? 'var(--warning-700, #9a5502)' : 'var(--text-muted)',
                  }}
                >
                  {sizes[url].width}×{sizes[url].height} · {checkUpload('eventPoster', sizes[url]).warnings.length ? 'see note' : 'fits the card'}
                </div>
              )}
              <figcaption
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 2, padding: 4, borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <IconBtn label="Move left" disabled={disabled || index === 0} onClick={() => move(index, -1)}>‹</IconBtn>
                <IconBtn
                  label={index === 0 ? 'Already the banner' : 'Make this the banner'}
                  disabled={disabled || index === 0}
                  onClick={() => makeCover(index)}
                >
                  ★
                </IconBtn>
                <IconBtn label="Move right" disabled={disabled || index === photos.length - 1} onClick={() => move(index, 1)}>›</IconBtn>
                <IconBtn label="Remove photo" disabled={disabled} danger onClick={() => remove(index)}>×</IconBtn>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--border-default)', borderRadius: 12,
            padding: '26px 18px', textAlign: 'center', color: 'var(--text-muted)',
          }}
        >
          <Icon name="image" size={26} />
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: 'var(--text-heading)' }}>
            No photos yet
          </div>
          <div style={{ fontSize: 13, marginTop: 2 }}>
            Add 3–4 so the event card can show a slideshow.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          disabled={disabled || busy || room <= 0}
          onChange={(e) => addFiles(e.target.files)}
          style={{ fontSize: 14 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="bmva"
            type="url"
            value={urlDraft}
            placeholder="…or paste an https:// image URL"
            disabled={disabled || room <= 0}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addUrl()
              }
            }}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-heading)',
              minHeight: 44, padding: '0 14px', background: 'var(--surface-card)',
              border: '1px solid var(--border-default)', borderRadius: 11,
              flex: '1 1 240px', minWidth: 0, boxSizing: 'border-box',
            }}
          />
          <Button variant="secondary" size="sm" disabled={disabled || room <= 0} onClick={addUrl}>
            Add
          </Button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {busy
            ? progress
            : `Recommended ${px(SPEC.recommended)} (${SPEC.ratioLabel}) · at least ${px(SPEC.minimum)} · `
              + `JPEG, PNG or WebP, up to 6 MB each. ${photos.length} of ${MAX_PHOTOS} used`
              + `${photos.length > 1 ? ' · the first photo is the banner' : ''}.`}
        </div>
        {notes.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--warning-700, #9a5502)', fontSize: 13, fontWeight: 600 }}>
            {notes.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
        {photos[0] && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 4 }}>
            <div style={{ width: 220, maxWidth: '100%', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface-card)' }}>
              <ImageFrame kind="poster" src={photos[0]} alt="" radius={0} />
              <div style={{ padding: '8px 10px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-heading)' }}>Customer event card</div>
            </div>
            <div style={{ flex: '1 1 200px', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-heading)' }}>How customers see photo #1.</strong>{' '}
              {sizes[photos[0]] ? `${fitCaption('poster', sizes[photos[0]].width, sizes[photos[0]].height)}.` : ''}
              {' '}Cards are 3:2 on every screen size; a poster that isn’t 3:2 is shown whole on a blurred backdrop, never cut.
            </div>
          </div>
        )}
        {errors.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--error-600)', fontSize: 13, fontWeight: 600 }}>
            {errors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

function IconBtn({ children, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        // 32px keeps four controls on one row under a 140px tile while
        // staying a usable touch target.
        width: 32, height: 32, borderRadius: 8, border: 'none', lineHeight: 1,
        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1, fontSize: 17, fontWeight: 800,
        color: danger ? 'var(--error-600)' : 'var(--navy-800)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}
