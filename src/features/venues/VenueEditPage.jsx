import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext.jsx'
import { adminApi } from '../../services/adminApi.js'
import Button from '../../components/ui/Button.jsx'
import Icon from '../../components/ui/Icon.jsx'
import { MAX_SERVICE_IMAGES, MAX_VENUE_PHOTOS } from '../../constants/venue.js'
import { VenueDraftContext } from '../venue-registration/context/VenueDraftContext.jsx'
import BasicInfoStep from '../venue-registration/steps/BasicInfoStep.jsx'
import LocationStep from '../venue-registration/steps/LocationStep.jsx'
import PhotosStep from '../venue-registration/steps/PhotosStep.jsx'
import DetailsStep from '../venue-registration/steps/DetailsStep.jsx'
import {
  EDIT_TABS, editErrors, editRequest, firstInvalidTab, majorChanges, makeCover, movePhoto as movedPhotos,
  pinChanged, pinKey, removedPhotos, sectionsForEdit,
} from './venueEdit.js'
import AdminLocationPanel from './AdminLocationPanel.jsx'
import { ChangeHistory, RemovedPhotosPanel } from './VenueEditHistory.jsx'
import '@/reg-ui/reg-components.css'
import '../venue-registration/venue-registration.css'

const STEP_FOR = { basics: BasicInfoStep, location: LocationStep, photos: PhotosStep, details: DetailsStep }
const GALLERY_MAX = { venuePhotos: MAX_VENUE_PHOTOS, serviceImages: MAX_SERVICE_IMAGES, auditoriumImages: 5, screenImages: 5, theatreLogo: 1 }

const STATUS_LABEL = {
  live: 'Live', paused: 'Paused', pending: 'Pending approval', rejected: 'Rejected', draft: 'Draft',
  deletion_requested: 'Deletion requested', changes: 'Changes requested',
}

/**
 * VenueEditPage — All venues → Edit. The super admin edits every detail a
 * vendor submitted (name, description, category, address, contact, Venue
 * Timings, capacity, pricing, amenities, parking/dining, photos …) with the
 * SAME form the registration uses, fed from local state instead of the
 * vendor's autosaving draft. Nothing saves until "Save changes".
 *
 * Bank / payout details are not part of this form at all: the server never
 * sends them here and refuses any request that carries them
 * (backend adminpanel/venue_edit.py). The save updates the vendor's draft and
 * the published listing together, so the vendor portal shows the change and
 * its republish can't revert it.
 */
