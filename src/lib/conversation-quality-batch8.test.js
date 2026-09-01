import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectStrongUserGrammaticalGender,
  inferUserGrammaticalGender,
  adaptArabicConversationalReply,
} from './conversation-grammar.js';
import {
  detectConversationalArchetype,
  normalizeConversationText,
  detectConversationLanguage,
} from './conversation-intent.js';

test('covers punctuation, repeated-letter noise, and Arabic/English code switching', () => {
  const noisyArabic = normalizeConversationText('  هــــلّاااا!!!  ');
  const noisyArabizi = normalizeConversationText('Mshhhhh fahm???');
  const mixed = normalizeConversationText('Thanks يا معلم!!!');

  assert.equal(noisyArabic, 'هلا');
  assert.equal(noisyArabizi, 'مش فاهم');
  assert.equal(mixed, 'thanks يا معلم');
  assert.equal(detectConversationLanguage('Mshhhhh fahm'), 'ar');
});

test('keeps lightweight social turns broad but preserves action-bearing fallthrough', () => {
  for (const [prompt, intent] of [
    ['هاي يا معلم', 'greeting'],
    ['شكرا اوي', 'thanks'],
    ['معلش', 'apology'],
    ['لسه مش شغال خالص', 'frustration'],
    ['انا كويسة', 'positive_update'],
    ['تصبحي على خير', 'goodbye'],
  ]) assert.equal(detectConversationalArchetype(prompt)?.intent, intent, prompt);

  for (const prompt of [
    'شكرا كمل شرح OAuth',
    'تمام debug this function',
    'هاي اكتبلي ايميل رسمي',
    'معلش حلل البيانات دي',
    'msh fahm explain refresh tokens',
  ]) assert.equal(detectConversationalArchetype(prompt), null, prompt);
});

test('uses explicit or strong first-person gender evidence only', () => {
  assert.equal(detectStrongUserGrammaticalGender('أنا بنت'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('انا أنثى'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('أنا ولد'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('انا مستعدة'), 'female');
  assert.equal(detectStrongUserGrammaticalGender('انا مستعد'), 'male');
  assert.equal(detectStrongUserGrammaticalGender('اسمها سارة'), null);
  assert.equal(detectStrongUserGrammaticalGender('انتي بنت؟'), null);
  assert.equal(detectStrongUserGrammaticalGender('هي محتاجة مساعدة'), null);
});

test('latest strong self-reference overrides older context while ambiguity preserves the newest strong hint', () => {
  assert.equal(inferUserGrammaticalGender({ latestPrompt: 'انا كويسة', priorUserPrompts: ['انا كويس'] }), 'female');
  assert.equal(inferUserGrammaticalGender({ latestPrompt: 'انا كويس', priorUserPrompts: ['انا كويسة'] }), 'male');
  assert.equal(inferUserGrammaticalGender({ latestPrompt: 'تمام', priorUserPrompts: ['انا كويسة'] }), 'female');
  assert.equal(inferUserGrammaticalGender({ latestPrompt: 'انا كويسة وانا كويس', priorUserPrompts: [] }), null);
});

test('keeps gender adaptation scoped to wording and neutral when unknown', () => {
  const reply = 'أهلًا بيك، تحب نشتغل على إيه؟ أنا معاك في أي وقت.';
  const female = adaptArabicConversationalReply(reply, 'female');
  const neutral = adaptArabicConversationalReply(reply, null);

  assert.equal(female.includes('بيكي'), true);
  assert.equal(female.includes('تحبي'), true);
  assert.equal(female.includes('معاكي'), true);
  assert.equal(adaptArabicConversationalReply(reply, 'male'), reply);
  assert.equal(neutral.includes('بيك'), false);
  assert.equal(neutral.includes('تحب'), false);
  assert.equal(neutral.includes('معاك'), false);
  assert.equal(neutral.includes('أهلًا'), true);
});

test('does not force Arabic gender wording into English responses', () => {
  const english = 'Thanks, you can continue whenever you want.';
  assert.equal(adaptArabicConversationalReply(english, 'female'), english);
  assert.equal(adaptArabicConversationalReply(english, 'male'), english);
  assert.equal(adaptArabicConversationalReply(english, null), english);
});
