import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProviderResilientFetch } from './provider-resilience.js';

test('retries transient provider responses and returns recovery response', async () => {
  let calls = 0;
  const resilient = createProviderResilientFetch(async () => {
    calls += 1;
    return new Response('{}', { status: calls === 1 ? 503 : 200 });
  }, { maxRetries: 1, baseDelayMs: 1 });

  const response = await resilient('https://api.tavily.com/search', { method: 'POST' });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test('opens a provider circuit after repeated failures', async () => {
  let calls = 0;
  const resilient = createProviderResilientFetch(async () => {
    calls += 1;
    return new Response('{}', { status: 503 });
  }, { maxRetries: 0, failureThreshold: 1, cooldownMs: 60_000 });

  const first = await resilient('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent', { method: 'POST' });
  assert.equal(first.status, 503);
  await assert.rejects(
    () => resilient('https://generativelanguage.googleapis.com/v1beta/models/x:generateContent', { method: 'POST' }),
    /CIRCUIT_OPEN_GEMINI/,
  );
  assert.equal(calls, 1);
});

test('limits concurrent requests per provider', async () => {
  let active = 0;
  let maxActive = 0;
  const resilient = createProviderResilientFetch(async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return new Response('{}', { status: 200 });
  }, { maxConcurrency: 1, maxRetries: 0 });

  await Promise.all([
    resilient('https://api.tavily.com/search'),
    resilient('https://api.tavily.com/search'),
    resilient('https://api.tavily.com/search'),
  ]);
  assert.equal(maxActive, 1);
});

test('caches identical Tavily POST requests without retaining api key in cache identity', async () => {
  let calls = 0;
  const resilient = createProviderResilientFetch(async () => {
    calls += 1;
    return new Response(JSON.stringify({ answer: `result-${calls}` }), { status: 200, headers: { 'content-type': 'application/json' } });
  }, { maxRetries: 0, researchCacheTtlMs: 60_000 });

  const firstInit = { method: 'POST', body: JSON.stringify({ api_key: 'secret-one', query: 'same query', max_results: 8 }) };
  const secondInit = { method: 'POST', body: JSON.stringify({ api_key: 'secret-two', query: 'same query', max_results: 8 }) };
  const first = await resilient('https://api.tavily.com/search', firstInit);
  const second = await resilient('https://api.tavily.com/search', secondInit);

  assert.equal((await first.json()).answer, 'result-1');
  assert.equal((await second.json()).answer, 'result-1');
  assert.equal(calls, 1);
  assert.equal(resilient.getState().researchCache.entries, 1);
});

test('expires Tavily cache entries after TTL', async () => {
  let calls = 0;
  const resilient = createProviderResilientFetch(async () => {
    calls += 1;
    return new Response(JSON.stringify({ calls }), { status: 200 });
  }, { maxRetries: 0, researchCacheTtlMs: 1 });
  const init = { method: 'POST', body: JSON.stringify({ api_key: 'secret', query: 'freshness test' }) };

  await resilient('https://api.tavily.com/search', init);
  await new Promise((resolve) => setTimeout(resolve, 4));
  await resilient('https://api.tavily.com/search', init);
  assert.equal(calls, 2);
});