export default function VenueEditPage() {
  const { venueId } = useParams()
  const navigate = useNavigate()
  const { setVenues, showToast, openModal } = useAdmin()

  const [state, setState] = useState('loading')          // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [payload, setPayload] = useState(null)
  const [sections, setSections] = useState(null)
  const savedJson = useRef('')
  const [tab, setTab] = useState('basics')
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)       // { message, code }
  const [photoError, setPhotoError] = useState('')
  // The pin (pinKey) the admin confirmed on the map — see AdminLocationPanel.
  const [confirmedPin, setConfirmedPin] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    setLoadError('')
    try {
      const data = await adminApi.getVenueEdit(venueId)
      const next = sectionsForEdit(data)
      setPayload(data)
      setSections(next)
      savedJson.current = JSON.stringify(next)
      setSaveError(null)
      setShowErrors(false)
      setConfirmedPin(null)
      setState('ready')
    } catch (err) {
      setLoadError(err.message || 'Could not load this venue.')
      setState('error')
    }
  }, [venueId])

  useEffect(() => { load() }, [load])

  const errors = useMemo(() => (sections ? editErrors(sections) : null), [sections])
  const dirty = sections ? JSON.stringify(sections) !== savedJson.current : false

  // ---- the draft-context surface the registration steps read -------------
  const setField = useCallback((section, key, value) => {
    setSections((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }))
  }, [])
  const patchSection = useCallback((section, updater) => {
    setSections((prev) => ({
      ...prev,
      [section]: typeof updater === 'function' ? updater(prev[section]) : { ...prev[section], ...updater },
    }))
  }, [])

  const addPhotos = useCallback(async (gallery, fileList) => {
    const files = Array.from(fileList || [])
    setPhotoError('')
    for (const file of files) {
      const id = `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      let allowed = true
      setSections((prev) => {
        if ((prev.photos[gallery] || []).length >= (GALLERY_MAX[gallery] ?? Infinity)) {
          allowed = false
          return prev
        }
        const preview = typeof URL !== 'undefined' ? URL.createObjectURL(file) : ''
        return { ...prev, photos: { ...prev.photos, [gallery]: [...prev.photos[gallery], { id, url: preview, uploading: true }] } }
      })
      if (!allowed) {
        setPhotoError(`You can keep at most ${GALLERY_MAX[gallery]} photos here.`)
        break
      }
      try {
        // Same hosted bucket as venue photos; the server checks the image.
        const { url } = await adminApi.uploadImage(file)
        setSections((prev) => ({
          ...prev,
          photos: { ...prev.photos, [gallery]: prev.photos[gallery].map((p) => (p.id === id ? { id, url } : p)) },
        }))
      } catch (err) {
        setSections((prev) => ({
          ...prev,
          photos: { ...prev.photos, [gallery]: prev.photos[gallery].filter((p) => p.id !== id) },
        }))
        setPhotoError(err.message || 'That photo could not be uploaded.')
      }
    }
  }, [])
  const dropPhoto = useCallback((gallery, id) => {
    setSections((prev) => ({ ...prev, photos: { ...prev.photos, [gallery]: prev.photos[gallery].filter((p) => p.id !== id) } }))
  }, [])
  // Removing asks first. Nothing is deleted from storage: the photo leaves
  // the venue on Save, and the change history keeps it for restoring.
  const removePhoto = useCallback((gallery, id) => {
    const photo = sections?.photos?.[gallery]?.find((p) => p.id === id)
    if (!photo || photo.uploading) return dropPhoto(gallery, id)
    const isCover = gallery === 'venuePhotos' && sections.photos.venuePhotos[0]?.id === id
    openModal({
      title: 'Remove this photo?',
      body: (
        <span style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <img src={photo.url} alt="" style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 8, flex: '0 0 auto' }} />
          <span>
            {isCover ? 'This is the cover photo — the next photo becomes the cover. ' : ''}
            It comes off the venue when you save. The file itself isn’t deleted, and the change history keeps it so it can be restored.
          </span>
        </span>
      ),
      confirmLabel: 'Remove photo',
      danger: true,
      onConfirm: () => dropPhoto(gallery, id),
    })
  }, [sections, openModal, dropPhoto])
  const movePhoto = useCallback((gallery, id, delta) => {
    setSections((prev) => ({ ...prev, photos: { ...prev.photos, [gallery]: movedPhotos(prev.photos[gallery], id, delta) } }))
  }, [])
  const makeCoverPhoto = useCallback((gallery, id) => {
    setSections((prev) => ({ ...prev, photos: { ...prev.photos, [gallery]: makeCover(prev.photos[gallery], id) } }))
  }, [])
  const restorePhoto = useCallback(({ gallery, url }) => {
    const target = gallery in GALLERY_MAX ? gallery : 'venuePhotos'
    setPhotoError('')
    setSections((prev) => {
      const list = prev.photos[target] || []
      if (list.some((p) => p.url === url)) return prev
      if (list.length >= (GALLERY_MAX[target] ?? Infinity)) {
        setPhotoError(`This gallery is full (${GALLERY_MAX[target]} photos) — remove one before restoring.`)
        return prev
      }
      const id = `restored-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      return { ...prev, photos: { ...prev.photos, [target]: [...list, { id, url }] } }
    })
  }, [])

  const ctx = useMemo(() => (sections ? {
    draft: sections,
    setField,
    patchSection,
    flushNow: () => {},              // nothing autosaves here
    currentSection: tab,
    currentErrors: showErrors ? errors?.[tab] || {} : {},
    addPhotos,
    removePhoto,
    movePhoto,
    makeCoverPhoto,
    photoError,
    // Business documents ride in the bank section, which this page never
    // loads or saves (venue_edit.py refuses it) — the offering panels hide them.
    payoutEditable: false,
    adminEdit: true,
  } : null), [sections, setField, patchSection, tab, showErrors, errors, addPhotos, removePhoto, movePhoto, makeCoverPhoto, photoError])

  const locationMoved = sections && payload ? pinChanged(payload.location?.coordinates, sections.location) : false
  const locationConfirmed = locationMoved && confirmedPin === pinKey(sections.location)

  const uploading = sections
    ? [...sections.photos.venuePhotos, ...sections.photos.serviceImages].some((p) => p.uploading)
    : false

  const save = () => {
    if (saving || !sections) return
    const bad = firstInvalidTab(errors)
    if (bad) {
      setShowErrors(true)
      setTab(bad)
      setSaveError({ message: 'Fix the highlighted fields first.', code: 'INVALID' })
      return
    }
    if (locationMoved && !locationConfirmed) {
      setTab('location')
      setSaveError({ message: 'This changes where the venue is on the map. Check the map preview and tick the confirmation on the Location tab.', code: 'LOCATION_UNCONFIRMED' })
      return
    }
    // Changes customers notice most (name, category, map location, cover,
    // removed photos) are spelled out before they go live.
    const lines = majorChanges(JSON.parse(savedJson.current), sections, payload.location?.coordinates)
    if (!lines.length) {
      commit()
      return
    }
    openModal({
      title: 'Save these changes to the live venue?',
      body: (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Customers see the change right away. Bookings, payments, reviews and the venue’s owner are not affected.
          </span>
        </span>
      ),
      confirmLabel: 'Save changes',
      onConfirm: () => { commit() },
    })
  }

  const commit = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const body = editRequest(venueId, sections, payload.version, { locationConfirmed })
      const data = await adminApi.saveVenueEdit(venueId, body)
      const next = sectionsForEdit(data)
      setPayload(data)
      setSections(next)
      savedJson.current = JSON.stringify(next)
      setShowErrors(false)
      setConfirmedPin(null)
      if (data?.venue?.id) setVenues((list) => list.map((v) => (v.id === data.venue.id ? { ...v, ...data.venue } : v)))
      showToast('Venue details saved')
    } catch (err) {
      setSaveError({ message: err.message || 'Could not save the venue.', code: err.code || '' })
    } finally {
      setSaving(false)
    }
  }

  if (state === 'loading') {
    return <div className="card" style={{ padding: 28, color: 'var(--text-muted)', fontSize: 15 }}>Loading the venue…</div>
  }
  if (state === 'error') {
    return (
      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{loadError}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={load}>Try again</Button>
          <Button variant="ghost" onClick={() => navigate('/all-venues')}>Back to All venues</Button>
        </div>
      </div>
    )
  }

  const venue = payload.venue || {}
  const Step = STEP_FOR[tab]
  const tabHasError = (key) => showErrors && Object.keys(errors?.[key] || {}).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => navigate('/all-venues')}
          style={{ border: 0, background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 700, fontSize: 14.5, padding: 0 }}
        >
          <Icon name="chevron-left" size={18} /> All venues
        </button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-heading)' }}>{venue.name || sections.basics.venueName}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {payload.vendor?.name || 'Vendor'}{payload.vendor?.phone ? ` · +91 ${payload.vendor.phone}` : ''}
            {' · '}{STATUS_LABEL[venue.status] || venue.status || ''}
            {payload.siblingCount ? ` · ${payload.siblingCount + 1} bookable pitches/screens` : ''}
          </div>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: dirty ? 'var(--warning-700, #b45309)' : 'var(--text-muted)' }}>
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>

      <div role="note" className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        <Icon name="lock" size={17} style={{ flex: '0 0 auto', marginTop: 2 }} />
        <span>
          Bank and payout details can’t be edited here — they stay with the vendor’s payout details and are never changed by this form.
          Saving updates the live venue and the vendor’s own copy, so the vendor sees your change.
          {payload.siblingCount ? ' The number of pitches / screens is changed by the vendor.' : ''}
        </span>
      </div>

      <div role="tablist" aria-label="Venue details" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {EDIT_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'var(--font-body)', fontSize: 14.5, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: tab === t.key ? '#fff' : 'var(--text-heading)',
              background: tab === t.key ? 'var(--navy-800)' : 'var(--surface-card)',
              border: `1px solid ${tabHasError(t.key) ? 'var(--error-600)' : tab === t.key ? 'var(--navy-800)' : 'var(--border-default)'}`,
              borderRadius: 999, padding: '8px 14px', minHeight: 40,
            }}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
            {tabHasError(t.key) && <span aria-label="has problems" style={{ color: tab === t.key ? '#fff' : 'var(--error-600)' }}>•</span>}
          </button>
        ))}
      </div>

      <VenueDraftContext.Provider value={ctx}>
        <div className="rv-formcard" role="tabpanel">
          {tab === 'photos' && showErrors && errors.photos.venuePhotos && (
            <div role="alert" style={{ color: 'var(--error-700)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{errors.photos.venuePhotos}</div>
          )}
          {tab === 'location' && (
            <div style={{ marginBottom: 24 }}>
              <AdminLocationPanel
                key={payload.version}
                saved={payload.location}
                venueName={sections.basics.venueName}
                location={sections.location}
                onPatch={(updater) => patchSection('location', updater)}
                confirmedKey={confirmedPin}
                onConfirm={setConfirmedPin}
              />
            </div>
          )}
          {tab === 'photos' && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              The first venue photo is the cover on venue cards and the venue page. Use the arrows or “Make cover” to change the order.
              Each tile shows the customer card’s own crop. Nothing goes live until you save.
            </div>
          )}
          <Step />
          {tab === 'photos' && (
            <RemovedPhotosPanel
              pending={removedPhotos(JSON.parse(savedJson.current), sections)}
              history={payload.revisions || []}
              current={sections.photos}
              onRestore={restorePhoto}
            />
          )}
        </div>
      </VenueDraftContext.Provider>

      <ChangeHistory revisions={payload.revisions || []} />

      {saveError && (
        <div role="alert" className="card" style={{ padding: '12px 16px', color: 'var(--error-700)', fontWeight: 700, fontSize: 14.5, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 200 }}>{saveError.message}</span>
          {saveError.code === 'STALE_VERSION' && <Button variant="secondary" size="sm" onClick={load}>Reload latest</Button>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', position: 'sticky', bottom: 0, padding: '12px 0', background: 'var(--surface-page, transparent)' }}>
        <Button variant="ghost" onClick={() => navigate('/all-venues')}>{dirty ? 'Discard changes' : 'Close'}</Button>
        <Button onClick={save} disabled={saving || uploading || !dirty}>
          {saving ? 'Saving…' : uploading ? 'Uploading photos…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
