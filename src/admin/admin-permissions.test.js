import assert from 'node:assert/strict';
import test from 'node:test';
import { canModerateUser } from './admin-permissions.js';

const owner = { role: 'admin', isOwner: true };
const admin = { role: 'admin', isOwner: false };
const regularUser = { role: 'user', isOwner: false };
const otherAdmin = { role: 'admin', isOwner: false };
const protectedOwner = { role: 'admin', isOwner: true };

test('owner keeps moderation access to every non-owner account', () => {
  assert.equal(canModerateUser(owner, regularUser), true);
  assert.equal(canModerateUser(owner, otherAdmin), true);
  assert.equal(canModerateUser(owner, protectedOwner), false);
});

test('admin can moderate regular users but cannot moderate admins or owner', () => {
  assert.equal(canModerateUser(admin, regularUser), true);
  assert.equal(canModerateUser(admin, otherAdmin), false);
  assert.equal(canModerateUser(admin, protectedOwner), false);
});

test('non-admin accounts never receive moderation access', () => {
  assert.equal(canModerateUser({ role: 'user', isOwner: false }, regularUser), false);
  assert.equal(canModerateUser(null, regularUser), false);
  assert.equal(canModerateUser(admin, null), false);
});
