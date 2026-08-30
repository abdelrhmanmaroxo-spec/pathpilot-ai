import test from 'node:test';
import assert from 'node:assert/strict';
import { naturalLocalResponse } from './natural-local-response.js';

test('tight React versus Vue decision returns a direct concise recommendation', () => {
  const answer = naturalLocalResponse({
    prompt: 'فريقي يعرف JavaScript وعندنا 6 أسابيع. اختار React ولا Vue بقرار واحد وسببين مختصرين.',
  });

  assert.match(answer, /القرار: \*\*Vue\*\*/);
  assert.match(answer, /1\./);
  assert.match(answer, /2\./);
  assert.doesNotMatch(answer, /3\.|Local Intelligence|خطة المعالجة|المجالات الأقرب/);
});

test('career-focused React versus Vue decision prioritizes React', () => {
  const answer = naturalLocalResponse({
    prompt: 'React ولا Vue؟ هدفي الأساسي portfolio وشغل، اديني 3 أسباب.',
  });

  assert.match(answer, /القرار: \*\*React\*\*/);
  assert.match(answer, /3\./);
});

test('unknown named options ask for one decisive criterion instead of dumping knowledge', () => {
  const answer = naturalLocalResponse({ prompt: 'اختار Svelte ولا Solid بقرار واضح.' });
  assert.match(answer, /أهم معيار واحد/);
  assert.doesNotMatch(answer, /PathPilot Local|خطة المعالجة/);
});
