// Seed data for the super-admin panel (mirrors the Admin Panel v2 design).

export const INITIAL_SETTINGS = {
  fee: '20',
  feeDate: '2026-08-01',
  commission: '10',
  categories: ['Sports Turf', 'Banquet Hall', 'Party Hall', 'Swimming Pool', 'Private Theatre', 'Play Zone'],
  cities: ['Hyderabad', 'Bengaluru', 'Pune', 'Chennai', 'Kochi'],
  amenities: ['Parking', 'Washroom', 'Drinking water', 'Floodlights', 'First aid', 'Changing rooms', 'AC', 'CCTV', 'Equipment rental', 'Catering kitchen'],
  banners: [
    { id: 1, title: 'Monsoon offer — 15% off box cricket', text: 'Runs till 31 Jul on all turf bookings' },
    { id: 2, title: 'New: private theatres in Hyderabad', text: 'Celebrate birthdays on the big screen' },
  ],
}

export const INITIAL_APPROVALS = [
  {
    id: 1, name: 'Green Turf Arena', vendor: 'Ravi Sharma', phone: '+91 98490 12345', category: 'Sports Turf',
    city: 'Hyderabad', area: 'Kondapur', submitted: '13 Jul', waitingH: 26, completion: 100, status: 'pending',
    price: '₹1,200', capacity: '14 players', packages: 'Weekend pack ₹6,000 / 6 slots',
    amenities: ['Floodlights', 'Parking', 'Drinking water', 'Washroom', 'First aid'],
    payout: 'HDFC Bank ····4821', notes: '', checks: { photos: false, pricing: false, payout: false },
    photo: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=60&auto=format&fit=crop',
    timeline: [
      { label: 'Submitted by vendor', time: '13 Jul, 09:40' },
      { label: 'Assigned for review', time: '13 Jul, 10:02' },
    ],
  },
  {
    id: 2, name: 'AquaBlue Pool & Deck', vendor: 'Sunita Reddy', phone: '+91 90000 44821', category: 'Swimming Pool',
    city: 'Hyderabad', area: 'Gachibowli', submitted: '13 Jul', waitingH: 21, completion: 90, status: 'pending',
    price: '₹2,500', capacity: '25 guests', packages: 'Pool party pack ₹9,000 / 4 hrs',
    amenities: ['Changing rooms', 'Lifeguard', 'Parking', 'Snack bar'],
    payout: 'ICICI Bank ····9310', notes: '', checks: { photos: false, pricing: false, payout: false },
    photo: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&q=60&auto=format&fit=crop',
    timeline: [{ label: 'Submitted by vendor', time: '13 Jul, 15:12' }],
  },
  {
    id: 3, name: 'Smash Point Pickleball', vendor: 'Arjun Mehta', phone: '+91 98661 77410', category: 'Sports Turf',
    city: 'Bengaluru', area: 'Indiranagar', submitted: '14 Jul', waitingH: 14, completion: 75, status: 'pending',
    price: '₹900', capacity: '4 players', packages: '—',
    amenities: ['Equipment rental', 'Parking', 'Washroom'],
    payout: 'SBI ····2214', notes: '', checks: { photos: false, pricing: false, payout: false },
    photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=60&auto=format&fit=crop',
    timeline: [{ label: 'Submitted by vendor', time: '14 Jul, 08:05' }],
  },
  {
    id: 4, name: 'Starlight Private Theatre', vendor: 'Kavya Nair', phone: '+91 91234 88700', category: 'Private Theatre',
    city: 'Hyderabad', area: 'Jubilee Hills', submitted: '14 Jul', waitingH: 4, completion: 100, status: 'pending',
    price: '₹3,800', capacity: '12 guests', packages: 'Birthday pack ₹5,500 incl. decor',
    amenities: ['4K projector', 'Dolby audio', 'Recliners', 'Decor add-ons', 'Parking'],
    payout: 'Axis Bank ····7702', notes: '', checks: { photos: false, pricing: false, payout: false },
    photo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=60&auto=format&fit=crop',
    timeline: [{ label: 'Submitted by vendor', time: '14 Jul, 18:30' }],
  },
  {
    id: 5, name: 'Sunrise Banquet Hall', vendor: 'Imran Khan', phone: '+91 99887 20031', category: 'Banquet Hall',
    city: 'Pune', area: 'Baner', submitted: '12 Jul', waitingH: 0, completion: 100, status: 'approved',
    price: '₹15,000', capacity: '250 guests', packages: 'Wedding pack ₹60,000 / day',
    amenities: ['Catering kitchen', 'Stage', 'AC', 'Valet parking'],
    payout: 'HDFC Bank ····1174', notes: 'Verified on call.', checks: { photos: true, pricing: true, payout: true },
    photo: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=60&auto=format&fit=crop',
    timeline: [
      { label: 'Submitted by vendor', time: '12 Jul, 10:15' },
      { label: 'Reviewed by Anita', time: '12 Jul, 16:40' },
      { label: 'Approved', time: '12 Jul, 16:42' },
    ],
  },
  {
    id: 6, name: 'Kiddo Play Zone', vendor: 'Deepa Iyer', phone: '+91 98450 66004', category: 'Play Zone',
    city: 'Chennai', area: 'Adyar', submitted: '11 Jul', waitingH: 0, completion: 60, status: 'changes',
    price: '₹600', capacity: '30 kids', packages: '—',
    amenities: ['Soft play', 'Party room', 'CCTV'],
    payout: 'Kotak ····5588', notes: 'Photos too dark; asked for retakes.', checks: { photos: false, pricing: true, payout: true },
    photo: 'https://images.unsplash.com/photo-1566454419290-57a64afe30ac?w=800&q=60&auto=format&fit=crop',
    timeline: [
      { label: 'Submitted by vendor', time: '11 Jul, 12:00' },
      { label: 'Changes requested', time: '11 Jul, 17:25' },
    ],
  },
]

