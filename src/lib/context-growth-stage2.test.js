import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeConversationContext,
  buildConversationPrompt,
  conversationContextStats,
  isFollowUpPrompt,
} from './conversation-context.js';

test('recognizes short Egyptian and English follow-up references', () => {
  for (const prompt of ['كمل', 'وضح دي', 'اللي فات', 'continue', 'what about that']) {
    assert.equal(isFollowUpPrompt(prompt), true, prompt);
  }
});

test('keeps latest request first while resolving the immediately prior turn', () => {
  const result = analyzeConversationContext({
    prompt: 'كمل الجزء التاني',
    turns: [
      { prompt: 'اشرح OAuth', answer: 'شرح أولي عن OAuth', tool: 'ask' },
      { prompt: 'اشرح refresh token', answer: 'الـrefresh token بيجدد الوصول', tool: 'ask' },
    ],
    currentTool: 'ask',
  });

  assert.equal(result.relationship, 'follow_up');
  assert.equal(result.isFollowUp, true);
  assert.match(result.prompt, /LATEST USER REQUEST\nكمل الجزء التاني/);
  assert.match(result.prompt, /Relevant prior turns:/);
  assert.match(result.prompt, /refresh token/);
  assert.ok(result.stats.relevantTurns >= 1);
});

test('does not inject unrelated old turns into a new topic', () => {
  const result = analyzeConversationContext({
    prompt: 'ما هي عاصمة اليابان؟',
    turns: [
      { prompt: 'اشرح OAuth', answer: 'شرح تقني', tool: 'ask' },
      { prompt: 'راجع الكود', answer: 'ملاحظات برمجية', tool: 'ask' },
    ],
  });

  assert.equal(result.relationship, 'new_topic');
  assert.equal(result.relevantTurns.length, 0);
  assert.equal(result.prompt, 'ما هي عاصمة اليابان؟');
});

test('preserves explicit constraints for contextual continuations only', () => {
  const prompt = buildConversationPrompt({
    prompt: 'عدلها وخليها أقصر',
    turns: [
      { prompt: 'اكتب الرد بدون مبالغة وبالإنجليزي', answer: 'Draft response', tool: 'ask' },
    ],
  });

  assert.match(prompt, /Prior explicit constraints that may still apply:/);
  assert.match(prompt, /بدون مبالغة/);
});

test('reports bounded context statistics', () => {
  const stats = conversationContextStats([
    { prompt: 'one', answer: 'two' },
    { prompt: 'three', answer: 'four' },
  ], 1);

  assert.equal(stats.turns, 1);
  assert.equal(stats.maxTurns, 1);
  assert.equal(typeof stats.chars, 'number');
  assert.equal(stats.maxChars, 9000);
});
