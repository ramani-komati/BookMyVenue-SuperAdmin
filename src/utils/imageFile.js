// Browser helpers for images an admin is about to upload.

/** Natural { width, height } of an image file, or null when unreadable. */
export function readImageSize(file) {
  return new Promise((resolve) => {
    if (!file || typeof URL === 'undefined') {
      resolve(null)
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
