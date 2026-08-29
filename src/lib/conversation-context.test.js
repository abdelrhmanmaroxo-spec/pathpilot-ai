import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversationPrompt,
  conversationContextStats,
  isFollowUpPrompt,
  normalizeConversationTurns,
} from './conversation-context.js';

test('detects short follow-up prompts in Arabic and English', () => {
  assert.equal(isFollowUpPrompt('كمل'), true);
  assert.equal(isFollowUpPrompt('عدله وخليه أقصر'), true);
  assert.equal(isFollowUpPrompt('continue with the second one'), true);
  assert.equal(isFollowUpPrompt('اشرح قواعد البيانات من البداية'), false);
});

test('keeps only bounded recent conversation turns', () => {
  const turns = Array.from({ length: 10 }, (_, index) => ({ prompt: `question ${index}`, answer: `answer ${index}` }));
  const normalized = normalizeConversationTurns(turns);
  assert.equal(normalized.length, 6);
  assert.equal(normalized[0].prompt, 'question 4');
});

test('builds context around the latest user request', () => {
  const result = buildConversationPrompt({
    prompt: 'كمل',
    turns: [{ prompt: 'اعمل خطة من 3 خطوات', answer: '1. أ 2. ب 3. ج' }],
  });
  assert.match(result, /Conversation context/);
  assert.match(result, /Latest user request: كمل/);
  assert.match(result, /follow-up/);
});

test('reports context budget stats', () => {
  const stats = conversationContextStats([{ prompt: 'abc', answer: 'def' }]);
  assert.equal(stats.turns, 1);
  assert.equal(stats.maxTurns, 6);
  assert.ok(stats.maxChars >= 9000);
});
