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
