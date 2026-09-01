import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyConversationTurn, conversationDirective, detectConversationLanguage, normalizeConversationText } from './conversation-policy.js';

test('normalization handles Arabic punctuation, tatweel, diacritics, and repeated letters', () => {
  assert.equal(normalizeConversationText('مَرْحـبــــااا!!!'), 'مرحباا');
});

test('language detection keeps common Arabizi variants Arabic-like and mixed turns visible', () => {
  for (const input of ['ezayak ya bro', 'ezayek ya bro', '3ayza msa3da', '3amel eh ya bro', 'اخبارك bro']) {
    assert.equal(detectConversationLanguage(input), 'ar', input);
  }
  assert.equal(detectConversationLanguage('ازيك bro'), 'ar');
  assert.equal(detectConversationLanguage('hello bro'), 'en');
});

test('social turns stay lightweight across Arabic, Egyptian, English, and Arabizi', () => {
  for (const input of ['hello!!!', 'عامل ايه؟', 'shokran', 'تمام', 'هلووو!!!', 'ezayak ya bro', 'ezayek']) {
    assert.equal(classifyConversationTurn(input).lightweight, true, input);
  }
});

test('Arabic social questions are not mistaken for action requests', () => {
  for (const input of ['عامل ايه؟', 'الدنيا ايه؟', 'how are you?']) {
    assert.equal(classifyConversationTurn(input).kind, 'social', input);
  }
});

test('Arabic and English action-bearing requests never get swallowed by lightweight routing', () => {
  for (const input of ['كمل الشرح عن OAuth', 'debug this API', 'اشرح DNS', 'عايز أفهم ليه الموضوع ده بيحصل', 'what is DNS?']) {
    assert.equal(classifyConversationTurn(input).kind, 'substantive', input);
    assert.match(conversationDirective(input), /contains an action or information request/i);
  }
});

test('action words are matched as whole tokens, avoiding substring false positives', () => {
  assert.equal(classifyConversationTurn('somehow nice').kind, 'short');
  assert.equal(classifyConversationTurn('whatever').kind, 'short');
  assert.equal(classifyConversationTurn('ازيك يا صاحبي').kind, 'short');
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

test('ambiguous language remains lightweight and neutral instead of inventing a demographic or gender signal', () => {
  const result = classifyConversationTurn('تمام، شكرًا');
  assert.equal(result.language, 'ar');
  assert.equal(result.kind, 'short');
  assert.equal(result.lightweight, true);
});
