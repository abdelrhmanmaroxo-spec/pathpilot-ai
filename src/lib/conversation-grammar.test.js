import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptArabicConversationalReply,
  detectStrongUserGrammaticalGender,
  inferUserGrammaticalGender,
  parseGrammarGenderHint,
} from './conversation-grammar.js';

test('detects explicit self-identification without using names or second-person guesses', () => {
  assert.equal(detectStrongUserGrammaticalGender('انا بنت'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('أنا راجل'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('I am a woman'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('I am male'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('اسمها سارة'), null);
  assert.equal(detectStrongUserGrammaticalGender('انتي بنت؟'), null);
});

test('detects strong first-person Arabic grammatical forms', () => {
  assert.equal(detectStrongUserGrammaticalGender('انا محتاجة مساعدة'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('أنا جاهزة'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('انا محتاج مساعدة'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('أنا تعبان'), 'male');
});

test('newest strong prior signal wins when no current signal exists', () => {
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'عامل ايه؟',
    priorUserPrompts: ['انا ولد', 'موضوع عادي', 'انا بنت'],
  }), 'female');
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'عامل ايه؟',
    priorUserPrompts: ['انا بنت', 'انا ولد'],
  }), 'male');
});

test('current self-reference overrides older context', () => {
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'انا ولد، عامل ايه؟',
    priorUserPrompts: ['انا بنت'],
  }), 'male');
});

test('parses only the explicit grammar hint line from context', () => {
  assert.equal(parseGrammarGenderHint('User grammatical form for Arabic address: feminine'), 'female');
  assert.equal(parseGrammarGenderHint('User grammatical form for Arabic address: masculine'), 'male');
  assert.equal(parseGrammarGenderHint('User grammatical form for Arabic address: unknown'), null);
});

test('adapts Arabic conversational wording for feminine and neutral address', () => {
  const base = 'تمام الحمد لله، وجاهز لك. عامل إيه إنت؟ أنا معاك.';
  const female = adaptArabicConversationalReply(base, 'female');
  assert.match(female, /عاملة إيه إنتِ/);
  assert.match(female, /أنا معاكي/);

  const neutral = adaptArabicConversationalReply('تمام يا معلم 🙌 موجود معاك. عامل إيه إنت؟', null);
  assert.doesNotMatch(neutral, /يا معلم|عامل إيه إنت/);
});
