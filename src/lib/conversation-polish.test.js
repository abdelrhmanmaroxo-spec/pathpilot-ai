import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalizes noisy mixed-language social turns without losing intent tokens', () => {
  const cases = [
    ['  Hiiii!!! يااا هلااا bro  ', 'hi يا هلا bro'],
    ['مساااء الخير؟؟؟', 'مساء الخير'],
    ['shokraaan yaa bro', 'shokran ya bro'],
    ['mshhh faaahm خالص', 'مش فاهم خالص'],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeConversationText(input), expected, input);
  }
});

test('keeps mixed-language social context lightweight while preserving real work requests', () => {
  const social = [
    ['ya hala bro', 'greeting'],
    ['hello يا صاحبي', 'greeting'],
    ['shokran ya bro', 'thanks'],
    ['تمام ya bro', 'acknowledgement'],
  ];

  for (const [prompt, intent] of social) {
    const result = detectConversationalArchetype(prompt);
    assert.equal(result?.intent, intent, prompt);
  }

  const actionBearing = [
    'ya hala bro اشرحلي OAuth',
    'thanks يا معلم كمل الشرح',
    'تمام explain the second part',
    'hello ya bro draft an email',
    'shokran راجع الكود ده',
  ];

  for (const prompt of actionBearing) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('preserves Arabic-first language choice for noisy Arabizi and code-switched social turns', () => {
  for (const prompt of ['ya hala bro', 'hii ya bro', 'shokraaan ya m3lm', 'tmam bro']) {
    assert.equal(detectConversationLanguage(prompt), 'ar', prompt);
  }

  assert.equal(detectConversationLanguage('hello friend how are you'), 'en');
});

test('keeps contextual confusion and frustration out of the lightweight path', () => {
  for (const prompt of ['mshhh faaahm', 'مساااء الخير كمل الشرح', 'still not working explain this']) {
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});
