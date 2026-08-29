import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isFeatureEnabled } from './feature-flags.js';

test('feature flags honor explicit overrides', () => {
  assert.equal(isFeatureEnabled('x', { overrides: { x: true }, flags: { x: { rollout: 0 } } }), true);
  assert.equal(isFeatureEnabled('x', { overrides: { x: false }, flags: { x: { rollout: 100 } } }), false);
});

test('feature flag percentage assignment is stable for the same identity', () => {
  const flags = { x: { rollout: 37 } };
  const first = isFeatureEnabled('x', { identity: 'user-123', overrides: {}, flags });
  const second = isFeatureEnabled('x', { identity: 'user-123', overrides: {}, flags });
  assert.equal(first, second);
});

test('zero and full rollout are deterministic', () => {
  assert.equal(isFeatureEnabled('off', { identity: 'a', overrides: {}, flags: { off: { rollout: 0 } } }), false);
  assert.equal(isFeatureEnabled('on', { identity: 'a', overrides: {}, flags: { on: { rollout: 100 } } }), true);
});
