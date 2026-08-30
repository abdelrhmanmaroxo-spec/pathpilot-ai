import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationPrompt } from './conversation-context.js';
import { contextualConversationalReply } from './contextual-conversation.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function contextWithGrammar(form, relevantTurns = 0) {
  return [
    'LATEST USER REQUEST',
    'عامل ايه؟',
    '',
    'CONVERSATION CONTEXT ANALYSIS',
    'Relationship: new_topic',
    `Relevant prior turns: ${relevantTurns}`,
    `User grammatical form for Arabic address: ${form}`,
  ].join('\n');
}

test('uses feminine Arabic wording from safe prior grammar context', () => {
  const answer = contextualConversationalReply('عامل ايه؟', {
    contextPrompt: contextWithGrammar('feminine'),
    storage: memoryStorage(),
    random: () => 0.2,
  });
  assert.match(answer, /معاكي|عاملة|إنتِ|أخبارك/);
  assert.doesNotMatch(answer, /عامل إيه إنت\?/);
});

test('keeps masculine wording when masculine context is explicit', () => {
  const answer = contextualConversationalReply('عامل ايه؟', {
    contextPrompt: contextWithGrammar('masculine'),
    storage: memoryStorage(),
    random: () => 0.2,
  });
  assert.ok(answer?.length > 3);
  assert.doesNotMatch(answer, /معاكي|إنتِ|عاملة إيه إنتِ/);
});

test('current explicit self-reference overrides older grammar metadata', () => {
  const answer = contextualConversationalReply('انا بنت، عامل ايه؟', {
    contextPrompt: contextWithGrammar('masculine'),
    storage: memoryStorage(),
    random: () => 0.2,
  });
  assert.match(answer, /معاكي|عاملة|إنتِ|أخبارك/);
});

test('ambiguous users receive a neutralized casual reply', () => {
  const answer = contextualConversationalReply('عامل ايه؟', {
    storage: memoryStorage(),
    random: () => 0.2,
  });
  assert.ok(answer?.length > 3);
  assert.doesNotMatch(answer, /يا معلم|عامل إيه إنت\?/);
});

test('relevant prior context preserves reasoning follow-ups instead of canned confusion', () => {
  const contextPrompt = contextWithGrammar('unknown', 1);
  assert.equal(contextualConversationalReply('مش فاهم', {
    contextPrompt,
    storage: memoryStorage(),
    random: () => 0,
  }), null);
});

test('context builder carries prior self-reference into a later casual turn without old text leakage', () => {
  const contextPrompt = buildConversationPrompt({
    prompt: 'عامل ايه؟',
    turns: [
      { prompt: 'انا بنت ومحتاجة مساعدة في تنظيم يومي', answer: 'أكيد، نرتب اليوم.', tool: 'ask' },
      { prompt: 'اشرح DNS', answer: 'DNS maps names to addresses.', tool: 'ask' },
    ],
    historyLimit: 30,
  });
  assert.match(contextPrompt, /User grammatical form for Arabic address: feminine/);
  assert.doesNotMatch(contextPrompt, /تنظيم يومي|DNS maps/);

  const answer = contextualConversationalReply('عامل ايه؟', {
    contextPrompt,
    storage: memoryStorage(),
    random: () => 0.2,
  });
  assert.match(answer, /معاكي|عاملة|إنتِ|أخبارك/);
});

test('English casual replies remain unchanged by Arabic grammar metadata', () => {
  const answer = contextualConversationalReply('how are you?', {
    contextPrompt: contextWithGrammar('feminine'),
    language: 'en',
    storage: memoryStorage(),
    random: () => 0,
  });
  assert.match(answer, /Doing well|good|All good|ready/i);
});
