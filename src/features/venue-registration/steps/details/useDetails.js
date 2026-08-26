import { useMemo } from 'react';
import { SPORT_CFG_DEFAULT } from '@/constants/venue';
import { useVenueDraftContext } from '../../context/VenueDraftContext';

/**
 * useDetails — typed actions over the `details` section so the sub-panels stay
 * declarative. Simple fields autosave (debounced) via setField; structured
 * edits go through patchSection with an immutable updater.
 */
export default function useDetails() {
  const { draft, setField, patchSection, flushNow, currentErrors, currentSection } =
    useVenueDraftContext();
  const details = draft.details;
  // Memoized so the value stays referentially stable while off the details step
  // (otherwise a fresh {} each render would defeat the useMemo below).
  const errors = useMemo(
    () => (currentSection === 'details' ? currentErrors : {}),
    [currentSection, currentErrors],
  );

  return useMemo(() => {
    const set = (key, value) => setField('details', key, value);
    const patch = (updater) => patchSection('details', updater);

    return {
      details,
      errors,
      flushNow,
      set,
      patch,

      toggleBool: (key) => patch((prev) => ({ ...prev, [key]: !prev[key] })),

      toggleInMap: (mapKey, k) =>
        patch((prev) => ({ ...prev, [mapKey]: { ...prev[mapKey], [k]: !prev[mapKey]?.[k] } })),

      // Screen / unit capacity config (Private Hall, Resort, Theatres)
      setScreenField: (idx, key, value) =>
        patch((prev) => ({
          ...prev,
          screenConfig: {
            ...prev.screenConfig,
            [idx]: { ...(prev.screenConfig?.[idx] || { max: '', price: '' }), [key]: value },
          },
        })),

      // Pricing packages (array)
      addPackage: () =>
        patch((prev) => ({
          ...prev,
          packages: [
            ...prev.packages,
            { label: '', details: '', price: '', duration: '', chargePerHour: false, maxPersons: '' },
          ],
        })),
      removePackage: (i) =>
        patch((prev) => ({ ...prev, packages: prev.packages.filter((_, j) => j !== i) })),
      updatePackage: (i, key, value) =>
        patch((prev) => ({
          ...prev,
          packages: prev.packages.map((p, j) => (j === i ? { ...p, [key]: value } : p)),
        })),

      // Offers / coupons (array)
      addOffer: () =>
        patch((prev) => ({
          ...prev,
          offers: [
            ...(prev.offers || []),
            { title: '', code: '', type: 'percent', value: '', minAmount: '', maxDiscount: '', expiry: '' },
          ],
        })),
      removeOffer: (i) =>
        patch((prev) => ({ ...prev, offers: (prev.offers || []).filter((_, j) => j !== i) })),
      updateOffer: (i, key, value) =>
        patch((prev) => ({
          ...prev,
          offers: (prev.offers || []).map((o, j) => (j === i ? { ...o, [key]: value } : o)),
        })),

      // Amenities (array)
      addAmenity: (val) =>
        patch((prev) => ({ ...prev, amenities: [...prev.amenities, val] })),
      removeAmenity: (i) =>
        patch((prev) => ({ ...prev, amenities: prev.amenities.filter((_, j) => j !== i) })),

      // Add-ons
      setAddonPrice: (key, value) =>
        patch((prev) => ({ ...prev, addonPrices: { ...prev.addonPrices, [key]: value } })),
      addCustomAddon: () =>
        patch((prev) => ({ ...prev, customAddons: [...prev.customAddons, { name: '', price: '' }] })),
      removeCustomAddon: (i) =>
        patch((prev) => ({ ...prev, customAddons: prev.customAddons.filter((_, j) => j !== i) })),
      updateCustomAddon: (i, key, value) =>
        patch((prev) => ({
          ...prev,
          customAddons: prev.customAddons.map((c, j) => (j === i ? { ...c, [key]: value } : c)),
        })),

      // Per-sport pricing config
      setSportField: (sport, key, value) =>
        patch((prev) => ({
          ...prev,
          sportConfig: {
            ...prev.sportConfig,
            [sport]: { ...(prev.sportConfig?.[sport] || SPORT_CFG_DEFAULT), [key]: value },
          },
        })),
      setSportUnit: (sport, kind, idx, value) =>
        patch((prev) => {
          const cur = prev.sportConfig?.[sport] || SPORT_CFG_DEFAULT;
          return {
            ...prev,
            sportConfig: {
              ...prev.sportConfig,
              [sport]: { ...cur, [kind]: { ...(cur[kind] || {}), [idx]: value } },
            },
          };
        }),
    };
  }, [details, errors, setField, patchSection, flushNow]);
}
