import test from 'node:test';
import assert from 'node:assert/strict';
import {
  patchAdminUserCollection,
  removeAdminUserFromDashboard,
} from './useAdminDashboardController.js';

test('patchAdminUserCollection updates only the matching user without mutating input', () => {
  const original = {
    users: [
      { id: 'owner', role: 'admin', isOwner: true },
      { id: 'user-1', role: 'user', disabled: false },
    ],
    summary: { totalUsers: 2 },
  };

  const updated = patchAdminUserCollection(original, 'user-1', { disabled: true });

  assert.notStrictEqual(updated, original);
  assert.deepEqual(updated.users[0], original.users[0]);
  assert.deepEqual(updated.users[1], { id: 'user-1', role: 'user', disabled: true });
  assert.equal(original.users[1].disabled, false);
  assert.deepEqual(updated.summary, original.summary);
});

test('patchAdminUserCollection safely preserves an unloaded dashboard', () => {
  assert.equal(patchAdminUserCollection(null, 'user-1', { role: 'admin' }), null);
});

test('removeAdminUserFromDashboard removes one user and decrements summary safely', () => {
  const original = {
    users: [
      { id: 'owner', role: 'admin', isOwner: true },
      { id: 'user-1', role: 'user' },
    ],
    summary: { totalUsers: 2, activeToday: 1 },
  };

  const updated = removeAdminUserFromDashboard(original, 'user-1');

  assert.deepEqual(updated.users, [{ id: 'owner', role: 'admin', isOwner: true }]);
  assert.deepEqual(updated.summary, { totalUsers: 1, activeToday: 1 });
  assert.equal(original.users.length, 2);
  assert.equal(original.summary.totalUsers, 2);
});

test('removeAdminUserFromDashboard never makes totalUsers negative', () => {
  const updated = removeAdminUserFromDashboard({ users: [], summary: { totalUsers: 0 } }, 'missing');
  assert.equal(updated.summary.totalUsers, 0);
});
