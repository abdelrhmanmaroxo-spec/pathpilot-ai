import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversationQualityHints,
  detectConversationIntent,
  detectSelfReferenceGender,
  detectConversationLanguage,
  normalizeConversationText,
  resolveConversationGender,
  selectFreshVariant,
} from './conversation-quality.js';

test('normalizes expressive spelling, punctuation, and Arabic variants', () => {
  assert.equal(normalizeConversationText('إزّاييي؟؟  عامل   إيه!!!'), 'ازايي عامل ايه');
  assert.equal(normalizeConversationText('heyyyy!!!'), 'heyy');
});

test('detects Arabic, mixed, English, and unknown language modes', () => {
  assert.equal(detectConversationLanguage('ازيك'), 'ar');
  assert.equal(detectConversationLanguage('debug بالعربي'), 'ar-mixed');
  assert.equal(detectConversationLanguage('hello there'), 'en');
  assert.equal(detectConversationLanguage('123?!'), 'unknown');
});

test('keeps social turns lightweight but preserves action-bearing fallthrough', () => {
  assert.equal(detectConversationIntent('تماممم!!').intent, 'acknowledgement');
  assert.equal(detectConversationIntent('شكرا يا معلم').intent, 'thanks');
  assert.equal(detectConversationIntent('كمل الشرح عن OAuth').intent, 'substantive');
  assert.equal(detectConversationIntent('debug this API').lightweight, false);
});

test('accepts noisy Arabic and Arabizi social variants', () => {
  assert.equal(detectConversationIntent('هلووو!!!', { hasRelevantContext: true }).intent, 'greeting');
  assert.equal(detectConversationIntent('msh fahhhhhm??', { hasRelevantContext: true }).intent, 'confusion');
});

test('keeps standalone informational questions substantive and only uses context for short unresolved follow-ups', () => {
  assert.equal(detectConversationIntent('ليه السماء زرقا', { hasRelevantContext: true }).intent, 'substantive');
  assert.equal(detectConversationIntent('why is DNS cached', { hasRelevantContext: true }).intent, 'substantive');
  assert.equal(detectConversationIntent('طب وبعدين؟', { hasRelevantContext: true }).intent, 'contextual_follow_up');
});

test('accepts explicit or clear first-person gender evidence only', () => {
  assert.equal(detectSelfReferenceGender('أنا بنت ومحتاجة مساعدة'), 'female');
  assert.equal(detectSelfReferenceGender('انا ولد وعايز أبدأ'), 'male');
  assert.equal(detectSelfReferenceGender("I'm a woman and need help"), 'female');
  assert.equal(detectSelfReferenceGender('ana bnt w m7taga msa3da'), 'female');
  assert.equal(detectSelfReferenceGender('محمد محتاج مساعدة'), 'unknown');
  assert.equal(detectSelfReferenceGender('اسمها سارة وهي كويسة'), 'unknown');
});

test('newer strong self-reference overrides older context, ambiguity stays unknown', () => {
  assert.equal(resolveConversationGender([
    { content: 'انا ولد وعايز مساعدة' },
    { content: 'انا محتاجة شرح أبسط' },
  ]), 'female');
  assert.equal(resolveConversationGender([{ content: 'ممكن تساعدني؟' }]), 'unknown');
  assert.equal(resolveConversationGender([{ content: 'انا ولد وانا بنت' }]), 'unknown');
});

test('builds safe hints with current-turn evidence taking precedence over older turns', () => {
  const hints = buildConversationQualityHints('انا ولد وعايز أبدأ', { turns: [{ content: 'انا بنت' }] });
  assert.equal(hints.preserveLanguage, 'arabic');
  assert.equal(hints.gender, 'male');
  assert.equal(hints.useNeutralArabic, false);
  assert.equal(Object.prototype.hasOwnProperty.call(hints, 'genderLabel'), false);
});

test('ambiguous Arabic stays neutral instead of inheriting a weak cue', () => {
  const hints = buildConversationQualityHints('ازيك يا صاحبي', { turns: [{ content: 'محمد محتاج مساعدة' }] });
  assert.equal(hints.gender, 'unknown');
  assert.equal(hints.useNeutralArabic, true);
});

test('avoids immediate near-duplicate variant repetition after normalization', () => {
  assert.equal(selectFreshVariant(['تمام، نكمل', 'حاضر، نبدأ'], ['تمام نكمل']), 'حاضر، نبدأ');
  assert.equal(selectFreshVariant(['a', 'b'], ['a', 'b']), 'a');
});
