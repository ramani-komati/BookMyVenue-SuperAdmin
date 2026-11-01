// Vendors → Edit details (vendorProfile.js). Run: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { formFromPayload, profileChanges, profileErrors, profileRequest } from './vendorProfile.js'

const PAYLOAD = {
  profile: { name: 'Ravi', email: 'v@x.in' },
  business: { name: 'Ravi Events', phone: '', email: '', address: '1 Main Rd', city: '', state: '' },
  vendor: { id: 7, phone: '9000000011', kyc: 'pending', acc: 'active' },
  version: 'abc',
  bankDetailsEditable: false,
}

test('the form holds only the editable fields — no bank details, no sign-in phone', () => {
  const form = formFromPayload({ ...PAYLOAD, payout: { ifsc: 'HDFC0001234' }, business: { ...PAYLOAD.business, ifsc: 'X' } })
  assert.deepEqual(Object.keys(form.profile), ['name', 'email'])
  assert.deepEqual(Object.keys(form.business), ['name', 'phone', 'email', 'address', 'city', 'state'])
  const body = profileRequest(form, 'abc')
  assert.equal(JSON.stringify(body).includes('HDFC'), false)
  assert.equal('payout' in body, false)
  assert.equal('phone' in body.profile, false)
  assert.equal(body.version, 'abc')
})

test('validation: name required, emails and the business phone checked', () => {
  const form = formFromPayload(PAYLOAD)
  assert.deepEqual(profileErrors(form), {})
  const bad = {
    profile: { name: ' ', email: 'nope' },
    business: { ...form.business, phone: '12345', email: 'x@', city: 'x'.repeat(101) },
  }
  const errors = profileErrors(bad)
  assert.ok(errors['profile.name'])
  assert.ok(errors['profile.email'])
  assert.ok(errors['business.phone'])
  assert.ok(errors['business.email'])
  assert.ok(errors['business.city'])
})

test('changes are listed old → new for the confirmation, trimmed', () => {
  const saved = formFromPayload(PAYLOAD)
  const form = { profile: { ...saved.profile, name: 'Ravi Kumar ' }, business: { ...saved.business, city: 'Warangal' } }
  assert.deepEqual(profileChanges(saved, form), [
    { label: 'Contact person’s name', from: 'Ravi', to: 'Ravi Kumar' },
    { label: 'City', from: '', to: 'Warangal' },
  ])
  assert.deepEqual(profileChanges(saved, saved), [])
  assert.equal(profileRequest(form, 'v').profile.name, 'Ravi Kumar')
})
