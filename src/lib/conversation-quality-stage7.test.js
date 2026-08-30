import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalization preserves intent through punctuation, elongation, and whitespace noise', () => {
  assert.equal(normalizeConversationText('  هـــــــلّااااا!!!  '), 'هلا');
  assert.equal(normalizeConversationText('Mshhhhh fahm???'), 'مش فاهم');
  assert.equal(normalizeConversationText('Tmaaaam ya bro!!!'), 'تمام يا bro');
});

test('short social turns stay lightweight across Arabic, Egyptian Arabic, Arabizi, and English', () => {
  const cases = [
    ['اهلااا يا معلم', 'greeting', 'ar'],
    ['msh fahm خالص', 'confusion', 'ar'],
    ['shokran ya bro', 'thanks', 'ar'],
    ['all good here', 'positive_update', 'en'],
    ['see you later', 'goodbye', 'en'],
  ];

  for (const [prompt, intent, language] of cases) {
    const result = detectConversationalArchetype(prompt);
    assert.equal(result?.intent, intent, prompt);
    assert.equal(result?.language, language, prompt);
  }
});

test('semantic short turns remain distinct instead of collapsing into one generic bucket', () => {
  assert.equal(detectConversationalArchetype('معلش يا صاحبي')?.intent, 'apology');
  assert.equal(detectConversationalArchetype('براحتك يا معلم')?.intent, 'acknowledgement');
  assert.equal(detectConversationalArchetype('لسه مش شغال خالص')?.intent, 'frustration');
  assert.equal(detectConversationalArchetype('انا مستعدة')?.intent, 'positive_update');
});

test('action-bearing mixed turns always fall through to the full reasoning path', () => {
  const prompts = [
    'تمام كمل الشرح',
    'thanks explain refresh tokens',
    'msh fahm debug this API',
    'hello اكتبلي ايميل',
    'معلش راجع الكود ده',
    'shokran compare these options',
  ];

  for (const prompt of prompts) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('Arabizi spelling noise keeps Arabic response mode without over-triggering English', () => {
  assert.equal(detectConversationLanguage('ezzayyyak ya bro'), 'ar');
  assert.equal(detectConversationLanguage('shokraaaan'), 'ar');
  assert.equal(detectConversationLanguage('hello friend, how are you?'), 'en');
});

test('context-sensitive confusion and frustration remain available for the full pipeline', () => {
  for (const prompt of ['مش فاهم', 'لسه مش فاهم خالص', 'msh sh8al', 'this still isnt working']) {
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});
