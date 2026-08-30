import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultApiErrorCode, installApiErrorEnvelope, normalizeApiErrorPayload } from './api-error-envelope.js';

test('default API error codes stay stable by HTTP status', () => {
  assert.equal(defaultApiErrorCode(400), 'INVALID_REQUEST');
  assert.equal(defaultApiErrorCode(401), 'UNAUTHORIZED');
  assert.equal(defaultApiErrorCode(429), 'RATE_LIMITED');
  assert.equal(defaultApiErrorCode(502), 'UPSTREAM_FAILED');
  assert.equal(defaultApiErrorCode(599), 'REQUEST_FAILED');
});

test('normalization preserves compatible errors and existing stable codes', () => {
  assert.deepEqual(
    normalizeApiErrorPayload({ error: 'Verify your email.', code: 'EMAIL_NOT_VERIFIED' }, { status: 403, requestId: 'pp-request-1234' }),
    { error: 'Verify your email.', code: 'EMAIL_NOT_VERIFIED', requestId: 'pp-request-1234' },
  );
});

test('normalization replaces unsafe or arbitrary error codes', () => {
  assert.deepEqual(
    normalizeApiErrorPayload({ error: 'Provider failed.', code: 'provider said something private' }, { status: 502, requestId: 'pp-request-5678' }),
    { error: 'Provider failed.', code: 'UPSTREAM_FAILED', requestId: 'pp-request-5678' },
  );
});

test('normalization leaves non-error payloads untouched', () => {
  const payload = { ok: true };
  assert.equal(normalizeApiErrorPayload(payload, { status: 400, requestId: 'pp-request-9999' }), payload);
});

test('middleware enriches JSON errors without changing non-error responses', () => {
  const headers = new Map([['content-type', 'application/json; charset=utf-8']]);
  const writes = [];
  const response = {
    statusCode: 400,
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    hasHeader(name) { return headers.has(String(name).toLowerCase()); },
    removeHeader(name) { headers.delete(String(name).toLowerCase()); },
    end(chunk) { writes.push(String(chunk)); return this; },
  };

  installApiErrorEnvelope(response, 'pp-request-abcd');
  response.end(JSON.stringify({ error: 'Invalid request.' }));
  assert.deepEqual(JSON.parse(writes[0]), {
    error: 'Invalid request.',
    code: 'INVALID_REQUEST',
    requestId: 'pp-request-abcd',
  });

  response.statusCode = 200;
  response.end(JSON.stringify({ ok: true }));
  assert.deepEqual(JSON.parse(writes[1]), { ok: true });
});

test('middleware does not rewrite non-JSON error bodies', () => {
  const writes = [];
  const response = {
    statusCode: 500,
    getHeader() { return 'text/html; charset=utf-8'; },
    end(chunk) { writes.push(String(chunk)); return this; },
  };

  installApiErrorEnvelope(response, 'pp-request-html');
  response.end('<h1>Failure</h1>');
  assert.equal(writes[0], '<h1>Failure</h1>');
});
