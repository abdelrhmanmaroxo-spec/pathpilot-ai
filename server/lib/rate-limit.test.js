import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRoleRateLimiter } from './rate-limit.js';

test('guest AI requests have a tighter limit than admin requests', () => {
  let now = 1_000;
  const limiter = createRoleRateLimiter({
    now: () => now,
    limits: {
      guest: { ai: 1, auth: 1, general: 1 },
      user: { ai: 2, auth: 2, general: 2 },
      admin: { ai: 3, auth: 3, general: 3 },
    },
  });

  assert.equal(limiter.check({ identity: 'g', role: 'guest', path: '/api/research' }).allowed, true);
  assert.equal(limiter.check({ identity: 'g', role: 'guest', path: '/api/research' }).allowed, false);
  assert.equal(limiter.check({ identity: 'a', role: 'admin', path: '/api/research' }).allowed, true);
  assert.equal(limiter.check({ identity: 'a', role: 'admin', path: '/api/research' }).allowed, true);
  assert.equal(limiter.check({ identity: 'a', role: 'admin', path: '/api/research' }).allowed, true);
  assert.equal(limiter.check({ identity: 'a', role: 'admin', path: '/api/research' }).allowed, false);

  now += 60_000;
  assert.equal(limiter.check({ identity: 'g', role: 'guest', path: '/api/research' }).allowed, true);
});

test('OPTIONS requests are never rate limited', () => {
  const limiter = createRoleRateLimiter();
  const result = limiter.check({ identity: 'x', role: 'guest', path: '/api/auth/login', method: 'OPTIONS' });
  assert.equal(result.allowed, true);
});
