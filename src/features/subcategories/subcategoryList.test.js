// The Sub-categories page's rules (subcategoryList.js). Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { addedBy, listParams, spellingEditError, statusToast } from './subcategoryList.js';

test('filters become list params; "all" and empty filters are dropped', () => {
  assert.deepEqual(listParams({ status: 'pending', category: 'Play zone' }), { status: 'pending', category: 'Play zone' });
  assert.deepEqual(listParams({ status: 'all', category: '' }), {});
  assert.deepEqual(listParams({ status: 'rejected' }), { status: 'rejected' });
  assert.deepEqual(listParams(), {});
});

test('a spelling fix is accepted', () => {
  const row = { name: 'cricket nets' };
  assert.equal(spellingEditError(row, 'Cricket Nets'), '');
  assert.equal(spellingEditError(row, '  Cricket-Nets '), '');
});

test('a different name, an unchanged name or junk is refused', () => {
  const row = { name: 'Cricket Nets' };
  assert.match(spellingEditError(row, 'Bowling Nets'), /add a new sub-category/);
  assert.match(spellingEditError(row, ' Cricket  Nets '), /Change the spelling first/);
  assert.ok(spellingEditError(row, ''));
  assert.ok(spellingEditError(row, 'Others'));
});

test('status toasts and who added a name', () => {
  assert.equal(statusToast('Archery', 'approved'), '“Archery” approved');
  assert.equal(statusToast('Archery', 'rejected'), '“Archery” rejected');
  assert.equal(statusToast('Archery', 'pending'), '“Archery” moved back to pending');
  assert.equal(addedBy({ createdByAdmin: true }), 'Added by an admin');
  assert.equal(addedBy({ createdBy: { name: 'Ravi', phone: '9000000001' } }), 'Added by vendor Ravi (9000000001)');
  assert.equal(addedBy({ createdBy: { name: '', phone: '9000000001' } }), 'Added by vendor 9000000001');
  assert.equal(addedBy({ createdBy: null }), 'Added by a vendor');
});
