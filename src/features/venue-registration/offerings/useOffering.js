import { useMemo } from 'react';
import { useVenueDraftContext } from '../context/VenueDraftContext';
import useDetails from '../steps/details/useDetails';
import { blockOf } from './model';

/**
 * useOffering(kind) — typed edits over the draft's details.<kind> block
 * (fitness / resort / surprise). Every edit goes through the wizard's own
 * patchSection, so autosave, the save indicator and validation work exactly
 * as for every other field.
 *
 * Business documents live in the PRIVATE payout section; `payoutEditable`
 * is false on screens that cannot save it (the super admin's All venues →
 * Edit, which refuses bank / KYC fields by design).
 */
export default function useOffering(kind) {
  const { details, errors, patch, flushNow, toggleInMap } = useDetails();
  const ctx = useVenueDraftContext();
  const block = blockOf(details, kind);

  return useMemo(() => {
    const update = (updater) =>
      patch((prev) => ({ ...prev, [kind]: updater(blockOf(prev, kind)) }));
    const set = (key, value) => update((b) => ({ ...b, [key]: value }));
    const setIn = (group, key, value) => update((b) => ({ ...b, [group]: { ...(b[group] || {}), [key]: value } }));
    const updateRow = (list, id, changes) =>
      update((b) => ({ ...b, [list]: (b[list] || []).map((r) => (r.id === id ? { ...r, ...changes } : r)) }));
    const addRow = (list, row) => update((b) => ({ ...b, [list]: [...(b[list] || []), row] }));
    const removeRow = (list, id) => update((b) => ({ ...b, [list]: (b[list] || []).filter((r) => r.id !== id) }));
    const err = (key) => errors[`${kind}.${key}`];
    const payout = ctx.draft?.payout || {};
    const payoutEditable = ctx.payoutEditable !== false && typeof ctx.setField === 'function';
    const setPayout = (key, value) => {
      if (payoutEditable) ctx.setField('payout', key, value);
    };
    return {
      details, block, errors, err, flushNow, toggleInMap,
      update, set, setIn, updateRow, addRow, removeRow,
      setAmenities: (list) => patch((prev) => ({ ...prev, amenities: list })),
      photos: ctx.draft?.photos || {},
      addPhotos: ctx.addPhotos,
      removePhoto: ctx.removePhoto,
      payout, payoutEditable, setPayout,
    };
  }, [kind, details, block, errors, patch, flushNow, toggleInMap, ctx]);
}
