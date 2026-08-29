import test from 'node:test';
import assert from 'node:assert/strict';
import { needsFreshResearch, routeAssistantRequest, shouldBypassAnswerCache } from './smart-router.js';

test('routes explicit current and research requests to web research', () => {
  assert.equal(needsFreshResearch('ايه أحدث إصدار من Node دلوقتي؟'), true);
  assert.equal(needsFreshResearch('search the web for current prices'), true);
  assert.equal(routeAssistantRequest({ prompt: 'وظائف AI المتاحة اليوم', tool: 'ask' }).route, 'research');
});

test('routes transformations to direct AI when freshness is not required', () => {
  assert.equal(routeAssistantRequest({ prompt: 'حسن الرسالة دي وخليها احترافية', tool: 'rewrite' }).route, 'direct-ai');
  assert.equal(routeAssistantRequest({ prompt: 'لخص النص التالي', tool: 'summarize' }).route, 'direct-ai');
});

test('research tool always requests grounding', () => {
  assert.equal(needsFreshResearch('تاريخ قواعد البيانات', 'research'), true);
});

test('chat search toggle forces grounded research for stable questions', () => {
  const result = routeAssistantRequest({
    prompt: 'اشرح DNS ببساطة',
    tool: 'ask',
    hasResearch: true,
    hasDirectAI: true,
    forceResearch: true,
  });
  assert.equal(result.route, 'research');
  assert.equal(result.reason, 'user-enabled-search');
  assert.equal(shouldBypassAnswerCache('اشرح DNS ببساطة', 'ask', { forceResearch: true }), true);
});

test('search toggle degrades safely when research is unavailable', () => {
  const result = routeAssistantRequest({
    prompt: 'اشرح DNS ببساطة',
    tool: 'ask',
    hasResearch: false,
    hasDirectAI: true,
    forceResearch: true,
  });
  assert.equal(result.route, 'direct-ai');
});

test('fresh requests bypass answer cache', () => {
  assert.equal(shouldBypassAnswerCache('سعر الدولار اليوم'), true);
  assert.equal(shouldBypassAnswerCache('اشرح لي recursion', 'explain'), false);
});
