import test from 'node:test';
import assert from 'node:assert/strict';
import { extractKeywords, generateDemoResponse, TOOL_LIBRARY } from './assistant.js';

test('three workspaces expose eighteen focused tools', () => {
  assert.equal(TOOL_LIBRARY.study.length, 6);
  assert.equal(TOOL_LIBRARY.work.length, 6);
  assert.equal(TOOL_LIBRARY.general.length, 6);
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

test('email output is personalized without exposing the developer identity', () => {
  const anonymous = generateDemoResponse({ mode: 'work', tool: 'email', prompt: 'متابعة طلب الوظيفة' });
  const personalized = generateDemoResponse({
    mode: 'work',
    tool: 'email',
    prompt: 'متابعة طلب الوظيفة',
    preferences: { displayName: 'سارة أحمد' },
  });
  assert.doesNotMatch(anonymous, /Abdelrhman|عبدالرحمن/i);
  assert.match(personalized, /سارة أحمد/);
});

test('concise mode returns a shorter useful response', () => {
  const balanced = generateDemoResponse({ mode: 'study', tool: 'explain', prompt: 'الشبكات العصبية' });
  const concise = generateDemoResponse({
    mode: 'study',
    tool: 'explain',
    prompt: 'الشبكات العصبية',
    preferences: { responseStyle: 'concise' },
  });
  assert.ok(concise.length < balanced.length);
  assert.match(concise, /شرح مبسّط/);
});

test('new public tools generate usable structured output', () => {
  const cards = generateDemoResponse({ mode: 'study', tool: 'flashcards', prompt: 'قواعد البيانات والشبكات' });
  const cover = generateDemoResponse({ mode: 'work', tool: 'cover', prompt: 'دعم فني وحل المشكلات' });
  const general = generateDemoResponse({ mode: 'general', tool: 'brainstorm', prompt: 'أفكار مشروع يساعد الطلبة' });
  const research = generateDemoResponse({ mode: 'study', tool: 'research', prompt: 'تأثير الذكاء الاصطناعي على التعليم' });
  const quality = generateDemoResponse({ mode: 'work', tool: 'qa', prompt: 'زر تسجيل الدخول لا يستجيب على الهاتف' });
  assert.match(cards, /بطاقات المراجعة/);
  assert.match(cover, /خطاب تقديم/);
  assert.match(general, /أفكار حول/);
  assert.match(research, /خريطة بحث/);
  assert.match(quality, /تقرير جودة/);
});
