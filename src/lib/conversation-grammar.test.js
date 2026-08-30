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
  assert.equal(detectStrongUserGrammaticalGender('أنا أنثى'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('انا ذكر'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('I am a woman'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('I am male'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('اسمها سارة'), null);
  assert.equal(detectStrongUserGrammaticalGender('انتي بنت؟'), null);
});

test('detects strong direct first-person Arabic grammatical forms', () => {
  const female = [
    'انا محتاجة مساعدة',
    'أنا بجد جاهزة',
    'انا عايزة اكمل',
    'انا كويسة',
    'انا قلقانة',
    'انا مضغوطة',
    'انا متضايقة',
    'انا مرهقة',
    'انا مستعدة',
  ];
  const male = [
    'انا محتاج مساعدة',
    'أنا تعبان',
    'انا عايز اكمل',
    'انا كويس',
    'انا قلقان',
    'انا مضغوط',
    'انا متضايق',
    'انا مرهق',
    'انا مستعد',
  ];

  for (const prompt of female) assert.equal(detectStrongUserGrammaticalGender(prompt), 'female', prompt);
  for (const prompt of male) assert.equal(detectStrongUserGrammaticalGender(prompt), 'male', prompt);
});

test('does not attribute another person grammatical wording to the user', () => {
  assert.equal(detectStrongUserGrammaticalGender('انا قلت هي محتاجة مساعدة'), null);
  assert.equal(detectStrongUserGrammaticalGender('انا شايف إن صاحبي تعبان'), null);
  assert.equal(detectStrongUserGrammaticalGender('هي محتاجة مساعدة وانا هساعدها'), null);
  assert.equal(detectStrongUserGrammaticalGender('سارة عايزة تكمل'), null);
  assert.equal(detectStrongUserGrammaticalGender('هو مضغوط اليومين دول'), null);
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
  assert.equal(inferUserGrammaticalGender({
    latestPrompt: 'انا مستعدة نكمل',
    priorUserPrompts: ['انا ولد'],
  }), 'female');
});

test('parses only the explicit grammar hint line from context', () => {
  assert.equal(parseGrammarGenderHint('User grammatical form for Arabic address: feminine'), 'female');
  assert.equal(parseGrammarGenderHint('User grammatical form for Arabic address: masculine'), 'male');
  assert.equal(parseGrammarGenderHint('User grammatical form for Arabic address: unknown'), null);
});

test('adapts Arabic conversational wording for feminine address across common casual forms', () => {
  const base = 'أهلًا بيك. تحب نشتغل على إيه؟ تمام الحمد لله. عامل إيه إنت؟ أنا معاك. وقت ما تحب.';
  const female = adaptArabicConversationalReply(base, 'female');
  assert.match(female, /أهلًا بيكي/);
  assert.match(female, /تحبي نشتغل/);
  assert.match(female, /عاملة إيه إنتِ/);
  assert.match(female, /أنا معاكي/);
  assert.match(female, /وقت ما تحبي/);
});

test('neutral fallback removes avoidable masculine address instead of guessing', () => {
  const base = [
    'أهلًا بيك. تحب نشتغل على إيه؟',
    'تمام يا معلم 🙌 موجود معاك. عامل إيه إنت؟',
    'شد حيلك 🔥 ركّز على اللي تقدر تعمله دلوقتي.',
    'اعمل أول خطوة، وخلّص الخطوة اللي بعدها.',
    'نكمل وقت ما تحب، والمهم إن الموضوع ظبط معاك.',
  ].join(' ');
  const neutral = adaptArabicConversationalReply(base, null);

  assert.doesNotMatch(neutral, /يا معلم|أهلًا بيك|تحب نشتغل|عامل إيه إنت|معاك|وقت ما تحب|شد حيلك|تقدر تعمله|اعمل أول|خلّص الخطوة/);
  assert.match(neutral, /أهلًا|نشتغل على إيه|إيه أخبارك|خلينا نركز|ممكن يتعمل|في أي وقت/);
});

test('male adaptation preserves natural masculine wording when strongly supported', () => {
  const base = 'أهلًا بيك. عامل إيه إنت؟ أنا معاك. وقت ما تحب.';
  assert.equal(adaptArabicConversationalReply(base, 'male'), base);
});
