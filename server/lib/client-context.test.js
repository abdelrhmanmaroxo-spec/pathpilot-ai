import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeClientDevice,
  getClientIp,
  getUserAgent,
  visitorSecurityMetadata,
} from './client-context.js';

test('client IP prefers the proxy-appended forwarded address over a spoofable first value', () => {
  const request = {
    headers: { 'x-forwarded-for': '203.0.113.20, 198.51.100.42' },
    socket: { remoteAddress: '10.0.0.2' },
  };
  assert.equal(getClientIp(request), '198.51.100.42');
});

test('client context falls back safely and normalizes IPv4-mapped addresses', () => {
  assert.equal(getClientIp({ headers: {}, socket: { remoteAddress: '::ffff:192.0.2.9' } }), '192.0.2.9');
  assert.equal(getClientIp({ headers: {}, socket: {} }), 'unknown');
});

test('user agent and device description are bounded and useful without fingerprinting', () => {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36';
  assert.equal(getUserAgent({ headers: { 'user-agent': ua } }), ua);
  assert.equal(describeClientDevice(ua), 'Chrome · Windows · Desktop');
  const metadata = visitorSecurityMetadata({ headers: { 'user-agent': ua }, socket: { remoteAddress: '127.0.0.1' } });
  assert.equal(metadata.ip, '127.0.0.1');
  assert.equal(metadata.device, 'Chrome · Windows · Desktop');
  assert.equal(metadata.userAgent, ua);
  assert.match(metadata.recordedAt, /^\d{4}-\d{2}-\d{2}T/);
});
