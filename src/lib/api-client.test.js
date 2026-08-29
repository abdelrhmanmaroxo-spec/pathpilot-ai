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

test('central API client serializes explicit json payloads without leaking client metadata to fetch', async () => {
  const client = createApiClient({
    baseUrl: 'https://example.test/',
    sendClientRequestId: true,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.test/api/profile');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.get('Content-Type'), 'application/json');
      assert.equal(options.headers.get('X-Request-ID'), 'client-123');
      assert.equal(options.body, JSON.stringify({ displayName: 'Path Pilot' }));
      assert.equal('json' in options, false);
      assert.equal('requestId' in options, false);
      assert.equal('timeoutMs' in options, false);
      return new Response(JSON.stringify({ saved: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'server-123' },
      });
    },
  });

  const payload = await client.request('/api/profile', {
    method: 'POST',
    requestId: 'client-123',
    timeoutMs: 1000,
    json: { displayName: 'Path Pilot' },
  });
  assert.deepEqual(payload, { saved: true });
});

test('central API client rejects ambiguous json and body options', async () => {
  const client = createApiClient({ baseUrl: 'https://example.test', fetchImpl: async () => new Response('{}') });

  await assert.rejects(
    () => client.request('/api/profile', { json: { enabled: true }, body: '{}' }),
    (error) => error instanceof PathPilotApiError && error.code === 'INVALID_REQUEST_OPTIONS',
  );
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

test('central API client streams SSE events across arbitrary network chunks', async () => {
  const encoder = new TextEncoder();
  const client = createApiClient({
    baseUrl: 'https://example.test',
    sendClientRequestId: true,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.test/api/assistant/stream');
      assert.equal(options.headers.get('Accept'), 'text/event-stream');
      assert.equal(options.headers.get('X-Request-ID'), 'stream-client-1');
      const payload = [
        'event: meta\ndata: {"source":"live"}\n\n',
        'event: delta\ndata: {"text":"أهلا "}\n\n',
        'event: delta\ndata: {"text":"بيك"}\n\n',
        'event: done\ndata: {"route":"direct-ai-stream"}\n\n',
      ].join('');
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(payload.slice(0, 31)));
          controller.enqueue(encoder.encode(payload.slice(31, 79)));
          controller.enqueue(encoder.encode(payload.slice(79)));
          controller.close();
        },
      });
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream', 'X-Request-ID': 'stream-server-1' },
      });
    },
  });

  const events = [];
  for await (const event of client.streamEvents('/api/assistant/stream', {
    method: 'POST',
    requestId: 'stream-client-1',
    json: { prompt: 'مرحبا' },
  })) {
    events.push(event);
  }

  assert.deepEqual(events.map((event) => event.event), ['meta', 'delta', 'delta', 'done']);
  assert.equal(events[1].data.text, 'أهلا ');
  assert.equal(events[2].data.text, 'بيك');
  assert.ok(events.every((event) => event.requestId === 'stream-server-1'));
});

test('central API streaming client normalizes pre-stream HTTP errors', async () => {
  const client = createApiClient({
    baseUrl: 'https://example.test',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'Streaming unavailable', code: 'AI_NOT_CONFIGURED' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }),
  });

  await assert.rejects(
    async () => {
      for await (const _event of client.streamEvents('/api/assistant/stream')) {
        // Consume until the request fails.
      }
    },
    (error) => error instanceof PathPilotApiError && error.code === 'AI_NOT_CONFIGURED' && error.status === 503,
  );
});
