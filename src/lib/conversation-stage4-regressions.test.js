import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('keeps natural Egyptian social phrasing lightweight without overfamiliar assumptions', () => {
  const cases = [
    ['يا هلا', 'greeting'],
    ['يا هلا bro', 'greeting'],
    ['عامل ايه يا صاحبي', 'how_are_you'],
    ['مساء الفل يا معلم', 'evening_greeting'],
    ['thanks a lot يا صاحبي', 'thanks'],
  ];

  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }
});

test('normalizes mixed-language spelling variants before intent matching', () => {
  const variants = [
    ['إزّيــك؟؟', 'ازيك'],
    ['shokran!!!', 'shokran'],
    ['mshhhhh sh8aaal', 'مش شغال'],
    ['3ayzah msa3da', 'عايزه مساعده'],
  ];

  for (const [prompt, normalized] of variants) {
    assert.equal(normalizeConversationText(prompt), normalized, prompt);
  }
});

test('keeps substantive follow-ups on the full pipeline even when wrapped in casual wording', () => {
  for (const prompt of [
    'يا هلا كمل الشرح',
    'thanks يا صاحبي راجع الكود ده',
    'تمام bro explain the second part',
    'shokran بس debug this API',
    'عامل ايه؟ اكتبلي ايميل للعميل',
  ]) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('preserves context-sensitive fallthrough for unresolved states', () => {
  for (const prompt of ['لسه مش فاهم', 'msh fahm', 'لسه مش شغال', 'msh sh8al']) {
    assert.notEqual(detectConversationalArchetype(prompt), null, prompt);
    assert.equal(detectConversationalArchetype(prompt, { hasPriorContext: true }), null, prompt);
  }
});

test('does not infer grammatical gender from ambiguous English or social wording', () => {
  for (const prompt of ['hello there', 'thanks friend', 'how are you?', 'يا هلا يا صاحبي']) {
    const result = detectConversationalArchetype(prompt);
    assert.ok(result, prompt);
    assert.equal(result.language, prompt.includes('يا') ? 'ar' : 'en', prompt);
  }
});

test('keeps Arabizi language mode stable for code switching without forcing Arabic', () => {
  assert.equal(detectConversationLanguage('msh fahm React'), 'en');
  assert.equal(detectConversationLanguage('shokran for the help يا معلم'), 'ar');
  assert.equal(detectConversationLanguage('hello friend how are you'), 'en');
});
