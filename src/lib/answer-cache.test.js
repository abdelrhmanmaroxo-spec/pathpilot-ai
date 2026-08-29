import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerCache, semanticSimilarity } from './answer-cache.js';

test('semantic similarity is high for near-identical stable requests', () => {
  assert.ok(semanticSimilarity('اشرح recursion في Python ببساطة', 'اشرح recursion في Python ببساطة') > 0.99);
});

test('returns a cached stable answer for a high-confidence match', () => {
  const cache = createAnswerCache({ threshold: 0.8 });
  cache.store({ mode: 'study', tool: 'explain', prompt: 'اشرح recursion في Python ببساطة', preferences: {}, result: { answer: 'answer', source: 'live', degraded: false } });
  const hit = cache.find({ mode: 'study', tool: 'explain', prompt: 'اشرح recursion في Python ببساطة', preferences: {} });
  assert.equal(hit.answer, 'answer');
  assert.equal(hit.source, 'semantic-cache');
});

test('does not cache freshness-sensitive answers', () => {
  const cache = createAnswerCache();
  const stored = cache.store({ mode: 'general', tool: 'ask', prompt: 'سعر الدولار اليوم كام؟', preferences: {}, result: { answer: 'x', source: 'live', degraded: false } });
  assert.equal(stored, false);
  assert.equal(cache.stats().entries, 0);
});

test('separates answers by response preferences', () => {
  const cache = createAnswerCache({ threshold: 0.8 });
  cache.store({ mode: 'general', tool: 'ask', prompt: 'اشرح recursion ببساطة', preferences: { responseStyle: 'concise' }, result: { answer: 'short', source: 'live', degraded: false } });
  const miss = cache.find({ mode: 'general', tool: 'ask', prompt: 'اشرح recursion ببساطة', preferences: { responseStyle: 'detailed' } });
  assert.equal(miss, null);
});

test('keeps deep-analysis answers separate from normal chat answers', () => {
  const cache = createAnswerCache({ threshold: 0.8 });
  cache.store({
    mode: 'general',
    tool: 'ask',
    prompt: 'قارن الخيارين',
    preferences: { responseStyle: 'balanced', deepThinkEnabled: true },
    result: { answer: 'deep', source: 'live', degraded: false },
  });
  const miss = cache.find({
    mode: 'general',
    tool: 'ask',
    prompt: 'قارن الخيارين',
    preferences: { responseStyle: 'balanced', deepThinkEnabled: false },
  });
  assert.equal(miss, null);
});

test('keeps automatic agent tool plans isolated in cache', () => {
  const cache = createAnswerCache({ threshold: 0.8 });
  cache.store({
    mode: 'general',
    tool: 'ask',
    prompt: 'اشرح OAuth ببساطة',
    preferences: { agentPlan: { mode: 'auto', toolIds: ['context_memory', 'rag_retriever', 'web_search'] } },
    result: { answer: 'grounded', source: 'live', degraded: false },
  });
  const miss = cache.find({
    mode: 'general',
    tool: 'ask',
    prompt: 'اشرح OAuth ببساطة',
    preferences: { agentPlan: { mode: 'auto', toolIds: ['context_memory', 'rag_retriever'] } },
  });
  assert.equal(miss, null);
});
