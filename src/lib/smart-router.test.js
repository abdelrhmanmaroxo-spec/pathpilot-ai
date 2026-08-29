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

test('fresh requests bypass answer cache', () => {
  assert.equal(shouldBypassAnswerCache('سعر الدولار اليوم'), true);
  assert.equal(shouldBypassAnswerCache('اشرح لي recursion', 'explain'), false);
});
