/**
 * Venue registration domain constants.
 * Mirrors the taxonomy from the source design; keep this the single source of
 * truth so steps, validation and the API layer stay in sync.
 */

import { VENUE_TYPES } from './categories.js';

// Wizard steps, in order. `section` maps a step to its patchDraft section
// ('photos' has no patch section — photos go through uploadPhoto/deletePhoto).
export const STEPS = [
  { key: 'basic', label: 'Basic info', icon: 'building-2', section: 'basics' },
  { key: 'location', label: 'Location', icon: 'map-pin', section: 'location' },
  { key: 'photos', label: 'Photos', icon: 'image', section: 'photos' },
  { key: 'details', label: 'Details', icon: 'sparkles', section: 'details' },
  { key: 'payout', label: 'Payout / Bank', icon: 'wallet', section: 'payout' },
];

// The venue types a draft can store (details.primaryCategory), grouped
// under the primary categories Celebrate · Sports · Gaming · Resorts ·
// Fitness. THE list lives in ./categories.js (shared with the super admin
// app and mirrored by the backend taxonomy) — never retype it here.
// "Others" stays LAST: it reveals a manual category-name field plus
// free-text sub-categories for venue types no category covers.
export const PRIMARY_CATEGORIES = Object.keys(VENUE_TYPES);

// Fitness services (the Gym and Fitness category) — the Fitness
// registration form's list, mirrored by the backend's 'Gym' sub-categories
// (venues/taxonomy.py) and offerings/model.js FITNESS_SERVICES. The earlier
// short names ('Cardio', 'Group Classes'…) still map onto these server-side.
export const GYM_SUBCATS = [
  'General Gym / Strength Training',
  'Cardio Training',
  'Personal Training',
  'Weight Loss Programs',
  'Yoga',
  'Zumba',
  'CrossFit / Functional Training',
  'Pilates',
  'Group Fitness Classes',
  'Martial Arts / Boxing',
  'Dance Fitness',
  'Physiotherapy / Recovery',
];

// Big Screen Surprise occasions (Celebrate) — offerings/model.js SURPRISE_OCCASIONS.
export const SURPRISE_OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Proposal',
  'Special Wishes',
  'Love',
  'Friendship',
  'Selfie on Screen',
  'Other',
];

// Playstation / gaming-lounge sub-categories (the setups a venue offers).
export const PLAYSTATION_SUBCATS = [
  'PS5',
  'PS4',
  'VR Gaming',
  'Racing Simulator',
  'Multiplayer Gaming',
  'Tournament Play',
  'Birthday Celebration',
  'Friends Hangout',
];

export const HALL_SUBCATS = [
  'Birthday',
  'Anniversary',
  'Bride to Be',
  'Bachelors Party',
  'Seminar / Meeting',
  'Movie Package',
  'Others',
];

export const PLAYZONE_SPORTS = [
  'Box Cricket',
  'Badminton',
  'Volleyball',
  'Basketball',
  'Swimming Pool',
  'Pickleball',
  'Football',
];

// Booking unit noun (singular/plural) per sport.
export const SPORT_UNIT = {
  'Box Cricket': { s: 'pitch', p: 'pitches' },
  Badminton: { s: 'court', p: 'courts' },
  Volleyball: { s: 'court', p: 'courts' },
  Basketball: { s: 'court', p: 'courts' },
  'Swimming Pool': { s: 'pool', p: 'pools' },
  Pickleball: { s: 'court', p: 'courts' },
  Football: { s: 'pitch', p: 'pitches' },
};

export const SPORT_CAP_OPTIONS = ['Unlimited persons', 'Limited persons'];

// Booking unit noun per (non-Playzone) category; falls back to "screen".
export const CAT_UNIT = { 'Private Hall': 'hall', Resort: 'lawn', Playstation: 'station', Gym: 'studio', 'Big Screen Surprise': 'screen' };

// Predefined add-ons offered to every venue.
export const ADDONS = [
  { key: 'water500', label: 'Water bottle 500ml' },
  { key: 'water1l', label: 'Water bottle 1L' },
  { key: 'energy', label: 'Energy Drink' },
  { key: 'cool', label: 'Cool Drinks' },
];

export const SPORT_CFG_DEFAULT = {
  capacity: 'Unlimited persons',
  maxPersons: '',
  price: '',
  units: '1',
  unitMax: {},
  unitPrice: {},
};

// All 33 districts of Telangana, as the Location step listed them before
// venues could be registered anywhere in India. The wizard now uses every
// state's districts from utils/indiaRegions.js (where these older spellings
// — 'Medchal–Malkajgiri', 'Rangareddy', 'Jagtial' … — are aliases, so drafts
// saved with them still resolve). Kept for reference; nothing imports it.
export const TELANGANA_DISTRICTS = [
  'Adilabad',
  'Bhadradri Kothagudem',
  'Hanumakonda',
  'Hyderabad',
  'Jagtial',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Jogulamba Gadwal',
  'Kamareddy',
  'Karimnagar',
  'Khammam',
  'Komaram Bheem Asifabad',
  'Mahabubabad',
  'Mahabubnagar',
  'Mancherial',
  'Medak',
  'Medchal–Malkajgiri',
  'Mulugu',
  'Nagarkurnool',
  'Nalgonda',
  'Narayanpet',
  'Nirmal',
  'Nizamabad',
  'Peddapalli',
  'Rajanna Sircilla',
  'Rangareddy',
  'Sangareddy',
  'Siddipet',
  'Suryapet',
  'Vikarabad',
  'Wanaparthy',
  'Warangal',
  'Yadadri Bhuvanagiri',
];

// Upload limits per gallery.
export const MAX_VENUE_PHOTOS = 5;
export const MAX_SERVICE_IMAGES = 10;

// localStorage key holding the active draft id.
export const DRAFT_ID_KEY = 'bmv.venue.draftId';
