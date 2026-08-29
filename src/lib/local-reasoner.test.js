import test from 'node:test';
import assert from 'node:assert/strict';
import { advancedLocalResponse, detectLocalIntent, extractLocalEntities } from './local-reasoner.js';

test('local reasoner detects comparison intent', () => {
  assert.equal(detectLocalIntent('قارن بين React و Vue للمبتدئين'), 'comparison');
});

test('local reasoner detects research intent for fresh information', () => {
  assert.equal(detectLocalIntent('ابحث عن آخر تحديثات Gemini API مع المصادر'), 'research');
});

test('local entity extraction keeps technical terms', () => {
  const entities = extractLocalEntities('عايز أصلح React API timeout في PathPilot');
  assert.ok(entities.includes('react'));
  assert.ok(entities.includes('api'));
});

test('advanced local response exposes plan and freshness boundary', () => {
  const answer = advancedLocalResponse({
    prompt: 'ابحث عن آخر تحديثات Gemini API وخصّصها في نقاط مع المصادر',
    tool: 'ask',
    mode: 'general',
    preferences: { responseStyle: 'detailed' },
  });
  assert.match(answer, /PathPilot Local Reasoner/);
  assert.match(answer, /نوع المهمة: research/);
  assert.match(answer, /خطة التفكير/);
  assert.match(answer, /معلومات زمنية أو متغيرة/);
  assert.match(answer, /ai/i);
});

test('advanced local response adapts QA requests into diagnosis', () => {
  const answer = advancedLocalResponse({ prompt: 'زر تسجيل الدخول بيقع بعد الضغط', tool: 'qa', mode: 'work' });
  assert.match(answer, /نوع المهمة: diagnosis/);
  assert.match(answer, /حدد المتوقع والفعلي/);
});