export const INITIAL_VENUES = [
  { id: 1, name: 'Green Turf Arena', vendor: 'Ravi Sharma', category: 'Sports Turf', city: 'Hyderabad', area: 'Kondapur', price: '₹1,200', rating: 4.7, bookings: 412, status: 'live', featured: true, capacity: '14 players', packages: 'Weekend pack ₹6,000 / 6 slots', hours: '06:00 – 23:00', addedOn: 'Mar 2026', revenueNum: 486000, amenities: ['Floodlights', 'Parking', 'Drinking water', 'Washroom', 'First aid'], photo: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=480&q=60&auto=format&fit=crop' },
  { id: 2, name: 'Sunrise Banquet Hall', vendor: 'Imran Khan', category: 'Banquet Hall', city: 'Pune', area: 'Baner', price: '₹15,000', rating: 4.5, bookings: 96, status: 'live', featured: false, capacity: '250 guests', packages: 'Wedding pack ₹60,000 / day', hours: '09:00 – 23:00', addedOn: 'Jan 2026', revenueNum: 812000, amenities: ['Catering kitchen', 'Stage', 'AC', 'Valet parking'], photo: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=480&q=60&auto=format&fit=crop' },
  { id: 3, name: 'AquaBlue Pool & Deck', vendor: 'Sunita Reddy', category: 'Swimming Pool', city: 'Hyderabad', area: 'Gachibowli', price: '₹2,500', rating: 4.8, bookings: 178, status: 'live', featured: true, capacity: '25 guests', packages: 'Pool party pack ₹9,000 / 4 hrs', hours: '06:00 – 21:00', addedOn: 'Jul 2026', revenueNum: 92000, amenities: ['Changing rooms', 'Lifeguard', 'Parking', 'Snack bar'], photo: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=480&q=60&auto=format&fit=crop' },
  { id: 4, name: 'Starlight Private Theatre', vendor: 'Kavya Nair', category: 'Private Theatre', city: 'Hyderabad', area: 'Jubilee Hills', price: '₹3,800', rating: 4.9, bookings: 88, status: 'live', featured: false, capacity: '12 guests', packages: 'Birthday pack ₹5,500 incl. decor', hours: '10:00 – 24:00', addedOn: 'Jul 2026', revenueNum: 168000, amenities: ['4K projector', 'Dolby audio', 'Recliners', 'Decor add-ons', 'Parking'], photo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=480&q=60&auto=format&fit=crop' },
  { id: 5, name: 'Victory Box Cricket', vendor: 'Mohan Gupta', category: 'Sports Turf', city: 'Hyderabad', area: 'Madhapur', price: '₹1,100', rating: 4.4, bookings: 301, status: 'paused', featured: false, capacity: '12 players', packages: 'Night pack ₹5,000 / 5 slots', hours: '06:00 – 24:00', addedOn: 'Feb 2026', revenueNum: 331000, amenities: ['Floodlights', 'Parking', 'Washroom', 'Equipment rental'], photo: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=480&q=60&auto=format&fit=crop' },
  { id: 6, name: 'Kiddo Play Zone', vendor: 'Deepa Iyer', category: 'Play Zone', city: 'Chennai', area: 'Adyar', price: '₹600', rating: 4.2, bookings: 54, status: 'live', featured: false, capacity: '30 kids', packages: 'Birthday pack ₹4,000 / 2 hrs', hours: '10:00 – 20:00', addedOn: 'Jun 2026', revenueNum: 74000, amenities: ['Soft play', 'Party room', 'CCTV'], photo: 'https://images.unsplash.com/photo-1566454419290-57a64afe30ac?w=480&q=60&auto=format&fit=crop' },
  { id: 7, name: 'Royal Party Hall', vendor: 'Mohan Gupta', category: 'Party Hall', city: 'Bengaluru', area: 'Koramangala', price: '₹8,000', rating: 4.3, bookings: 67, status: 'live', featured: false, capacity: '120 guests', packages: 'Evening pack ₹20,000 / 4 hrs', hours: '10:00 – 23:00', addedOn: 'Feb 2026', revenueNum: 596000, amenities: ['AC', 'Stage', 'Catering kitchen', 'Parking'], photo: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=480&q=60&auto=format&fit=crop' },
  { id: 8, name: 'Smash Point Pickleball', vendor: 'Arjun Mehta', category: 'Sports Turf', city: 'Bengaluru', area: 'Indiranagar', price: '₹900', rating: 4.6, bookings: 142, status: 'draft', featured: false, capacity: '4 players', packages: '—', hours: '06:00 – 22:00', addedOn: 'Apr 2026', revenueNum: 214000, amenities: ['Equipment rental', 'Parking', 'Washroom'], photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=480&q=60&auto=format&fit=crop' },
]

export const INITIAL_VENDORS = [
  { id: 1, name: 'Ravi Sharma', phone: '+91 98490 12345', email: 'ravi.s@gmail.com', venues: 3, earningsNum: 486000, joined: 'Mar 2026', kyc: 'verified', acc: 'active', payout: 'HDFC Bank ····4821' },
  { id: 2, name: 'Sunita Reddy', phone: '+91 90000 44821', email: 'sunita.r@gmail.com', venues: 1, earningsNum: 92000, joined: 'Jul 2026', kyc: 'pending', acc: 'active', payout: 'ICICI Bank ····9310' },
  { id: 3, name: 'Arjun Mehta', phone: '+91 98661 77410', email: 'arjun@smashpoint.in', venues: 2, earningsNum: 214000, joined: 'Apr 2026', kyc: 'verified', acc: 'active', payout: 'SBI ····2214' },
  { id: 4, name: 'Kavya Nair', phone: '+91 91234 88700', email: 'kavya.n@gmail.com', venues: 1, earningsNum: 168000, joined: 'Jul 2026', kyc: 'pending', acc: 'active', payout: 'Axis Bank ····7702' },
  { id: 5, name: 'Imran Khan', phone: '+91 99887 20031', email: 'imran@sunrisehalls.in', venues: 4, earningsNum: 812000, joined: 'Jan 2026', kyc: 'verified', acc: 'active', payout: 'HDFC Bank ····1174' },
  { id: 6, name: 'Deepa Iyer', phone: '+91 98450 66004', email: 'deepa.iyer@gmail.com', venues: 2, earningsNum: 74000, joined: 'Jun 2026', kyc: 'rejected', acc: 'suspended', payout: 'Kotak ····5588' },
  { id: 7, name: 'Mohan Gupta', phone: '+91 93425 11908', email: 'mohan.g@gmail.com', venues: 5, earningsNum: 927000, joined: 'Feb 2026', kyc: 'verified', acc: 'active', payout: 'PNB ····3345' },
]

export const INITIAL_USERS = [
  { id: 1, name: 'Sandeep Kumar', phone: '+91 98111 22334', bookings: 24, spentNum: 31200, lastActive: 'Today', status: 'active' },
  { id: 2, name: 'Priya Menon', phone: '+91 97654 10098', bookings: 11, spentNum: 42500, lastActive: 'Today', status: 'active' },
  { id: 3, name: 'Rahul Verma', phone: '+91 90909 55667', bookings: 38, spentNum: 36800, lastActive: 'Yesterday', status: 'active' },
  { id: 4, name: 'Ananya Sen', phone: '+91 98220 44771', bookings: 6, spentNum: 28400, lastActive: '3 days ago', status: 'active' },
  { id: 5, name: 'Vikram Das', phone: '+91 96543 88012', bookings: 17, spentNum: 20600, lastActive: '1 week ago', status: 'active' },
  { id: 6, name: 'Farah Ali', phone: '+91 95001 33445', bookings: 3, spentNum: 2700, lastActive: '2 weeks ago', status: 'blocked' },
]

export const INITIAL_BOOKINGS = [
  { id: 'BMV-8841', customer: 'Sandeep Kumar', venue: 'Green Turf Arena', slot: '15 Jul, 18:00 – 19:00', amountNum: 1220, method: 'UPI', status: 'confirmed', slotsDesc: '1 slot × ₹1,200', slotsAmt: '₹1,200', addons: '—' },
  { id: 'BMV-8840', customer: 'Priya Menon', venue: 'AquaBlue Pool & Deck', slot: '15 Jul, 16:00 – 18:00', amountNum: 5020, method: 'Card', status: 'confirmed', slotsDesc: '2 slots × ₹2,500', slotsAmt: '₹5,000', addons: '—' },
  { id: 'BMV-8839', customer: 'Rahul Verma', venue: 'Smash Point Pickleball', slot: '16 Jul, 07:00 – 08:00', amountNum: 920, method: 'UPI', status: 'confirmed', slotsDesc: '1 slot × ₹900', slotsAmt: '₹900', addons: '—' },
  { id: 'BMV-8836', customer: 'Ananya Sen', venue: 'Starlight Private Theatre', slot: '18 Jul, 20:00 – 23:00', amountNum: 11420, method: 'Card', status: 'confirmed', slotsDesc: '3 slots × ₹3,800', slotsAmt: '₹11,400', addons: '—' },
  { id: 'BMV-8833', customer: 'Vikram Das', venue: 'Green Turf Arena', slot: '13 Jul, 20:00 – 21:00', amountNum: 1220, method: 'UPI', status: 'completed', slotsDesc: '1 slot × ₹1,200', slotsAmt: '₹1,200', addons: '—' },
  { id: 'BMV-8830', customer: 'Meena Rao', venue: 'Sunrise Banquet Hall', slot: '12 Jul, 11:00 – 15:00', amountNum: 18020, method: 'Card', status: 'completed', slotsDesc: '4 hrs × ₹4,500', slotsAmt: '₹18,000', addons: '—' },
  { id: 'BMV-8828', customer: 'Karthik B.', venue: 'AquaBlue Pool & Deck', slot: '12 Jul, 08:00 – 10:00', amountNum: 5520, method: 'UPI', status: 'refund_pending', slotsDesc: '2 slots × ₹2,500', slotsAmt: '₹5,000', addons: 'Snacks ₹500' },
  { id: 'BMV-8825', customer: 'Farah Ali', venue: 'Smash Point Pickleball', slot: '11 Jul, 19:00 – 20:00', amountNum: 920, method: 'Cash', status: 'cancelled', slotsDesc: '1 slot × ₹900', slotsAmt: '₹900', addons: '—' },
  { id: 'BMV-8820', customer: 'Sandeep Kumar', venue: 'Victory Box Cricket', slot: '10 Jul, 21:00 – 22:00', amountNum: 1120, method: 'UPI', status: 'completed', slotsDesc: '1 slot × ₹1,100', slotsAmt: '₹1,100', addons: '—' },
  { id: 'BMV-8815', customer: 'Priya Menon', venue: 'Royal Party Hall', slot: '9 Jul, 18:00 – 22:00', amountNum: 8520, method: 'Card', status: 'completed', slotsDesc: '4 hrs × ₹2,000', slotsAmt: '₹8,000', addons: 'Decor ₹500' },
]

export const INITIAL_PAYOUTS = [
  { id: 1, vendor: 'Mohan Gupta', period: '6 – 12 Jul', grossNum: 96000, status: 'pending' },
  { id: 2, vendor: 'Ravi Sharma', period: '6 – 12 Jul', grossNum: 71300, status: 'pending' },
  { id: 3, vendor: 'Imran Khan', period: '6 – 12 Jul', grossNum: 65400, status: 'failed' },
  { id: 4, vendor: 'Arjun Mehta', period: '29 Jun – 5 Jul', grossNum: 45900, status: 'completed' },
  { id: 5, vendor: 'Kavya Nair', period: '29 Jun – 5 Jul', grossNum: 38200, status: 'completed' },
  { id: 6, vendor: 'Sunita Reddy', period: '29 Jun – 5 Jul', grossNum: 21700, status: 'completed' },
]

export const INITIAL_REVIEWS = [
  { id: 1, venue: 'Green Turf Arena', reviewer: 'Rohit J.', rating: 1, text: 'Owner cancelled at the gate and kept the advance. Total scam!!', reason: 'Abusive / dispute claim', stars: '★☆☆☆☆' },
  { id: 2, venue: 'Royal Party Hall', reviewer: 'Neha P.', rating: 5, text: 'Best hall ever, contact me on 98xxx for cheap decoration services!', reason: 'Spam / self-promotion', stars: '★★★★★' },
  { id: 3, venue: 'AquaBlue Pool & Deck', reviewer: 'Anon user', rating: 2, text: 'Water was dirty and the lifeguard was missing the whole time.', reason: 'Vendor disputes claim', stars: '★★☆☆☆' },
]

export const INITIAL_AUDIT = [
  { time: 'Today, 11:42', admin: 'Anita S.', action: 'Approved venue', target: 'Sunrise Banquet Hall', change: 'pending → live' },
  { time: 'Today, 10:15', admin: 'Anita S.', action: 'Processed payout', target: 'Arjun Mehta · ₹41,310', change: 'pending → completed' },
  { time: 'Yesterday, 18:03', admin: 'Rajesh K.', action: 'Updated platform fee', target: 'Platform settings', change: '₹15 → ₹20 (eff. 1 Aug)' },
  { time: 'Yesterday, 16:47', admin: 'Anita S.', action: 'Requested changes', target: 'Kiddo Play Zone', change: 'pending → changes requested' },
  { time: 'Yesterday, 12:20', admin: 'Rajesh K.', action: 'Removed review', target: 'Victory Box Cricket', change: 'reason: spam' },
  { time: '12 Jul, 15:31', admin: 'Anita S.', action: 'Suspended vendor', target: 'Deepa Iyer', change: 'active → suspended (KYC mismatch)' },
  { time: '12 Jul, 11:08', admin: 'Rajesh K.', action: 'Issued refund', target: 'BMV-8790 · ₹2,520', change: 'completed → refunded' },
  { time: '11 Jul, 09:55', admin: 'Anita S.', action: 'Featured venue', target: 'AquaBlue Pool & Deck', change: 'homepage feature: on' },
]

export const DASHBOARD_ACTIVITY = [
  { icon: 'building-2', text: 'Starlight Private Theatre submitted for approval by Kavya Nair', time: '4 h ago', to: '/approvals' },
  { icon: 'calendar-check', text: 'BMV-8841 booked at Green Turf Arena — ₹1,220', time: '5 h ago', to: '/bookings', state: { expandId: 'BMV-8841' } },
  { icon: 'user', text: 'New vendor joined: Sunita Reddy (Hyderabad)', time: '8 h ago', to: '/vendors' },
  { icon: 'x-circle', text: 'BMV-8828 cancelled at AquaBlue Pool & Deck — refund pending', time: 'Yesterday', to: '/bookings', state: { expandId: 'BMV-8828' } },
  { icon: 'star', text: 'Review on Green Turf Arena reported by the vendor', time: 'Yesterday', to: '/reviews' },
  { icon: 'wallet', text: 'Payout to Imran Khan failed — bank returned the transfer', time: 'Yesterday', to: '/payouts', state: { tab: 'Failed' } },
]

export const fmt = (n) => '₹' + n.toLocaleString('en-IN')

export const initials = (name) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
