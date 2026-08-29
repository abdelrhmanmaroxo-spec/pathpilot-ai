import test from 'node:test';
import assert from 'node:assert/strict';
import { superLocalResponse } from './local-super-reasoner.js';

test('super local fallback returns user-facing guidance without internal pack details', () => {
  const answer = superLocalResponse({
    prompt: 'React search بطيء والواجهة RTL و English placeholder لسه عربي. شخص المشكلة واعمل خطوات إصلاح.',
    tool: 'qa',
    mode: 'work',
    preferences: { responseStyle: 'balanced' },
  });

  assert.ok(answer.length > 300);
  assert.match(answer, /React|واجهة|RTL|placeholder|اختبار|خطوات/i);
  assert.doesNotMatch(answer, /Expert Pack|deep-specialist|pro-specialist|expert-[a-z]|deep-[a-z]|pro-[a-z]|قاعدة المعرفة المحلية النشطة/i);
});

test('super local fallback keeps freshness boundaries without inventing current facts', () => {
  const answer = superLocalResponse({
    prompt: 'ايه أحدث سعر وإصدار متاح اليوم؟',
    tool: 'ask',
    mode: 'general',
    preferences: { responseStyle: 'concise' },
  });

  assert.match(answer, /البحث الحي|تأكيد|الحداثة|سعر|إصدار/i);
  assert.doesNotMatch(answer, /Expert Pack|RAG|knowledge pack/i);
});
