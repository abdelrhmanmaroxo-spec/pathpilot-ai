import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, hashPassword, hashToken, normalizeEmail, verifyPassword } from './auth.js';

test('passwords are salted and verified securely', async () => {
  const stored = await hashPassword('strong-password');
  assert.equal(await verifyPassword('strong-password', stored), true);
  assert.equal(await verifyPassword('wrong-password', stored), false);
  assert.notEqual(stored, 'strong-password');
});

test('sessions use opaque tokens and stored hashes', () => {
  const token = createSessionToken();
  assert.ok(token.length > 30);
  assert.notEqual(hashToken(token), token);
  assert.equal(normalizeEmail(' User@Example.COM '), 'user@example.com');
});
