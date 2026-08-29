import test from 'node:test';
import assert from 'node:assert/strict';
import { extractKeywords, generateDemoResponse, TOOL_LIBRARY } from './assistant.js';

test('each workspace exposes four focused tools', () => {
  assert.equal(TOOL_LIBRARY.study.length, 4);
  assert.equal(TOOL_LIBRARY.work.length, 4);
});

test('keyword extraction returns useful repeated terms', () => {
  const result = extractKeywords('React يساعد في بناء واجهات. React مناسب لتجربة المستخدم.');
  assert.equal(result[0], 'react');
});

test('study generator returns a structured answer', () => {
  const answer = generateDemoResponse({ mode: 'study', tool: 'plan', prompt: 'امتحان Python بعد أسبوع' });
  assert.match(answer, /خطة مذاكرة/);
  assert.match(answer, /اليوم 7/);
});

test('CV generator warns against fabricated metrics', () => {
  const answer = generateDemoResponse({ mode: 'work', tool: 'cv', prompt: 'اختبرت ردود نموذج ذكاء اصطناعي' });
  assert.match(answer, /لا تضف مقاييس تقديرية/);
});
