/**
 * (SuperAdmin copy — keep IDENTICAL to the customer site's
 *  src/utils/imageSpecs.js; `diff` the two files after any change.)
 * Image standards — the one place that says what shape every picture on the
 * site is drawn at, what to upload for it, and how an off-shape image is
 * treated. Pure (no React, no '@/' imports) so `npm test` can exercise it.
 *
 * The frame ratios below are the CSS ratios (tokens.css --media-*); the
 * upload rules mirror the backend (venues/image_specs.py), which checks the
 * same limits again on upload. SuperAdmin keeps an identical copy in
 * src/utils/imageSpecs.js — change all three together.
 *
 * Why these shapes (measured against the live catalogue, 2026-10-25):
 *   - Venue covers ran from 3.25:1 down to 1:1 (median about 1.5), so the
 *     listing card is 3:2: the smallest average crop, and the same shape on
 *     desktop and phones (the old cards switched to 16:9 on phones, so the
 *     same photo was cropped differently per device).
 *   - Event cards share that 3:2 frame so venue and event rows line up, but
 *     an event image is usually a poster with words on it (one live poster
 *     is 1:1), so a poster that doesn't fit is shown WHOLE on a blurred copy
 *     of itself instead of having its text cut off.
 *   - Hero banners are measured from the hero's own CSS (backend
 *     adminpanel/homepage.py hero_frame): 4:1 on desktop, 2:1 on phones.
 */

/**
 * `frame` is width / height of the box the image is drawn in.
 * `minKeep` decides cover vs contain: when `object-fit: cover` would keep
 * less than this share of the image's width or height, the image is drawn
 * whole (contain) over a blurred copy of itself instead.
 */
export const IMAGE_KINDS = {
  listing: {
    label: 'Venue photo',
    frame: 3 / 2,
    frameLabel: '3:2',
    minKeep: 0.66,
    usedAt: 'Venue cards everywhere (home, categories, search, favourites, vendor dashboard)',
  },
  poster: {
    label: 'Event poster / photo',
    frame: 3 / 2,
    frameLabel: '3:2',
    minKeep: 0.9,
    usedAt: 'Event cards (Top events, Events, search)',
  },
  gallery: {
    label: 'Detail page photo',
    frame: 16 / 9,
    frameLabel: '16:9',
    minKeep: 0.8,
    usedAt: 'Venue and event detail pages (large photo + viewer)',
  },
  promo: {
    label: 'Featured promotion card',
    frame: 2 / 1,
    frameLabel: '2:1',
    minKeep: 0.85,
    usedAt: 'Featured promotions on Explore',
  },
  thumb: {
    label: 'Thumbnail',
    frame: 1,
    frameLabel: '1:1',
    minKeep: 0,
    usedAt: 'Small square previews (offers, bookings, dashboard lists)',
  },
};

const MB = 1024 * 1024;
const FORMATS = ['JPEG', 'PNG', 'WebP'];
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * What vendors and admins are asked to upload. `minimum` is a hard refusal
 * (server too); `sharpFrom` and the ratio advice are warnings only.
 * Minimums are orientation-free: the long side ≥ minimum.width and the
 * short side ≥ minimum.height.
 */
export const UPLOAD_SPECS = {
  venuePhoto: {
    kind: 'listing',
    title: 'Venue photos',
    recommended: { width: 1600, height: 1067 },
    sharpFrom: { width: 1200, height: 800 },
    minimum: { width: 400, height: 300 },
    ratioLabel: '3:2 landscape',
    formats: FORMATS,
    mimeTypes: MIME_TYPES,
    maxBytes: 5 * MB,
    advice: 'The first photo is the cover on every card. Shoot landscape and keep the subject in the middle — cards trim a little off the edges.',
  },
  serviceImage: {
    kind: 'listing',
    title: 'Service images',
    recommended: { width: 1600, height: 1067 },
    sharpFrom: { width: 1200, height: 800 },
    minimum: { width: 400, height: 300 },
    ratioLabel: '3:2 landscape',
    formats: FORMATS,
    mimeTypes: MIME_TYPES,
    maxBytes: 5 * MB,
    advice: 'Shown on the venue page under “Our services”.',
  },
  eventPoster: {
    kind: 'poster',
    title: 'Event photos',
    recommended: { width: 1600, height: 1067 },
    sharpFrom: { width: 1200, height: 800 },
    minimum: { width: 400, height: 300 },
    ratioLabel: '3:2 landscape (square posters are fine)',
    formats: FORMATS,
    mimeTypes: MIME_TYPES,
    maxBytes: 5 * MB,
    advice: 'Photo 1 is the poster on the event card. A square or portrait poster is shown whole with blurred edges, never cut — but a 3:2 image fills the card.',
  },
};

