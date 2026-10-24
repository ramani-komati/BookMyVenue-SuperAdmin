import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { venueApi } from '@/services/venueApi';
import { adminApi } from '@/services/adminApi';
import { listingFromDraft } from '@/services/listingCompose';
import { DRAFT_ID_KEY, MAX_SERVICE_IMAGES, MAX_VENUE_PHOTOS } from '@/constants/venue';
import { readString, writeString, remove } from '@/utils/storage';
import { toUserMessage } from '@/services/errors';
import { reportError } from '@/utils/reportError';
import useDebouncedCallback from '@/hooks/useDebouncedCallback';
import { blankDraft, PATCH_SECTIONS } from './model';

const tempId = () => `temp_${Math.random().toString(36).slice(2, 9)}`;

// After this many consecutive autosave failures the debounced autosave pauses
// (so a persistent server error isn't hammered on every keystroke); explicit
// flushes — field blur and submit — still retry and reset the counter.
const MAX_SAVE_FAILURES = 3;

// Per-gallery photo caps — a module-level constant so it stays referentially
// stable across renders (used inside the addPhotos useCallback).
const GALLERY_MAX = { venuePhotos: MAX_VENUE_PHOTOS, serviceImages: MAX_SERVICE_IMAGES };

/**
 * useVenueDraft — owns the whole draft lifecycle:
 *  - loads an existing draft (by id from localStorage) on mount, or starts blank
 *  - keeps basics/location/details/payout as separate state objects
 *  - autosaves changed sections (debounced ~800ms, or immediately on blur)
 *  - uploads/deletes photos through dedicated API calls
 *  - tracks the "Saving…/Saved" status and completion %
 *  - submits and clears the draft
 *
 * Components consume this via VenueDraftContext — never call venueApi directly.
 */
