import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadChatAgentSettings,
  saveChatAgentSettings,
  toggleChatAgentGroup,
} from './chat-agent-settings.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('chat agent settings default to full automatic tool access', () => {
  const settings = loadChatAgentSettings(memoryStorage());
  assert.deepEqual(settings.disabledGroups, []);
  assert.deepEqual(settings.disabledToolIds, []);
});

test('chat agent settings persist optional group opt-outs only', () => {
  const storage = memoryStorage();
  const saved = saveChatAgentSettings({ disabledGroups: ['search', 'deep', 'invalid'] }, storage);
  assert.deepEqual(saved.disabledGroups.sort(), ['deep', 'search']);
  assert.ok(saved.disabledToolIds.includes('web_search'));
  assert.ok(saved.disabledToolIds.includes('deep_analyzer'));

  const reloaded = loadChatAgentSettings(storage);
  assert.deepEqual(reloaded.disabledGroups.sort(), ['deep', 'search']);
});

test('toggling a group is reversible', () => {
  const storage = memoryStorage();
  let settings = toggleChatAgentGroup('rag', {}, storage);
  assert.ok(settings.disabledGroups.includes('rag'));
  settings = toggleChatAgentGroup('rag', settings, storage);
  assert.ok(!settings.disabledGroups.includes('rag'));
});
