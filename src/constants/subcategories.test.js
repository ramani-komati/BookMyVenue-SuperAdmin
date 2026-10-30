// Custom sub-categories (constants/subcategories.js) — the wizard's "Others"
// option. An identical copy of this file runs in the super admin app,
// against its identical copy of the module. Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomSubcategory, cleanSubcategoryName, customCategoryOf, gridItems, removeCustomSubcategory,
  selectedCustomNames, selectedSports, subcatMapKey, subcategoryKey, subcategoryNameError, supportsCustom,
} from './subcategories.js';

test('names are tidied and keyed like the server', () => {
  assert.equal(cleanSubcategoryName('   Cricket    Nets '), 'Cricket Nets');
  assert.equal(subcategoryKey('cricket-NETS'), subcategoryKey('  Cricket  Nets '));
});

test('empty and junk names are refused', () => {
  for (const bad of ['', '   ', 'x', '1234', 'Others', 'other', 'a'.repeat(41), 'Nets · Pitch', '<b>x</b>']) {
    assert.ok(subcategoryNameError(bad), bad);
  }
  assert.equal(subcategoryNameError('Cricket Nets'), '');
  assert.equal(subcategoryNameError("Kids' Party & Games"), '');
});

test('which venue types take custom names, and where they are ticked', () => {
  assert.equal(supportsCustom('Playzone'), true);
  assert.equal(supportsCustom('Private Hall'), true);
  assert.equal(supportsCustom('Resort'), false);
  assert.equal(supportsCustom('Private Theatre'), false);
  assert.equal(supportsCustom('Others'), false);
  assert.equal(customCategoryOf('Playzone'), 'Play zone');
  assert.equal(subcatMapKey('Playzone'), 'sports');
  assert.equal(subcatMapKey('Gym'), 'subCategories');
});

test('the grid: built-ins, then shared names, then the draft\'s own, Others last', () => {
  const { items, othersTile } = gridItems('Playzone', [{ name: 'Archery', status: 'approved' }], {
    customSubCategories: ['Cricket Nets', 'archery'],
  });
  const names = items.map((i) => i.name);
  assert.equal(names[0], 'Box Cricket');
  assert.deepEqual(names.slice(-2), ['Archery', 'Cricket Nets']);   // 'archery' de-duplicated
  assert.equal(othersTile, true);                                    // Sports list has no Others tile
  const hall = gridItems('Private Hall', [], {});
  assert.equal(hall.items.at(-1).name, 'Others');                    // the hall's own tile stays last
  assert.equal(hall.othersTile, false);
});

test('Sports → Others → Cricket Nets ticks it as a sport and declares it custom', () => {
  const start = { primaryCategory: 'Playzone', sports: { Badminton: true } };
  const { details, name, error, existed } = addCustomSubcategory(start, 'Playzone', '  cricket   nets ');
  assert.equal(error, '');
  assert.equal(existed, false);
  assert.equal(name, 'cricket nets');
  assert.deepEqual(details.sports, { Badminton: true, 'cricket nets': true });
  assert.deepEqual(details.customSubCategories, ['cricket nets']);
  assert.deepEqual(selectedSports(details), ['Badminton', 'cricket nets']);
  const removed = removeCustomSubcategory(details, 'Playzone', 'cricket nets');
  assert.deepEqual(removed.customSubCategories, []);
  assert.deepEqual(selectedSports(removed), ['Badminton']);
});

test('a typed duplicate ticks the existing tile instead', () => {
  const start = { primaryCategory: 'Playzone', sports: {} };
  const builtIn = addCustomSubcategory(start, 'Playzone', 'BADMINTON');
  assert.equal(builtIn.existed, true);
  assert.deepEqual(builtIn.details.sports, { Badminton: true });
  assert.deepEqual(builtIn.details.customSubCategories, []);
  const shared = addCustomSubcategory(start, 'Playzone', 'archery ', [{ name: 'Archery' }]);
  assert.equal(shared.name, 'Archery');
  assert.deepEqual(shared.details.customSubCategories, ['Archery']);   // shared custom names are declared too
});

test('empty names and unsupported types are refused without changing the draft', () => {
  const start = { primaryCategory: 'Gym', subCategories: { Yoga: true } };
  const empty = addCustomSubcategory(start, 'Gym', '   ');
  assert.equal(empty.error, 'Enter a subcategory name.');
  assert.equal(empty.details, start);
  assert.ok(addCustomSubcategory({}, 'Resort', 'Treehouse').error);
});

test('the declared list follows what is ticked; the hall\'s Others tile is not custom', () => {
  const details = { primaryCategory: 'Private Hall', subCategories: { Birthday: true, Others: true, Housewarming: true, Gone: false } };
  assert.deepEqual(selectedCustomNames(details), ['Housewarming']);
});
