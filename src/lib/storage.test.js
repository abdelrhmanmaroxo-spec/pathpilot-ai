import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadHistory,
  loadPinnedPrompts,
  loadPreferences,
  saveHistory,
  savePreferences,
  searchHistory,
  togglePinnedPrompt,
  updateHistoryItem,
} from './storage.js';

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

test('favorite history items are preserved and sorted first', () => {
  const storage = createStorage();
  const items = [
    { id: '1', prompt: 'one', answer: 'a', createdAt: '2026-01-01T00:00:00Z' },
    { id: '2', prompt: 'two', answer: 'b', createdAt: '2026-01-02T00:00:00Z' },
  ];
  saveHistory(items, storage);
  const updated = updateHistoryItem(loadHistory(storage), '1', { favorite: true }, storage);
  assert.equal(updated[0].id, '1');
  assert.equal(updated[0].favorite, true);
});

test('history search includes prompt answer folder and tags', () => {
  const items = [
    { id: '1', prompt: 'Python recursion', answer: 'base case', folder: 'Study', tags: ['coding'] },
    { id: '2', prompt: 'Job email', answer: 'follow up', folder: 'Work', tags: ['career'] },
  ];
  assert.equal(searchHistory(items, 'coding Python').length, 1);
  assert.equal(searchHistory(items, 'career').at(0).id, '2');
});

test('pinned prompts toggle without duplicates', () => {
  const storage = createStorage();
  togglePinnedPrompt('Explain this simply', storage);
  togglePinnedPrompt('Explain this simply', storage);
  assert.deepEqual(loadPinnedPrompts(storage), []);
  togglePinnedPrompt('Explain this simply', storage);
  togglePinnedPrompt('Write a checklist', storage);
  assert.deepEqual(loadPinnedPrompts(storage), ['Write a checklist', 'Explain this simply']);
});
