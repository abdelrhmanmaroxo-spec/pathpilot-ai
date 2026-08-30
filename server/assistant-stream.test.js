import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  chunkVisibleAnswer,
  createAssistantStreamHandler,
  usesBufferedProgressiveDelivery,
} from './assistant-stream.js';
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

test('Gemini compatibility mode uses reliable progressive SSE delivery', async (context) => {
  const database = initializeDatabase();
  let providerRequest = null;
  let providerAccept = '';
  const handler = createAssistantStreamHandler({
    database,
    env: {
      AI_API_KEY: 'test-key',
      AI_MODEL: 'gemini-test',
      AI_PROVIDER: 'Gemini',
      AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      AI_API_MODE: 'chat-completions',
      AI_BUFFERED_CHUNK_DELAY_MS: '0',
    },
    fetchImpl: async (_url, options) => {
      providerRequest = JSON.parse(options.body);
      providerAccept = options.headers.Accept;
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'اختار React لأنه أنسب للفريق وسوق العمل.' } }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  const server = createServer((request, response) => handler({
    request,
    response,
    requestId: 'gemini-progressive-1',
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
    body: JSON.stringify({ mode: 'general', tool: 'decide', prompt: 'React ولا Vue؟', preferences: {} }),
  });
  const body = await response.text();
  const deltas = [...body.matchAll(/event: delta\ndata: ({.*})/g)]
    .map((match) => JSON.parse(match[1]).text)
    .join('');

  assert.equal(response.status, 200);
  assert.equal(providerAccept, 'application/json');
  assert.equal(Object.hasOwn(providerRequest, 'stream'), false);
  assert.match(body, /direct-ai-progressive/);
  assert.equal(deltas, 'اختار React لأنه أنسب للفريق وسوق العمل.');
});

test('provider delivery policy keeps native streaming override and lossless chunks', () => {
  assert.equal(usesBufferedProgressiveDelivery({ provider: 'Gemini' }), true);
  assert.equal(usesBufferedProgressiveDelivery({ provider: 'Gemini', streamMode: 'native' }), false);
  assert.equal(usesBufferedProgressiveDelivery({ provider: 'OpenAI' }), false);
  const answer = 'قرار مباشر\nوبعده أسباب واضحة بدون فقد أي حرف.';
  assert.equal(chunkVisibleAnswer(answer, 12).join(''), answer);
});
