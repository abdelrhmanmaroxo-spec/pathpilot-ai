import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAssistantStreamError } from './assistant-stream.js';

test('assistant stream maps provider failures to stable public error codes', () => {
  assert.deepEqual(
    classifyAssistantStreamError(new Error('PROVIDER_401')),
    { code: 'PROVIDER_AUTH_FAILED', providerStatus: 401 },
  );
  assert.deepEqual(
    classifyAssistantStreamError(new Error('PROVIDER_429')),
    { code: 'PROVIDER_RATE_LIMITED', providerStatus: 429 },
  );
  assert.deepEqual(
    classifyAssistantStreamError(new Error('PROVIDER_503')),
    { code: 'PROVIDER_UNAVAILABLE', providerStatus: 503 },
  );
  assert.deepEqual(
    classifyAssistantStreamError(new Error('PROVIDER_422')),
    { code: 'PROVIDER_REQUEST_REJECTED', providerStatus: 422 },
  );
});

test('assistant stream does not expose arbitrary internal messages as error codes', () => {
  assert.deepEqual(
    classifyAssistantStreamError(new Error('socket exploded at provider edge')),
    { code: 'STREAM_FAILED', providerStatus: 0 },
  );
  assert.deepEqual(
    classifyAssistantStreamError(new Error('EMPTY_STREAM_RESPONSE')),
    { code: 'EMPTY_PROVIDER_RESPONSE', providerStatus: 0 },
  );
});

test('assistant stream distinguishes client aborts from provider timeouts', () => {
  assert.deepEqual(
    classifyAssistantStreamError(new Error('ignored'), {
      aborted: true,
      abortReason: new Error('CLIENT_DISCONNECTED'),
    }),
    { code: 'REQUEST_ABORTED', providerStatus: 0 },
  );
  assert.deepEqual(
    classifyAssistantStreamError(new Error('ignored'), {
      aborted: true,
      abortReason: new Error('PROVIDER_STREAM_TIMEOUT'),
    }),
    { code: 'PROVIDER_TIMEOUT', providerStatus: 0 },
  );
});