export const formatBytes = (bytes) => `${Math.floor(bytes / MB)} MB`;
export const px = (size) => `${size.width}×${size.height}px`;

/**
 * Share of the image `object-fit: cover` keeps in a frame:
 * { width, height } as fractions (1 = all of it).
 */
export function coverKeep(imageW, imageH, frame) {
  if (!(imageW > 0 && imageH > 0 && frame > 0)) return { width: 1, height: 1 };
  const ratio = imageW / imageH;
  if (ratio > frame) return { width: frame / ratio, height: 1 };
  return { width: 1, height: ratio / frame };
}

/** 'cover' | 'contain' for an image of this size drawn as `kind`. */
export function fitFor(kind, imageW, imageH) {
  const spec = IMAGE_KINDS[kind] || IMAGE_KINDS.listing;
  if (!(imageW > 0 && imageH > 0)) return 'cover';
  const keep = coverKeep(imageW, imageH, spec.frame);
  return Math.min(keep.width, keep.height) < spec.minKeep ? 'contain' : 'cover';
}

/** Plain-words description of how a `kind` frame shows this image. */
export function fitCaption(kind, imageW, imageH) {
  const spec = IMAGE_KINDS[kind] || IMAGE_KINDS.listing;
  if (!(imageW > 0 && imageH > 0)) return '';
  if (fitFor(kind, imageW, imageH) === 'contain') {
    return imageW / imageH > spec.frame
      ? 'Shown whole, with blurred bands above and below'
      : 'Shown whole, with blurred bands at the sides';
  }
  const keep = coverKeep(imageW, imageH, spec.frame);
  if (keep.width < 0.995) return `Fills the card · shows the middle ${Math.round(keep.width * 100)}% of the width`;
  if (keep.height < 0.995) return `Fills the card · shows the middle ${Math.round(keep.height * 100)}% of the height`;
  return 'Fills the card exactly';
}

/**
 * Check one image against an upload spec — the same rules the server
 * applies. `problem` blocks the upload; `warnings` are advice. Size and
 * type can be checked before the dimensions are known (pass width/height
 * as undefined); the dimension rules then wait.
 */
export function checkUpload(specKey, { width, height, bytes, type } = {}) {
  const spec = UPLOAD_SPECS[specKey];
  if (!spec) return { problem: 'Unknown image type.', warnings: [] };
  if (type && !spec.mimeTypes.includes(type)) {
    return { problem: `Use a ${spec.formats.join(', ')} image.`, warnings: [] };
  }
  if (bytes != null && bytes > spec.maxBytes) {
    return {
      problem: `This file is ${(bytes / MB).toFixed(1)} MB — the limit is ${formatBytes(spec.maxBytes)}. Export it as a compressed JPEG or WebP.`,
      warnings: [],
    };
  }
  if (!(width > 0 && height > 0)) return { problem: '', warnings: [] };
  if (width > 8000 || height > 8000) {
    return { problem: 'Images larger than 8000px on a side are not accepted — resize it first.', warnings: [] };
  }
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  if (long < spec.minimum.width || short < spec.minimum.height) {
    return {
      problem: `This image is ${width}×${height}px — too small to stay sharp on a card. Use at least ${px(spec.minimum)} (recommended ${px(spec.recommended)}).`,
      warnings: [],
    };
  }
  const warnings = [];
  const caption = fitCaption(spec.kind, width, height);
  const keep = coverKeep(width, height, IMAGE_KINDS[spec.kind].frame);
  if (fitFor(spec.kind, width, height) === 'contain') {
    warnings.push(`${width}×${height} is far from ${spec.ratioLabel}. ${caption} on cards.`);
  } else if (Math.min(keep.width, keep.height) < 0.85) {
    warnings.push(`${width}×${height} isn’t ${spec.ratioLabel}. Cards trim the edges — ${caption.split(' · ')[1]}.`);
  }
  if (long < spec.sharpFrom.width || short < spec.sharpFrom.height) {
    warnings.push(`${width}×${height} may look soft on large screens; ${px(spec.sharpFrom)} or more stays sharp.`);
  }
  return { problem: '', warnings };
}

/** The one-line guidance shown beside an upload control. */
export function uploadGuidance(specKey) {
  const spec = UPLOAD_SPECS[specKey];
  if (!spec) return '';
  return `Recommended ${px(spec.recommended)} (${spec.ratioLabel}) · ${spec.formats.join(', ')} · up to ${formatBytes(spec.maxBytes)} each · at least ${px(spec.minimum)}`;
}
