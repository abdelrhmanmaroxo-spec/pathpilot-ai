import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalization absorbs expressive spelling without changing intent-bearing words', () => {
  const cases = [
    ['heeey!!!', 'hey'],
    ['تــــمــــام؟؟', 'تمام'],
    ['mshhhh fahmmmm', 'مش فاهم'],
    ['  شكراااا يا معلم 😄 ', 'شكرا يا معلم'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeConversationText(input), expected, input);
  }
});

test('covers common lightweight conversational directions across dialects', () => {
  const cases = [
    ['sure', 'acknowledgement'],
    ['تمام يا باشا', 'acknowledgement'],
    ['my bad', 'apology'],
    ['معلش يا صاحبي', 'apology'],
    ['you still there?', 'doing'],
    ['لسه موجود؟', 'doing'],
    ['good luck', 'encouragement'],
    ['بالتوفيق', 'encouragement'],
    ['see ya', 'goodbye'],
    ['تصبح على خير', 'goodbye'],
    ['what can you do?', 'capability'],
    ['انت بتعرف تعمل ايه', 'capability'],
  ];
  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }
});

test('keeps Arabic-first mode for Egyptian Arabizi even with expressive noise', () => {
  for (const prompt of ['heeey ya bro', 'shokraaan ya m3lm', 'tmamaaa', 'mshhhh fahm']) {
    const result = detectConversationalArchetype(prompt);
    assert.equal(result?.language, 'ar', prompt);
  }
});

test('does not classify action-bearing mixed turns as lightweight social chatter', () => {
  for (const prompt of [
    'hey can you explain refresh tokens?',
    'تمام كمل شرح OAuth',
    'msh fahm debug this function',
    'thanks rewrite the email',
    'معلش حل المشكلة دي',
  ]) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('keeps explicit self-reference and ambiguity boundaries intact', () => {
  for (const prompt of ['انا بنت', 'أنا أنثى', 'انا ولد', 'I am a woman', 'I am male']) {
    assert.notEqual(prompt, '');
  }
  assert.equal(detectConversationalArchetype('انتي بنت؟')?.intent, undefined);
  assert.equal(detectConversationLanguage('hello friend'), 'en');
});
