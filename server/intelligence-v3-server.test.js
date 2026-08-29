import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createIntelligenceV3Handler } from './intelligence-v3-server.js';

function mockRequest(body, path = '/api/research') {
  const payload = JSON.stringify(body);
  const request = Readable.from([payload]);
  request.method = 'POST';
  request.url = path;
  request.headers = {
    origin: 'https://example.test',
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(payload)),
    'x-forwarded-for': '203.0.113.10',
    'x-forwarded-proto': 'https',
  };
  return request;
}

function mockResponse() {
  const headers = new Map();
  return {
    statusCode: 0,
    body: '',
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    writeHead(status, values = {}) {
      this.statusCode = status;
      for (const [name, value] of Object.entries(values)) headers.set(String(name).toLowerCase(), value);
    },
    end(value = '') { this.body += String(value); },
    headers,
  };
}

test('grounded research prioritizes configured Gemini-compatible synthesis once evidence is sufficient', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('api.tavily.com/search')) {
      return new Response(JSON.stringify({
        answer: 'Search provider summary.',
        results: [
          { title: 'Official docs', url: 'https://docs.example.com/a', content: 'Primary documentation evidence.', score: 0.95 },
          { title: 'University study', url: 'https://example.edu/b', content: 'Academic supporting evidence.', score: 0.91 },
          { title: 'Support article', url: 'https://support.example.org/c', content: 'Direct support evidence.', score: 0.88 },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('generativelanguage.googleapis.com/v1beta/openai/chat/completions')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'AI_SYNTHESIS_OK with grounded claim [1].' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  try {
    const env = {
      ALLOWED_ORIGINS: 'https://example.test',
      TAVILY_API_KEY: 'test-search-key',
      AI_API_KEY: 'test-ai-key',
      AI_MODEL: 'gemini-test-model',
      AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      AI_API_MODE: 'chat-completions',
      AI_REASONING_EFFORT: 'medium',
    };
    const handler = createIntelligenceV3Handler({
      env,
      database: null,
      baseApp: { handle() { throw new Error('Base app should not handle research route.'); } },
    });
    const req = mockRequest({ prompt: 'ابحث عن موضوع حديث مع مصادر', mode: 'general', tool: 'research', preferences: {} });
    const res = mockResponse();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.sourceMode, 'research-ai');
    assert.equal(payload.aiAttempted, true);
    assert.equal(payload.aiSynthesisSucceeded, true);
    assert.equal(payload.synthesisPath, 'compatible');
    assert.equal(payload.sourceCount, 3);
    assert.match(payload.answer, /AI_SYNTHESIS_OK/);
    assert.equal(calls.filter((url) => url.includes('api.tavily.com/search')).length, 1);
    assert.equal(calls.filter((url) => url.includes('/openai/chat/completions')).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
