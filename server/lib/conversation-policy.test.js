import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyConversationTurn, conversationDirective, detectConversationLanguage, normalizeConversationText } from './conversation-policy.js';

test('normalization handles Arabic punctuation, tatweel, diacritics, and repeated letters', () => {
  assert.equal(normalizeConversationText('مَرْحـبــــااا!!!'), 'مرحباا');
});

test('language detection keeps Arabizi Arabic-like and mixed turns visible', () => {
  assert.equal(detectConversationLanguage('ezayak ya bro'), 'en');
  assert.equal(detectConversationLanguage('ازيك bro'), 'ar');
});

test('social turns stay lightweight across Arabic, Egyptian, English, and Arabizi', () => {
  for (const input of ['hello!!!', 'عامل اية؟', 'shokran', 'تمام']) {
    assert.equal(classifyConversationTurn(input).lightweight, true);
  }
});

test('action-bearing requests never get swallowed by lightweight routing', () => {
  for (const input of ['كمل الشرح عن OAuth', 'debug this API', 'اشرح DNS']) {
    assert.equal(classifyConversationTurn(input).kind, 'substantive');
    assert.match(conversationDirective(input), /contains an action or information request/i);
  }
});

test('unknown or longer turns use direct intent guidance', () => {
  assert.equal(classifyConversationTurn('عايز أفهم ليه الموضوع ده بيحصل').kind, 'open');
  assert.match(conversationDirective('عايز أفهم ليه الموضوع ده بيحصل'), /infer the user’s concrete intent/i);
});
