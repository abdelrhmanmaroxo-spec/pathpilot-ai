import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversationQualityGuidance,
  detectConversationIntent,
  detectConversationLanguage,
  normalizeConversationText,
  profileConversationTurn,
} from './conversation-quality.js';

test('normalizes Arabic punctuation, diacritics, tatweel, and expressive repetition', () => {
  assert.equal(normalizeConversationText('إزّيــــك؟؟؟؟'), 'ازيك');
  assert.equal(normalizeConversationText('msh fahmmmm!!!'), 'msh fahmm');
});

test('detects Arabic, Egyptian Arabizi, and English language modes', () => {
  assert.equal(detectConversationLanguage('إزيك عامل إيه؟'), 'ar');
  assert.equal(detectConversationLanguage('ezayak ya bro'), 'ar-latin');
  assert.equal(detectConversationLanguage('How are you today?'), 'en');
});

test('routes broad social intents to lightweight handling', () => {
  for (const [input, expected] of [
    ['hello', 'greeting'],
    ['شكرا يا معلم', 'thanks'],
    ['msh fahm', 'confusion'],
    ['معلش', 'apology'],
    ['يلا سلام', 'farewell'],
    ['ساعدني', 'help'],
  ]) {
    assert.equal(detectConversationIntent(input), expected, input);
    assert.equal(profileConversationTurn(input).lightweight, true, input);
  }
});

test('keeps action-bearing mixed turns on the substantive path', () => {
  for (const input of ['كمل الشرح عن OAuth', 'debug this API', 'اشرح DNS']) {
    const profile = profileConversationTurn(input);
    assert.equal(profile.intent, 'substantive', input);
    assert.equal(profile.actionBearing, true, input);
    assert.equal(profile.lightweight, false, input);
  }
});

test('keeps language guidance isolated and avoids demographic inference', () => {
  const arabic = buildConversationQualityGuidance({ language: 'ar', intent: 'greeting' });
  const english = buildConversationQualityGuidance({ language: 'en', intent: 'greeting' });
  assert.match(arabic, /Arabic\/Egyptian Arabic/);
  assert.match(english, /natural English/);
  assert.match(arabic, /first-person grammatical evidence/);
  assert.doesNotMatch(arabic, /name|photo|voice|device/i);
});
