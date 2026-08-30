import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAvoidDuplicateProviderAttempt } from './assistant-router.js';

test('provider stream failures do not spend a second immediate API request', () => {
  for (const code of [
    'PROVIDER_RATE_LIMITED',
    'PROVIDER_AUTH_FAILED',
    'PROVIDER_UNAVAILABLE',
    'PROVIDER_TIMEOUT',
    'STREAM_FAILED',
  ]) {
    assert.equal(shouldAvoidDuplicateProviderAttempt({ code }), true, code);
  }
  assert.equal(shouldAvoidDuplicateProviderAttempt({ code: 'NETWORK_ERROR' }), false);
});
