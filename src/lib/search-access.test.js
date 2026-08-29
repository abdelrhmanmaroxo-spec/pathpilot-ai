import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessAdminSearch, filterSearchHistory } from './search-access.js';

test('admin search is hidden from guests and regular users', () => {
  assert.equal(canAccessAdminSearch(null), false);
  assert.equal(canAccessAdminSearch({ role: 'user' }), false);
});

test('admin search is available to admins and protected owners', () => {
  assert.equal(canAccessAdminSearch({ role: 'admin' }), true);
  assert.equal(canAccessAdminSearch({ role: 'user', isOwner: true }), true);
});

test('regular users never receive admin history entries in global search', () => {
  const history = [
    { id: '1', mode: 'general', prompt: 'hello' },
    { id: '2', mode: 'admin', prompt: 'user analytics' },
  ];
  assert.deepEqual(filterSearchHistory(history, { role: 'user' }).map((item) => item.id), ['1']);
  assert.deepEqual(filterSearchHistory(history, { role: 'admin' }).map((item) => item.id), ['1', '2']);
});
