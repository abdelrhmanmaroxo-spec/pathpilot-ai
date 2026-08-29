import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createAssistantStreamHandler } from './assistant-stream.js';
import { initializeDatabase } from './lib/database.js';

function providerStream(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

test('assistant stream forwards visible provider deltas as SSE without hidden reasoning', async (context) => {
  const database = initializeDatabase();
  let providerRequest = null;
  const handler = createAssistantStreamHandler({
    database,
    env: {
      AI_API_KEY: 'test-key',
      AI_MODEL: 'test-model',
      AI_BASE_URL: 'https://provider.example/v1',
      AI_API_MODE: 'chat-completions',
    },
    fetchImpl: async (_url, options) => {
      providerRequest = JSON.parse(options.body);
      return new Response(providerStream([
        'data: {"choices":[{"delta":{"reasoning_content":"private scratch"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"أهلًا "}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"بيك"}}]}\n\n',
        'data: [DONE]\n\n',
      ]), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    },
  });

  const server = createServer((request, response) => handler({
    request,
    response,
    requestId: 'stream-test-1',
    cors: {},
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    database.close();
  });

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/assistant/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'general', tool: 'ask', prompt: 'عامل ايه؟', preferences: {} }),
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
  assert.equal(providerRequest.stream, true);
  assert.equal(providerRequest.model, 'test-model');
  assert.match(body, /event: delta/);
  assert.match(body, /أهلًا/);
  assert.match(body, /بيك/);
  assert.match(body, /event: done/);
  assert.doesNotMatch(body, /private scratch/);
});
