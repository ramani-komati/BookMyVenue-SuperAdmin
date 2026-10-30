import { HALL_SUBCATS } from '@/constants/venue';
import { draftCustomNames, selectedSports } from '@/constants/subcategories';
import { OTHERS, VENUE_TYPES } from '@/constants/categories';

/**
 * autoDescribe — builds a readable venue blurb from the entered fields.
 * Used when "Auto-generate description" is switched on.
 */
export default function autoDescribe(draft) {
  const b = draft.basics || {};
  const l = draft.location || {};
  const d = draft.details || {};
  const cat = d.primaryCategory || '';
  // How a sentence names the venue type ("a sports venue", not "a playzone").
  const noun = (cat === OTHERS ? d.customCategory : VENUE_TYPES[cat]?.noun) || 'venue';
  const loc = [l.area, l.city].filter(Boolean).join(', ');
  const parts = [];

  parts.push(`${b.venueName || 'This venue'} is ${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun.toLowerCase()}${loc ? ` located in ${loc}` : ''}.`);
  if (b.shortDescription) parts.push(b.shortDescription.trim());
  if (d.seatingCapacity) {
    parts.push(`It comfortably hosts ${d.seatingCapacity} ${cat === 'Playzone' ? 'people' : 'seated guests'}.`);
  }
  if (cat === 'Playzone') {
    const sp = selectedSports(d);
    if (sp.length) parts.push(`Perfect for ${sp.join(', ').toLowerCase()}.`);
  } else if (cat === 'Private Hall') {
    const su = [...HALL_SUBCATS, ...draftCustomNames(d)].filter((s) => d.subCategories?.[s]);
    if (su.length) parts.push(`Great for ${su.join(', ').toLowerCase()}.`);
  }
  const fac = [];
  if (d.parkingAvailable) fac.push('parking');
  if (d.diningAvailable) fac.push('dining');
  const all = [...fac, ...(d.amenities || [])];
  if (all.length) parts.push(`Facilities include on-site ${all.join(', ')}.`);

  return parts.join(' ');
}
