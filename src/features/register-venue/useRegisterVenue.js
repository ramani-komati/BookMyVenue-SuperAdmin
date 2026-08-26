import { useCallback, useRef, useState } from 'react'
import { adminApi } from '@/services/adminApi'
import { registerApi, setVendorToken } from '@/services/registerApi'
import { listingFromDraft } from '@/services/listingCompose'
import { ApiError, toUserMessage } from '@/services/errors'
import { blankDraft, PATCH_SECTIONS } from './model'
import { MAX_VENUE_PHOTOS, MAX_SERVICE_IMAGES } from '@/constants/venue'

const GALLERY_MAX = { venuePhotos: MAX_VENUE_PHOTOS, serviceImages: MAX_SERVICE_IMAGES }
const tempId = () => `temp_${Math.random().toString(36).slice(2, 9)}`
const digitsOf = (v) => String(v ?? '').replace(/\D/g, '')

/**
 * useRegisterVenue — drives the admin "register a venue for an owner" flow:
 *   1. resolve owner by phone → vendor JWT (impersonation)
 *   2. fill the same sections the vendor wizard uses (basics/location/details/
 *      payout/photos)
 *   3. publish → the listing is composed exactly like the vendor flow, then
 *      flipped LIVE immediately (no approval queue)
 */
export default function useRegisterVenue() {
  const [phase, setPhase] = useState('owner') // owner | form | done
  const [owner, setOwner] = useState(null) // { vendor, created }
  const [resolving, setResolving] = useState(false)
  const [ownerError, setOwnerError] = useState('')

  const initial = blankDraft()
  const [basics, setBasics] = useState(initial.basics)
  const [location, setLocation] = useState(initial.location)
  const [details, setDetails] = useState(initial.details)
  const [payout, setPayout] = useState(initial.payout)
  const [photos, setPhotos] = useState(initial.photos)

  const [photoError, setPhotoError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [published, setPublished] = useState(null) // the live listing record

  const setters = { basics: setBasics, location: setLocation, details: setDetails, payout: setPayout }
  const sections = { basics, location, details, payout }
  const sectionsRef = useRef(sections)
  sectionsRef.current = sections

  const draftIdRef = useRef(null)
  const creatingRef = useRef(null)

  // ---- Step 0: resolve the owner by phone → impersonation token ------------
  const resolveOwner = useCallback(async (phoneInput, nameInput) => {
    const phone = digitsOf(phoneInput)
    setOwnerError('')
    if (phone.length !== 10) {
      setOwnerError('Enter a valid 10-digit mobile number.')
      return
    }
    setResolving(true)
    try {
      const res = await adminApi.impersonateVendor({ phone, name: (nameInput || '').trim() || undefined })
      setVendorToken(res?.token || null)
      setOwner({ vendor: res?.vendor || { phone }, created: Boolean(res?.created) })
      // Seed the owner phone onto the venue's contact so listing composition has it.
      setBasics((prev) => ({ ...prev, phone: res?.vendor?.phone || phone }))
      setPhase('form')
    } catch (err) {
      // Log the full error (status + backend detail) so a masked failure is
      // diagnosable from the console, not just the surfaced message.
      console.error('register-venue: resolveOwner failed', err?.status, err)
      setOwnerError(toUserMessage(err))
    } finally {
      setResolving(false)
    }
  }, [])

  // ---- Draft plumbing ------------------------------------------------------
  const ensureDraft = useCallback(async () => {
    if (draftIdRef.current) return draftIdRef.current
    if (creatingRef.current) return creatingRef.current
    creatingRef.current = (async () => {
      const res = await registerApi.createDraft(sectionsRef.current)
      draftIdRef.current = res.draftId
      return res.draftId
    })()
    try {
      return await creatingRef.current
    } finally {
      creatingRef.current = null
    }
  }, [])

  const setField = useCallback((section, key, value) => {
    if (!PATCH_SECTIONS.includes(section)) return
    setters[section]((prev) => ({ ...prev, [key]: value }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patchSection = useCallback((section, updater) => {
    if (!PATCH_SECTIONS.includes(section)) return
    setters[section]((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Photos (need a draft to upload against) -----------------------------
  const addPhotos = useCallback(async (gallery, fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    const max = GALLERY_MAX[gallery] ?? Infinity
    setPhotoError('')

    let id
    try {
      id = await ensureDraft()
    } catch (err) {
      setPhotoError(toUserMessage(err))
      return
    }

    for (const file of files) {
      let allowed = true
      setPhotos((prev) => {
        if ((prev[gallery] || []).length >= max) allowed = false
        return prev
      })
      if (!allowed) break

      const placeholder = { id: tempId(), name: file.name, url: URL.createObjectURL(file), uploading: true }
      setPhotos((prev) => ({ ...prev, [gallery]: [...(prev[gallery] || []), placeholder] }))
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await registerApi.uploadPhoto(id, file, gallery)
        setPhotos((prev) => ({
          ...prev,
          [gallery]: (prev[gallery] || []).map((p) => (p.id === placeholder.id ? res.photo : p)),
        }))
        if (placeholder.url.startsWith('blob:')) URL.revokeObjectURL(placeholder.url)
      } catch (err) {
        setPhotos((prev) => ({ ...prev, [gallery]: (prev[gallery] || []).filter((p) => p.id !== placeholder.id) }))
        if (placeholder.url.startsWith('blob:')) URL.revokeObjectURL(placeholder.url)
        setPhotoError(`"${file.name}" couldn't be uploaded — ${toUserMessage(err)}`)
      }
    }
  }, [ensureDraft])

  const removePhoto = useCallback(async (gallery, photoId) => {
    const id = draftIdRef.current
    let removed
    setPhotos((prev) => {
      removed = (prev[gallery] || []).find((p) => p.id === photoId)
      return { ...prev, [gallery]: (prev[gallery] || []).filter((p) => p.id !== photoId) }
    })
    if (!id || !removed || removed.uploading) return
    try {
      await registerApi.deletePhoto(id, photoId, gallery)
    } catch {
      setPhotos((prev) => ({ ...prev, [gallery]: [...(prev[gallery] || []), removed] }))
    }
  }, [])

  // ---- Publish: save → submit → publish listing → flip LIVE ----------------
  const publish = useCallback(async () => {
    setPublishError('')
    setPublishing(true)
    try {
      const id = await ensureDraft()
      // Save every section verbatim (strict) so the server validates and names
      // any bad/missing field before the submit gates run.
      for (const section of PATCH_SECTIONS) {
        // eslint-disable-next-line no-await-in-loop
        await registerApi.patchDraft(id, section, sectionsRef.current[section], { strict: true })
      }
      await registerApi.submitDraft(id) // flips the draft to "pending" + runs completion gates
      const listing = listingFromDraft(id, { ...sectionsRef.current, photos })
      await registerApi.publishListing(listing) // creates the (pending) listing owned by the vendor
      // Admin-registered → skip the queue: approve to live immediately.
      await adminApi.updateVenue(listing.id, { status: 'live' })
      const liveListing = { ...listing, status: 'live' }
      setPublished(liveListing)
      setPhase('done')
      return { ok: true, listing: liveListing }
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 400
          ? err.message || 'Some required details are missing or invalid — please review the form.'
          : toUserMessage(err)
      setPublishError(msg)
      return { ok: false, error: err }
    } finally {
      setPublishing(false)
    }
  }, [ensureDraft, photos])

  const reset = useCallback(() => {
    setVendorToken(null)
    draftIdRef.current = null
    setOwner(null)
    setOwnerError('')
    const fresh = blankDraft()
    setBasics(fresh.basics)
    setLocation(fresh.location)
    setDetails(fresh.details)
    setPayout(fresh.payout)
    setPhotos(fresh.photos)
    setPhotoError('')
    setPublishError('')
    setPublished(null)
    setPhase('owner')
  }, [])

  return {
    phase,
    owner,
    resolving,
    ownerError,
    resolveOwner,
    draft: { basics, location, details, payout, photos },
    setField,
    patchSection,
    addPhotos,
    removePhoto,
    photoError,
    publishing,
    publishError,
    published,
    publish,
    reset,
  }
}
