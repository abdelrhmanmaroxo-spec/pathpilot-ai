import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalizes noisy Egyptian social turns with punctuation and repeated letters', () => {
  assert.equal(normalizeConversationText('هـــــــــاي!!! يا معلم 😄'), 'هاي يا معلم');
  assert.equal(normalizeConversationText('shokraaaaan!!!'), 'shokran');
  assert.equal(normalizeConversationText('Mshhhh fahm???'), 'مش فاهم');
});

test('keeps concise contextual follow-ups on the reasoning path when prior context exists', () => {
  for (const prompt of ['لسه مش فاهم', 'مش شغال تاني', 'ممكن توضح؟', 'and then?', 'what next?']) {
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});

test('recognizes broader lightweight social variants without swallowing substantive requests', () => {
  const cases = [
    ['اهلا يا صاحبي', 'greeting'],
    ['تمام يا برنس', 'acknowledgement'],
    ['معلش يا معلم', 'apology'],
    ['انا كويس الحمد لله', 'positive_update'],
    ['لسه موجود؟', 'doing'],
    ['thanks a lot bro', 'thanks'],
  ];
  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }

  for (const prompt of [
    'تمام بس كمل الشرح',
    'اهلا اكتبلي ايميل',
    'thanks explain the next step',
    'محتاج مساعده في debug this API',
  ]) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('keeps Egyptian Arabizi language selection stable in mixed technical turns', () => {
  assert.equal(detectConversationLanguage('msh fahm OAuth'), 'ar');
  assert.equal(detectConversationLanguage('shokran bro'), 'ar');
  assert.equal(detectConversationLanguage('hello friend'), 'en');
});
