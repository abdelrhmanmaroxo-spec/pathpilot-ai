import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAdminTabs,
  getAdminUsagePercentages,
  getBannedUsers,
  getPendingAdminInvites,
} from './admin-dashboard-model.js';

test('admin tabs expose owner-only account log without mutating the base tabs', () => {
  const adminTabs = getAdminTabs(false);
  const ownerTabs = getAdminTabs(true);

  assert.equal(adminTabs.some(([id]) => id === 'owner-log'), false);
  assert.equal(ownerTabs.at(-1)[0], 'owner-log');
  assert.equal(getAdminTabs(false).length, adminTabs.length);
});

test('dashboard user and invite filters tolerate missing data', () => {
  const users = [{ id: '1', disabled: true }, { id: '2', disabled: false }, null];
  const invites = [{ email: 'pending@example.com', accepted_at: null }, { email: 'done@example.com', accepted_at: '2026-08-30' }];

  assert.deepEqual(getBannedUsers(users), [users[0]]);
  assert.deepEqual(getBannedUsers(undefined), []);
  assert.deepEqual(getPendingAdminInvites(invites), [invites[0]]);
  assert.deepEqual(getPendingAdminInvites(undefined), []);
});

test('usage percentages preserve the existing rounded three-category breakdown', () => {
  assert.deepEqual(getAdminUsagePercentages({
    totalUsage: 7,
    usage: { general: 3, study: 2, work: 2 },
  }), { general: 43, study: 29, work: 29 });

  assert.deepEqual(getAdminUsagePercentages(null), { general: 0, study: 0, work: 0 });
  assert.deepEqual(getAdminUsagePercentages({ totalUsage: 0, usage: { general: 10 } }), { general: 0, study: 0, work: 0 });
});
