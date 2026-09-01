import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalizes elongated and noisy Egyptian social turns consistently', () => {
  const cases = [
    ['اهلااا يا معلم!!!', 'اهلا يا معلم'],
    ['مسااااء الخير؟؟', 'مساء الخير'],
    ['tmam bro!!!', 'tmam bro'],
    ['msh fahm؟؟', 'مش فاهم'],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeConversationText(input), expected, input);
  }
});

test('keeps lightweight social recognition narrow around real work requests', () => {
  const social = [
    ['اهلااا يا معلم', 'greeting'],
    ['مسااااء الخير يا صاحبي', 'evening_greeting'],
    ['tmam bro', 'acknowledgement'],
    ['msh fahm', 'confusion'],
  ];

  for (const [prompt, intent] of social) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }

  const actionBearing = [
    'اهلااا يا معلم اشرح OAuth',
    'tmam bro debug this API',
    'msh fahm كمل الشرح',
    'مساء الخير راجع الكود ده',
  ];

  for (const prompt of actionBearing) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('keeps Arabizi language selection stable under filler and spelling noise', () => {
  for (const prompt of ['ezayak ya brooo', 'shokran ya m3lm', 'msh fahm']) {
    assert.equal(detectConversationLanguage(prompt), 'ar', prompt);
  }
});

test('preserves context-sensitive fallthrough for short confusion and frustration turns', () => {
  for (const prompt of ['msh fahm', 'msh sh8al']) {
    assert.equal(detectConversationalArchetype(prompt)?.intent === 'confusion' || detectConversationalArchetype(prompt)?.intent === 'frustration', true, prompt);
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});
