import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPreferences, savePreferences } from './storage.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('public user preferences are stored locally and sanitized', () => {
  const storage = createStorage();
  const saved = savePreferences({ displayName: 'سارة', audience: 'team', responseStyle: 'detailed' }, storage);
  assert.deepEqual(loadPreferences(storage), saved);

  const fallback = savePreferences({ displayName: '', audience: 'invalid', responseStyle: 'invalid' }, storage);
  assert.equal(fallback.audience, 'self');
  assert.equal(fallback.responseStyle, 'balanced');
});
