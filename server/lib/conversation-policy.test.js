import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyConversationTurn, conversationDirective, detectConversationLanguage, normalizeConversationText } from './conversation-policy.js';

test('normalization handles Arabic punctuation, tatweel, diacritics, and repeated letters', () => {
  assert.equal(normalizeConversationText('مَرْحـبــــااا!!!'), 'مرحباا');
});

test('language detection keeps Arabizi Arabic-like and mixed turns visible', () => {
  assert.equal(detectConversationLanguage('ezayak ya bro'), 'ar');
  assert.equal(detectConversationLanguage('3ayza msa3da'), 'ar');
  assert.equal(detectConversationLanguage('ازيك bro'), 'ar');
  assert.equal(detectConversationLanguage('hello bro'), 'en');
});

test('social turns stay lightweight across Arabic, Egyptian, English, and Arabizi', () => {
  for (const input of ['hello!!!', 'عامل ايه؟', 'shokran', 'تمام', 'هلووو!!!']) {
    assert.equal(classifyConversationTurn(input).lightweight, true, input);
  }
});

test('Arabic and English action-bearing requests never get swallowed by lightweight routing', () => {
  for (const input of ['كمل الشرح عن OAuth', 'debug this API', 'اشرح DNS', 'عايز أفهم ليه الموضوع ده بيحصل']) {
    assert.equal(classifyConversationTurn(input).kind, 'substantive', input);
    assert.match(conversationDirective(input), /contains an action or information request/i);
  }
});

test('short unknown turns remain lightweight without pretending to be a task', () => {
  const result = classifyConversationTurn('الدنيا عاملة؟');
  assert.equal(result.kind, 'short');
  assert.equal(result.lightweight, true);
});

test('contextual continuation stays concise while preserving direct-intent guidance', () => {
  const directive = conversationDirective('طب وبعدين؟');
  assert.match(directive, /lightweight conversational turn/i);
  assert.doesNotMatch(directive, /contains an action or information request/i);
});
