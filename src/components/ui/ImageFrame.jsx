import { useState } from 'react'
import { IMAGE_KINDS, fitFor } from '../../utils/imageSpecs.js'

/**
 * ImageFrame — an image drawn exactly as the customer site's MediaFrame
 * draws it (BookMyVenue-frontend src/components/ui/MediaFrame.jsx): a fixed
 * frame shape per `kind` (3:2 cards, 16:9 detail, 2:1 promo, 1:1 thumb),
 * `object-fit: cover` when the image fits, and the WHOLE image over a
 * blurred copy of itself when covering would cut too much away (rule in
 * utils/imageSpecs.js fitFor). So an admin preview shows the real crop.
 *
 * `onSize({ width, height })` reports the image's natural size once loaded.
 */
export default function ImageFrame({ kind = 'listing', src, alt = '', fallback = null, radius = 10, style, onSize, children }) {
  const [size, setSize] = useState(null)
  const [broken, setBroken] = useState(false)
  const frame = IMAGE_KINDS[kind] || IMAGE_KINDS.listing
  const contain = size ? fitFor(kind, size.width, size.height) === 'contain' : false
  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }
  return (
    <div
      style={{
        position: 'relative', width: '100%', aspectRatio: String(frame.frame), overflow: 'hidden',
        borderRadius: radius, background: 'var(--neutral-100, #eef1f5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
        ...style,
      }}
    >
      {src && !broken ? (
        <>
          {contain && (
            <img
              src={src}
              alt=""
              aria-hidden="true"
              style={{ ...fill, inset: -24, width: 'calc(100% + 48px)', height: 'calc(100% + 48px)', objectFit: 'cover', filter: 'blur(20px) saturate(1.15) brightness(.78)' }}
            />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            style={{ ...fill, objectFit: contain ? 'contain' : 'cover', objectPosition: '50% 50%' }}
            onLoad={(e) => {
              const next = { width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }
              setSize(next)
              onSize?.(next)
            }}
            onError={() => setBroken(true)}
          />
        </>
      ) : fallback}
      {children}
    </div>
  )
}