export default function useVenueDraft() {
  const initial = useMemo(() => blankDraft(), []);
  const [basics, setBasics] = useState(initial.basics);
  const [location, setLocation] = useState(initial.location);
  const [details, setDetails] = useState(initial.details);
  const [payout, setPayout] = useState(initial.payout);
  const [photos, setPhotos] = useState(initial.photos);

  const [draftId, setDraftId] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState(''); // human-readable reason for the last failed save
  const saveErrorRef = useRef(''); // same value, readable synchronously after an await
  const [savedAt, setSavedAt] = useState(null);
  const [completion, setCompletion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Refs for stable access inside async callbacks.
  const draftIdRef = useRef(null);
  const creatingRef = useRef(null);
  const dirtyRef = useRef(new Set());
  const inflightRef = useRef(0);
  const saveFailuresRef = useRef(0);
  const sectionsRef = useRef({ basics, location, details, payout });

  // Keep a live snapshot of section data for flush-time reads.
  useEffect(() => {
    sectionsRef.current = { basics, location, details, payout };
  }, [basics, location, details, payout]);

  const setters = useMemo(
    () => ({ basics: setBasics, location: setLocation, details: setDetails, payout: setPayout }),
    [],
  );

  // ---- Load on mount -------------------------------------------------------
  // Admin registration always starts fresh: the impersonation token is bound to
  // the owner just resolved, so a draft id persisted from a previous owner must
  // never resume. (No cross-session draft resume in the admin flow.)
  useEffect(() => {
    remove(DRAFT_ID_KEY);
    setLoadState('ready');
  }, []);

  // ---- Save status helpers -------------------------------------------------
  const beginSave = useCallback(() => {
    inflightRef.current += 1;
    setSaveStatus('saving');
  }, []);

  const endSave = useCallback((ok) => {
    inflightRef.current = Math.max(0, inflightRef.current - 1);
    if (inflightRef.current === 0) setSaveStatus(ok ? 'saved' : 'error');
  }, []);

  // ---- Ensure a draft exists (create on first change) ----------------------
  const ensureDraft = useCallback(async () => {
    if (draftIdRef.current) return draftIdRef.current;
    if (creatingRef.current) return creatingRef.current;
    creatingRef.current = (async () => {
      const res = await venueApi.createDraft(sectionsRef.current);
      draftIdRef.current = res.draftId;
      setDraftId(res.draftId);
      writeString(DRAFT_ID_KEY, res.draftId);
      setCompletion(res.completion ?? 0);
      setSavedAt(res.savedAt || null);
      return res.draftId;
    })();
    try {
      return await creatingRef.current;
    } finally {
      creatingRef.current = null;
    }
  }, []);

  // ---- Autosave dirty sections --------------------------------------------
  const noteSaveError = useCallback((err) => {
    const msg = toUserMessage(err);
    saveErrorRef.current = msg;
    setSaveError(msg);
  }, []);

  /**
   * Persist every dirty section. Returns true when everything saved.
   * `strict` (submit path) sends values verbatim so the server validates and
   * names the offending field, instead of the autosave-friendly hold-back.
   */
  const flushDirty = useCallback(async (force = false, strict = false) => {
    const toSave = Array.from(dirtyRef.current);
    if (toSave.length === 0) return true;
    // Repeated failures pause the automatic retries; the sections stay dirty
    // so an explicit flush (blur/submit, force=true) can still save them.
    if (!force && saveFailuresRef.current >= MAX_SAVE_FAILURES) return false;
    // Optimistically clear; failures re-mark so a retry happens on next change.
    dirtyRef.current.clear();
    beginSave();
    let id;
    try {
      id = await ensureDraft();
    } catch (err) {
      saveFailuresRef.current += 1;
      toSave.forEach((s) => dirtyRef.current.add(s));
      noteSaveError(err);
      endSave(false);
      return false;
    }
    // Save each section independently — one rejected section (e.g. a field the
    // server won't accept yet) must not block the others from persisting.
    let last = null;
    let firstErr = null;
    for (const section of toSave) {
      try {
        // eslint-disable-next-line no-await-in-loop
        last = await venueApi.patchDraft(id, section, sectionsRef.current[section], { strict });
      } catch (err) {
        dirtyRef.current.add(section);
        if (!firstErr) firstErr = err;
      }
    }
    if (last) {
      setCompletion(last.completion ?? 0);
      setSavedAt(last.savedAt || null);
    }
    if (firstErr) {
      saveFailuresRef.current += 1;
      if (saveFailuresRef.current === MAX_SAVE_FAILURES) reportError(firstErr, 'Draft autosave failing repeatedly');
      noteSaveError(firstErr);
      endSave(false);
      return false;
    }
    saveFailuresRef.current = 0;
    saveErrorRef.current = '';
    setSaveError('');
    endSave(true);
    return true;
  }, [beginSave, endSave, ensureDraft, noteSaveError]);

  const debouncedFlush = useDebouncedCallback(flushDirty, 800);

  /** Update a single field and schedule an autosave for its section. */
  const setField = useCallback(
    (section, key, value) => {
      if (!PATCH_SECTIONS.includes(section)) return;
      setters[section]((prev) => ({ ...prev, [key]: value }));
      dirtyRef.current.add(section);
      debouncedFlush();
    },
    [setters, debouncedFlush],
  );

  /** Replace an entire section (used for structured edits: packages, sports…). */
  const patchSection = useCallback(
    (section, updater) => {
      if (!PATCH_SECTIONS.includes(section)) return;
      setters[section]((prev) => (typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }));
      dirtyRef.current.add(section);
      debouncedFlush();
    },
    [setters, debouncedFlush],
  );

  /** Flush pending saves immediately (call on field blur). Always retries,
   *  even after repeated autosave failures paused the debounced path. */
  const flushNow = useCallback(() => {
    debouncedFlush.cancel();
    if (dirtyRef.current.size > 0) flushDirty(true);
  }, [debouncedFlush, flushDirty]);

  // ---- Photos --------------------------------------------------------------
  const addPhotos = useCallback(
    async (gallery, fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;
      const max = GALLERY_MAX[gallery] ?? Infinity;
      setPhotoError('');

      let id;
      try {
        id = await ensureDraft();
      } catch (err) {
        setPhotoError(toUserMessage(err));
        setSaveStatus('error');
        return;
      }

      for (const file of files) {
        // Respect the per-gallery cap using the freshest state.
        let allowed = true;
        setPhotos((prev) => {
          if ((prev[gallery] || []).length >= max) {
            allowed = false;
            return prev;
          }
          return prev;
        });
        if (!allowed) break;

        const placeholder = { id: tempId(), name: file.name, url: URL.createObjectURL(file), uploading: true };
        setPhotos((prev) => ({ ...prev, [gallery]: [...(prev[gallery] || []), placeholder] }));
        beginSave();
        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await venueApi.uploadPhoto(id, file, gallery);
          setPhotos((prev) => ({
            ...prev,
            [gallery]: (prev[gallery] || []).map((p) => (p.id === placeholder.id ? res.photo : p)),
          }));
          if (placeholder.url.startsWith('blob:')) URL.revokeObjectURL(placeholder.url);
          setCompletion(res.completion ?? 0);
          setSavedAt(res.savedAt || null);
          endSave(true);
        } catch (err) {
          setPhotos((prev) => ({
            ...prev,
            [gallery]: (prev[gallery] || []).filter((p) => p.id !== placeholder.id),
          }));
          if (placeholder.url.startsWith('blob:')) URL.revokeObjectURL(placeholder.url);
          setPhotoError(`"${file.name}" couldn't be uploaded — ${toUserMessage(err)}`);
          endSave(false);
        }
      }
    },
    [beginSave, endSave, ensureDraft],
  );

  const removePhoto = useCallback(
    async (gallery, photoId) => {
      const id = draftIdRef.current;
      // Optimistic removal with rollback on failure.
      let removed;
      setPhotos((prev) => {
        removed = (prev[gallery] || []).find((p) => p.id === photoId);
        return { ...prev, [gallery]: (prev[gallery] || []).filter((p) => p.id !== photoId) };
      });
      if (!id || !removed || removed.uploading) return;
      beginSave();
      try {
        const res = await venueApi.deletePhoto(id, photoId, gallery);
        setCompletion(res.completion ?? 0);
        setSavedAt(res.savedAt || null);
        endSave(true);
      } catch {
        setPhotos((prev) => ({ ...prev, [gallery]: [...(prev[gallery] || []), removed] }));
        endSave(false);
      }
    },
    [beginSave, endSave],
  );

  // ---- Submit / clear ------------------------------------------------------
  const submit = useCallback(async () => {
    const id = draftIdRef.current;
    if (!id) return { ok: false, reason: 'no-draft' };
    setSubmitting(true);
    try {
      // Re-send every section (not just dirty ones) so the server-side draft
      // matches exactly what the wizard shows before it validates the gates.
      // Strict mode: the server sees values verbatim and can name any invalid
      // field, instead of the autosave hold-back silently omitting it.
      PATCH_SECTIONS.forEach((s) => dirtyRef.current.add(s));
      const flushed = await flushDirty(true, true);
      if (!flushed) return { ok: false, reason: 'save-failed', message: saveErrorRef.current };
      const res = await venueApi.submitDraft(id);
      if (res.status === 'pending') {
        // Admin registration goes LIVE immediately (no approval queue): publish
        // the composed listing on the owner's behalf via the impersonation
        // token, then flip it live. A publish/flip failure surfaces to the
        // still-open wizard (it falls through to the catch below).
        const record = await venueApi.publishListing(
          listingFromDraft(id, { ...sectionsRef.current, photos }),
        );
        if (record?.id) await adminApi.updateVenue(record.id, { status: 'live' });
        setSubmitted(true);
        remove(DRAFT_ID_KEY);
      }
      return { ok: true };
    } catch (err) {
      setSaveStatus('error');
      return { ok: false, reason: 'submit-failed', error: err };
    } finally {
      setSubmitting(false);
    }
  }, [flushDirty, photos]);

  const clear = useCallback(async () => {
    const id = draftIdRef.current;
    debouncedFlush.cancel();
    dirtyRef.current.clear();
    // Revoke any live object URLs before dropping state.
    Object.values(photos).forEach((list) =>
      (list || []).forEach((p) => p?.url?.startsWith('blob:') && URL.revokeObjectURL(p.url)),
    );
    try {
      if (id) await venueApi.deleteDraft(id);
    } catch {
      /* even if the server call fails, reset the local form */
    }
    remove(DRAFT_ID_KEY);
    draftIdRef.current = null;
    const fresh = blankDraft();
    setBasics(fresh.basics);
    setLocation(fresh.location);
    setDetails(fresh.details);
    setPayout(fresh.payout);
    setPhotos(fresh.photos);
    setDraftId(null);
    setCompletion(0);
    setSavedAt(null);
    setSaveStatus('idle');
    setSaveError('');
    saveErrorRef.current = '';
    setSubmitted(false);
    setPhotoError('');
    saveFailuresRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFlush]);

  return {
    // data
    draft: { basics, location, details, payout, photos },
    draftId,
    loadState,
    saveStatus,
    saveError,
    savedAt,
    completion,
    submitting,
    submitted,
    photoError,
    // actions
    setField,
    patchSection,
    flushNow,
    addPhotos,
    removePhoto,
    submit,
    clear,
  };
}
