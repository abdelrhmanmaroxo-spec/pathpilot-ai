import test from 'node:test';
import assert from 'node:assert/strict';
import { applySecurityHeaders, createSecurityGuard } from './security.js';

function request({ method = 'GET', url = '/api/status', headers = {}, ip = '203.0.113.5' } = {}) {
  return {
    method,
    url,
    headers: { 'x-forwarded-for': ip, ...headers },
    rawHeaders: Object.entries({ 'x-forwarded-for': ip, ...headers }).flatMap(([key, value]) => [key, String(value)]),
    socket: { remoteAddress: ip },
  };
}

test('blocks unsafe methods and common exploit paths', () => {
  const guard = createSecurityGuard();
  assert.equal(guard.check(request({ method: 'TRACE' })).code, 'METHOD_BLOCKED');
  assert.equal(guard.check(request({ url: '/.env' })).code, 'SUSPICIOUS_PATH');
  assert.equal(guard.check(request({ url: '/api/../../etc/passwd' })).code, 'SUSPICIOUS_PATH');
});

test('enforces JSON media type and body size on API writes', () => {
  const guard = createSecurityGuard();
  const wrongType = guard.check(request({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'content-length': '12', 'content-type': 'text/plain' },
  }));
  assert.equal(wrongType.status, 415);
  assert.equal(wrongType.code, 'UNSUPPORTED_MEDIA_TYPE');

  const tooLarge = guard.check(request({
    method: 'POST',
    url: '/api/research',
    headers: { 'content-length': '200000', 'content-type': 'application/json' },
  }));
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.code, 'BODY_TOO_LARGE');
});

test('rate limits repeated login attempts by client bucket', () => {
  const guard = createSecurityGuard();
  const input = request({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'content-length': '2', 'content-type': 'application/json' },
    ip: '198.51.100.44',
  });
  for (let index = 0; index < 12; index += 1) assert.equal(guard.check(input).allowed, true);
  const blocked = guard.check(input);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.code, 'RATE_LIMITED');
  assert.ok(blocked.retryAfterSeconds > 0);
});

test('sets strict defensive headers without exposing cacheable API data', () => {
  const headers = new Map();
  const response = { setHeader(name, value) { headers.set(String(name).toLowerCase(), String(value)); } };
  applySecurityHeaders(request({ headers: { 'x-forwarded-proto': 'https' } }), response);
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.match(headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(headers.get('strict-transport-security'), /max-age=31536000/);
  assert.match(headers.get('cache-control'), /no-store/);
});
