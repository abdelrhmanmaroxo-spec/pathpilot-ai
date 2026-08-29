import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectUntrustedInput, sanitizePrompt, sanitizeSingleLine } from './input-security.js';

test('blocks active exploit-like payloads', () => {
  assert.equal(inspectUntrustedInput('<script>alert(1)</script>').blocked, true);
  assert.equal(inspectUntrustedInput('<img src=x onerror=alert(1)>').blocked, true);
  assert.equal(inspectUntrustedInput('javascript:alert(document.cookie)').blocked, true);
  assert.equal(inspectUntrustedInput('../../../../etc/passwd').blocked, true);
});

test('allows ordinary programming questions and inert snippets', () => {
  assert.equal(inspectUntrustedInput('Explain how JavaScript event handlers work safely.').blocked, false);
  assert.equal(inspectUntrustedInput('How do I validate JSON input in Node.js?').blocked, false);
});

test('sanitizers remove unsafe control characters and cap length', () => {
  assert.equal(sanitizeSingleLine(`hello${String.fromCharCode(0)} world`, 20), 'hello world');
  assert.equal(sanitizePrompt(`a${String.fromCharCode(0)}b`, 20), 'ab');
  assert.equal(sanitizeSingleLine('x'.repeat(100), 10).length, 10);
});
