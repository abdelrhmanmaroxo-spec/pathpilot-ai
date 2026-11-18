import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectDominantLanguage,
  resolveTurnForLanguage,
  translateMarkdownSync,
  translateThinkingTraceSync,
} from './live-content-translator.js';

test('translateMarkdownSync converts generated Arabic summaries to English while preserving code blocks', () => {
  const arabic = '### ملخص ذكي للمواد (2 مواد · 120 كلمة · قراءة ~1 دقائق)\n- **زاوية التركيز المطلوبة:** التعلم العميق\n```js\nconst x = 1;\n```';
  const english = translateMarkdownSync(arabic, 'en');
  assert.match(english, /Smart Material Summary/);
  assert.match(english, /Requested Focus Angle:/);
  assert.match(english, /const x = 1;/);
});

test('translateMarkdownSync converts English generated headings back to Arabic cleanly', () => {
  const english = '### 1. Shared Concepts & Pillars Across Materials\n- Artificial intelligence and neural networks';
  const arabic = translateMarkdownSync(english, 'ar');
  assert.match(arabic, /القواسم والمفاهيم المشتركة بين المواد/);
  assert.match(arabic, /الذكاء الاصطناعي/);
});

test('resolveTurnForLanguage and translateThinkingTraceSync flip turn outputs bidirectionally', () => {
  const turn = {
    id: 't1',
    prompt: 'المحاضرة 1',
    answer: '### الخلاصة\nشرح مبسّط حول قواعد البيانات العلائقية.',
    thinkingTrace: {
      steps: [{ id: 's1', title: '١. تفكيك الهدف وحدود المطلوب', detail: 'التركيز على العلاقات السببية والروابط البنيوية للموضوع.' }],
    },
  };
  const enTurn = resolveTurnForLanguage(turn, 'en');
  assert.match(enTurn.prompt, /Lecture 1/);
  assert.match(enTurn.answer, /Executive Summary/);
  assert.match(enTurn.thinkingTrace.steps[0].title, /Decompose Goal & Scope/);

  const backToAr = translateThinkingTraceSync(enTurn.thinkingTrace, 'ar');
  assert.match(backToAr.steps[0].title, /تفكيك الهدف وحدود المطلوب/);
  assert.equal(detectDominantLanguage('Hello world study summary'), 'en');
  assert.equal(detectDominantLanguage('ملخص شامل للمحاضرة الأولى'), 'ar');
});
