/**
 * Venue registration domain constants.
 * Mirrors the taxonomy from the source design; keep this the single source of
 * truth so steps, validation and the API layer stay in sync.
 */

// Wizard steps, in order. `section` maps a step to its patchDraft section
// ('photos' has no patch section — photos go through uploadPhoto/deletePhoto).
export const STEPS = [
  { key: 'basic', label: 'Basic info', icon: 'building-2', section: 'basics' },
  { key: 'location', label: 'Location', icon: 'map-pin', section: 'location' },
  { key: 'photos', label: 'Photos', icon: 'image', section: 'photos' },
  { key: 'details', label: 'Details', icon: 'sparkles', section: 'details' },
  { key: 'payout', label: 'Payout / Bank', icon: 'wallet', section: 'payout' },
];

export const PRIMARY_CATEGORIES = [
  'Private Hall',
  'Private Theatre',
  'Open Theatre',
  'Resort',
  'Playzone',
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
export const CAT_UNIT = { 'Private Hall': 'hall', Resort: 'lawn' };

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

// All 33 districts of Telangana — the served state — for the Location step's
// district dropdown.
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
