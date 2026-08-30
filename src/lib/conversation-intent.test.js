import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectConversationLanguage,
  detectConversationalArchetype,
  normalizeConversationText,
} from './conversation-intent.js';

test('normalizes Arabic noise without destroying Latin words in mixed messages', () => {
  assert.equal(normalizeConversationText('  عـــاش!!! Thanks يا معلم 😄 '), 'عاش thanks يا معلم');
  assert.equal(normalizeConversationText('إزّيــك؟؟'), 'ازيك');
  assert.equal(normalizeConversationText('Hiiiii ya bro!!!'), 'hi ya bro');
});

test('detects lightweight archetypes across Arabic Egyptian and English', () => {
  const cases = [
    ['صباح الخير', 'morning_greeting'],
    ['عامل ايه؟', 'how_are_you'],
    ['thanks', 'thanks'],
    ['تمام كده', 'acknowledgement'],
    ['ايوه تمام', 'acknowledgement'],
    ['يلا نبدأ', 'ready'],
    ['شجعني', 'encouragement'],
    ['انا تمام', 'positive_update'],
    ['I am confused', 'confusion'],
    ['good night', 'goodbye'],
    ['take care', 'goodbye'],
    ['are you a bot?', 'identity'],
    ['are you there?', 'doing'],
    ['لسه معايا؟', 'doing'],
  ];

  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }
});

test('recognizes embedded social states instead of requiring exact whole-message matches', () => {
  assert.equal(detectConversationalArchetype('اهلا عامل ايه يا معلم')?.intent, 'how_are_you');
  assert.equal(detectConversationalArchetype('صباح الخير يا صاحبي')?.intent, 'morning_greeting');
  assert.equal(detectConversationalArchetype('good evening my friend')?.intent, 'evening_greeting');
  assert.equal(detectConversationalArchetype('شجعني شويه يا معلم')?.intent, 'encouragement');
  assert.equal(detectConversationalArchetype('ممكن تساعدني يا صاحبي')?.intent, 'vague_help');
  assert.equal(detectConversationalArchetype('لسه مش فاهم خالص')?.intent, 'confusion');
  assert.equal(detectConversationalArchetype('this still isnt working')?.intent, 'frustration');
  assert.equal(detectConversationalArchetype('انا كويس يا معلم')?.intent, 'positive_update');
});

test('understands common Egyptian Arabizi and responds in Arabic mode', () => {
  const cases = [
    ['ezayak', 'how_are_you'],
    ['3amel eh?', 'how_are_you'],
    ['akhbarak ya bro', 'how_are_you'],
    ['shokran ya bro', 'thanks'],
    ['tmam ya m3lm', 'acknowledgement'],
    ['mashy bro', 'acknowledgement'],
    ['yalla bina', 'ready'],
    ['ma3lesh', 'apology'],
    ['salam ya bro', 'goodbye'],
  ];

  for (const [prompt, intent] of cases) {
    const result = detectConversationalArchetype(prompt);
    assert.equal(result?.intent, intent, prompt);
    assert.equal(result?.language, 'ar', prompt);
  }
});

test('handles reciprocal status checks naturally in Arabic and English', () => {
  for (const prompt of ['وانت؟', 'وانتي؟', 'وانتو؟', 'and you?', 'what about you?']) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, 'how_are_you', prompt);
  }
});

test('handles natural mixed-language social turns while ignoring harmless fillers', () => {
  const cases = [
    ['thanks يا معلم', 'thanks'],
    ['thanks so much يا معلم بجد', 'thanks'],
    ['تمام bro', 'acknowledgement'],
    ['ايوه يا bro تمام', 'acknowledgement'],
    ['hello يا صاحبي', 'greeting'],
    ['عاش great', 'compliment'],
    ['bye يا معلم', 'goodbye'],
    ['طيب تمام يا bro', 'acknowledgement'],
    ['براحتك يا معلم', 'acknowledgement'],
  ];

  for (const [prompt, intent] of cases) {
    assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);
  }
});

test('does not swallow action-bearing messages just because they contain social wording', () => {
  for (const prompt of [
    'thanks بس كمل الشرح',
    'تمام explain the second part',
    'شكرا وضح refresh token',
    'hello اكتبلي ايميل',
    'cool now debug this function',
    'ممكن تساعدني في تحليل OAuth؟',
    'can you help me analyze this API?',
    'ايوه تمام كمل اللي بعده',
    'thanks now draft an email',
    'تمام راجع الكود ده',
    'shokran explain OAuth',
    'tmam debug this',
  ]) {
    assert.equal(detectConversationalArchetype(prompt), null, prompt);
  }
});

test('lets context-sensitive confusion and frustration fall through when prior context exists', () => {
  assert.equal(detectConversationalArchetype('مش فاهم')?.intent, 'confusion');
  assert.equal(detectConversationalArchetype('مش فاهم', { hasPriorContext: true }), null);
  assert.equal(detectConversationalArchetype('لسه مش فاهم خالص', { hasPriorContext: true }), null);
  assert.equal(detectConversationalArchetype('مش شغال')?.intent, 'frustration');
  assert.equal(detectConversationalArchetype('لسه مش شغال', { hasPriorContext: true }), null);
});

test('rejects long or substantive text from the lightweight social path', () => {
  assert.equal(detectConversationalArchetype('ممكن تساعدني في تحليل OAuth؟'), null);
  assert.equal(detectConversationalArchetype('thanks ' + 'word '.repeat(30)), null);
});

test('language detection keeps Arabic-first code switching natural without hijacking English-dominant turns', () => {
  assert.equal(detectConversationLanguage('thanks يا معلم'), 'ar');
  assert.equal(detectConversationLanguage('تمام React'), 'ar');
  assert.equal(detectConversationLanguage('thanks friend يا'), 'en');
  assert.equal(detectConversationLanguage('hello friend how are you يا'), 'en');
  assert.equal(detectConversationLanguage('ezayak ya bro'), 'ar');
  assert.equal(detectConversationLanguage('3amel eh'), 'ar');
  assert.equal(detectConversationLanguage('shokran'), 'ar');
  assert.equal(detectConversationLanguage('hello friend'), 'en');
});
