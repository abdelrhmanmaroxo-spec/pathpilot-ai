import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLocalConfidence, shouldRunLocalReview } from './local-confidence.js';

function knowledge({ scores = {}, domains = [], constraints = [], context = '' } = {}) {
  return { scores, domains, constraints, context };
}

test('confidence increases with strong retrieval, model capacity, and review', () => {
  const strong = computeLocalConfidence({
    knowledge: knowledge({
      scores: { react: 31, frontend: 27, accessibility: 23, testing: 18 },
      domains: ['react', 'frontend', 'accessibility', 'testing', 'performance'],
      constraints: ['Windows', 'بدون تغيير backend'],
      context: 'Windows | بدون تغيير backend | React frontend testing performance',
    }),
    profile: 'expert',
    modelScaleB: 4,
    reviewed: true,
    prompt: 'اصلح مشكلة React على Windows بدون تغيير backend',
    tool: 'qa',
  });

  assert.equal(strong.level, 'high');
  assert.ok(strong.score >= 0.76);
  assert.equal(strong.reviewed, true);
});

test('freshness-sensitive weak retrieval lowers confidence and requests review', () => {
  const weak = computeLocalConfidence({
    knowledge: knowledge({ scores: { general: 5 }, domains: ['general'] }),
    profile: 'lite',
    modelScaleB: 0.8,
    reviewed: false,
    prompt: 'ايه أحدث سعر ومتاح النهارده؟',
    tool: 'ask',
  });

  assert.equal(weak.level, 'low');
  assert.equal(weak.freshnessSensitive, true);
  assert.equal(shouldRunLocalReview({ confidence: weak }), true);
});

test('review is always requested for complex tasks', () => {
  const confidence = { score: 0.9, level: 'high' };
  assert.equal(shouldRunLocalReview({ confidence, isComplex: true }), true);
});
