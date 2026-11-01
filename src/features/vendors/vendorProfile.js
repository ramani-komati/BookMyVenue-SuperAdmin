// Vendors → Edit details — the pure half (no React; `npm test` covers it).
// The server (backend adminpanel/vendor_profile.py) checks all of it again
// and refuses any bank / payout key outright.

export const PROFILE_FIELDS = [
  { group: 'profile', key: 'name', label: 'Contact person’s name', max: 150, required: true },
  { group: 'profile', key: 'email', label: 'Email (account)', max: 254, type: 'email' },
  { group: 'business', key: 'name', label: 'Business name', max: 150 },
  { group: 'business', key: 'phone', label: 'Business phone', max: 10, type: 'phone' },
  { group: 'business', key: 'email', label: 'Business email', max: 254, type: 'email' },
  { group: 'business', key: 'address', label: 'Business address', max: 300 },
  { group: 'business', key: 'city', label: 'City', max: 100 },
  { group: 'business', key: 'state', label: 'State', max: 100 },
]

const str = (v) => (v == null ? '' : String(v))
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** GET answer → the form's values { profile: {...}, business: {...} }. */
export function formFromPayload(payload = {}) {
  const out = { profile: {}, business: {} }
  for (const f of PROFILE_FIELDS) out[f.group][f.key] = str(payload?.[f.group]?.[f.key])
  return out
}

/** { 'group.key': message } for every field that is wrong. */
export function profileErrors(form) {
  const errors = {}
  for (const f of PROFILE_FIELDS) {
    const value = str(form?.[f.group]?.[f.key]).trim()
    const id = `${f.group}.${f.key}`
    if (f.required && !value) errors[id] = `Enter the ${f.label.toLowerCase()}`
    else if (value.length > f.max) errors[id] = `At most ${f.max} characters`
    else if (value && f.type === 'email' && !EMAIL.test(value)) errors[id] = 'Enter a valid email address'
    else if (value && f.type === 'phone' && !/^[6-9]\d{9}$/.test(value)) errors[id] = 'Enter a 10-digit mobile number'
  }
  return errors
}

/** The PUT body: only the editable fields, trimmed — never bank details,
 *  never the sign-in phone. */
export function profileRequest(form, version) {
  const pick = (group) => Object.fromEntries(
    PROFILE_FIELDS.filter((f) => f.group === group).map((f) => [f.key, str(form?.[group]?.[f.key]).trim()]),
  )
  return { version, profile: pick('profile'), business: pick('business') }
}

/** [{ label, from, to }] for the confirmation before saving. */
export function profileChanges(saved, form) {
  return PROFILE_FIELDS
    .map((f) => ({ label: f.label, from: str(saved?.[f.group]?.[f.key]).trim(), to: str(form?.[f.group]?.[f.key]).trim() }))
    .filter((c) => c.from !== c.to)
}
