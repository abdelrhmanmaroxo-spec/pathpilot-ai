import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationalArchetype,
  detectConversationLanguage,
} from './conversation-intent.js';

const intent = (prompt, options = {}) => detectConversationalArchetype(prompt, options)?.intent || null;

test('recognizes common Egyptian and Arabizi social variants without heavy routing', () => {
  const cases = [
    ['اهلا يا معلم', 'greeting'],
    ['ya hala bro', 'greeting'],
    ['ازيك يا صاحبي', 'how_are_you'],
    ['ezzayek ya friend', 'how_are_you'],
    ['شكرا اوي', 'thanks'],
    ['shokran gedan', 'thanks'],
    ['تمام يا باشا', 'acknowledgement'],
    ['tmam ya bro', 'acknowledgement'],
    ['يلا بينا', 'ready'],
    ['yalla bina', 'ready'],
    ['معلش يا صاحبي', 'apology'],
    ['ma3lesh bro', 'apology'],
    ['لسه مش فاهم خالص', 'confusion'],
    ['still dont understand', 'confusion'],
    ['لسه مش شغال خالص', 'frustration'],
    ['this still isnt working', 'frustration'],
    ['ضحكني 😂', null],
  ];

  for (const [prompt, expected] of cases) assert.equal(intent(prompt), expected, prompt);
});

test('keeps Arabic-first code switching stable when English appears as a filler or product word', () => {
  assert.equal(detectConversationLanguage('عايز أراجع the second part'), 'ar');
  assert.equal(detectConversationLanguage('ممكن تساعدني في OAuth؟'), 'ar');
  assert.equal(detectConversationLanguage('can you help me with OAuth'), 'en');
});

test('does not steal action-bearing requests from the reasoning pipeline', () => {
  const actionPrompts = [
    'شكرا، بس كمل شرح OAuth',
    'تمام، explain the second part',
    'معلش اصلح الكود ده',
    'yalla write an email for me',
    'ممكن تساعدني في تحليل المشروع؟',
  ];

  for (const prompt of actionPrompts) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('treats short contextual follow-ups as context-sensitive instead of broad social replies', () => {
  for (const prompt of ['طب؟', 'وده؟', 'and this?', 'what about that?']) {
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});
