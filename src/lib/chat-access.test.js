import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessExperimentalChat } from './chat-access.js';

test('experimental chat is limited to admin and owner accounts', () => {
  assert.equal(canAccessExperimentalChat(null), false);
  assert.equal(canAccessExperimentalChat({ role: 'user', isOwner: false }), false);
  assert.equal(canAccessExperimentalChat({ role: 'admin', isOwner: false }), true);
  assert.equal(canAccessExperimentalChat({ role: 'user', isOwner: true }), true);
});
