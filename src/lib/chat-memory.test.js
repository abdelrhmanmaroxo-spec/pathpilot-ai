import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendChatTurn,
  CHAT_MEMORY_LIMITS,
  createChatSession,
  deleteChatSession,
  loadChatSessions,
} from './chat-memory.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('persists a chat session and restores its turns', () => {
  const storage = memoryStorage();
  const session = createChatSession();
  const saved = appendChatTurn([session], session.id, {
    id: 'turn-1',
    prompt: 'اشرح DNS ببساطة',
    answer: 'DNS يحول أسماء النطاقات إلى عناوين IP.',
    source: 'local-llm',
    tool: 'ask',
    createdAt: 1,
  }, storage);

  const restored = loadChatSessions(storage);
  assert.equal(saved.length, 1);
  assert.equal(restored[0].turns.length, 1);
  assert.equal(restored[0].title, 'اشرح DNS ببساطة');
  assert.equal(restored[0].turns[0].source, 'local-llm');
});

test('bounds memory to recent turns per chat', () => {
  const storage = memoryStorage();
  let sessions = [createChatSession({ title: 'Long chat' })];
  const id = sessions[0].id;
  for (let index = 0; index < CHAT_MEMORY_LIMITS.turnsPerChat + 4; index += 1) {
    sessions = appendChatTurn(sessions, id, {
      id: `turn-${index}`,
      prompt: `question ${index}`,
      answer: `answer ${index}`,
      createdAt: index + 1,
    }, storage);
  }
  const restored = loadChatSessions(storage);
  assert.equal(restored[0].turns.length, CHAT_MEMORY_LIMITS.turnsPerChat);
  assert.equal(restored[0].turns[0].prompt, 'question 4');
});

test('deletes only the selected chat session', () => {
  const storage = memoryStorage();
  const first = createChatSession({ title: 'First' });
  const second = createChatSession({ title: 'Second' });
  const remaining = deleteChatSession([first, second], first.id, storage);
  assert.deepEqual(remaining.map((item) => item.id), [second.id]);
});
