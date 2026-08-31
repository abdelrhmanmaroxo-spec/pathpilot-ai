import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConversationText, detectConversationLanguage, detectConversationIntent, detectSelfReferenceGender, profileConversationTurn } from './conversation-quality.js';

test('normalizes noisy Arabic and Arabizi turns', () => {
  assert.equal(normalizeConversationText('إزّيــــك؟؟؟؟'), 'ازيك');
  assert.equal(normalizeConversationText('msh fahmmmm!!!'), 'msh fahmm');
});

test('detects Arabic, Arabizi, and English without over-weighting code-switching', () => {
  assert.equal(detectConversationLanguage('إزيك عامل إيه؟'), 'ar');
  assert.equal(detectConversationLanguage('ezayak ya bro'), 'ar-latin');
  assert.equal(detectConversationLanguage('How are you today?'), 'en');
  assert.equal(detectConversationLanguage('اشرح OAuth بسرعة'), 'ar');
});

test('covers social archetypes but preserves substantive fallthrough', () => {
  for (const [input, expected] of [['hello', 'greeting'], ['شكرا يا معلم', 'thanks'], ['msh fahm', 'confusion'], ['معلش', 'apology'], ['يلا سلام', 'farewell'], ['ساعدني', 'help']]) assert.equal(detectConversationIntent(input), expected, input);
  for (const input of ['كمل الشرح عن OAuth', 'debug this API', 'اشرح DNS']) assert.equal(detectConversationIntent(input), 'substantive', input);
});

test('uses only explicit or clear first-person grammar for gender adaptation', () => {
  assert.equal(detectSelfReferenceGender('انا ولد ومحتاج مساعدة'), 'masculine');
  assert.equal(detectSelfReferenceGender('انا بنت ومحتاجة مساعدة'), 'feminine');
  assert.equal(detectSelfReferenceGender('محمد محتاج مساعدة'), 'unknown');
  assert.equal(detectSelfReferenceGender('ممكن تساعدني؟'), 'unknown');
});

test('keeps short social turns lightweight and action turns substantive', () => {
  assert.equal(profileConversationTurn('تمام').lightweight, true);
  assert.equal(profileConversationTurn('explain the second part').lightweight, false);
});
