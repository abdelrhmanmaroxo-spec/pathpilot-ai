import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PathPilotApiError, createApiClient } from './api-client.js';

test('central API client returns JSON payloads', async () => {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.test/api/status');
      assert.equal(options.headers.get('Authorization'), 'Bearer token-1');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'server-123' },
      });
    },
    getToken: () => 'token-1',
  });

  const payload = await client.request('/api/status');
  assert.deepEqual(payload, { ok: true });
});

test('central API client normalizes server errors', async () => {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'Slow down', code: 'RATE_LIMITED' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'server-429' },
    }),
  });

  await assert.rejects(
    () => client.request('/api/test'),
    (error) => {
      assert.ok(error instanceof PathPilotApiError);
      assert.equal(error.code, 'RATE_LIMITED');
      assert.equal(error.status, 429);
      assert.equal(error.requestId, 'server-429');
      return true;
    },
  );
});

test('central API client converts aborts to stable error codes', async () => {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }),
  });

  await assert.rejects(
    () => client.request('/api/slow'),
    (error) => error instanceof PathPilotApiError && error.code === 'API_TIMEOUT',
  );
});
