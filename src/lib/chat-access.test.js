import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessExperimentalChat } from './chat-access.js';

test('experimental chat is available to all users and visitors', () => {
    assert.equal(canAccessExperimentalChat(null), true);
    assert.equal(canAccessExperimentalChat({ role: 'user', isOwner: false }), true);
    assert.equal(canAccessExperimentalChat({ role: 'admin', isOwner: false }), true);
    assert.equal(canAccessExperimentalChat({ role: 'user', isOwner: true }), true);
});
