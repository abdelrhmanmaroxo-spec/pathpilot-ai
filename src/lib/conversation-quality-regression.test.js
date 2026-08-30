import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalizes noisy short turns before intent matching', () => {
  assert.equal(normalizeConversationText('هلووو!!!'), 'هلو');
  assert.equal(normalizeConversationText('تــمــام؟؟'), 'تمام');
  assert.equal(normalizeConversationText('msh   fahm!!!'), 'مش فاهم');
});

test('recognizes punctuation and spelling variants without changing intent', () => {
  const cases = [
    ['هلووو!!!', 'greeting'],
    ['صباح الخيررر يا صاحبي!!!', 'morning_greeting'],
    ['تــمــام؟؟', 'acknowledgement'],
    ['msh   fahm!!!', 'confusion'],
    ['shokran... ya bro', 'thanks'],
    ['وانت؟؟؟', 'how_are_you'],
  ];
  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }
});

test('keeps contextual follow-ups on the reasoning path', () => {
  for (const prompt of ['طيب وبعد كده؟', 'and then?', 'وضح أكتر', 'what about the last step?', 'تمام بس ليه؟']) {
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});

test('preserves Arabic-first language for Egyptian Arabizi noise', () => {
  assert.equal(detectConversationLanguage('msh   fahm!!!'), 'ar');
  assert.equal(detectConversationLanguage('shokran... ya bro'), 'ar');
});

test('does not convert action-bearing mixed turns into lightweight social replies', () => {
  for (const prompt of ['thanks بس كمل الشرح', 'تمام explain the second part', 'mhtag msa3da debug this API']) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});
