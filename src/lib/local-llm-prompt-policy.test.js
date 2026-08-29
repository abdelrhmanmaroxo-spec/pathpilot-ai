import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalReviewPrompt,
  buildLocalSystemPrompt,
  buildLocalUserPrompt,
  isComplexLocalRequest,
} from './local-llm/prompt-policy.js';

test('local system prompt keeps casual conversation natural', () => {
  const prompt = buildLocalSystemPrompt({
    mode: 'general',
    tool: 'ask',
    preferences: { agentGuidance: 'Detected intent: conversation.' },
  });
  assert.match(prompt, /Sound natural and conversational/i);
  assert.match(prompt, /simple chat/i);
  assert.match(prompt, /Detected intent: conversation/);
});

test('local user prompt carries expert context without exposing internals', () => {
  const prompt = buildLocalUserPrompt({
    prompt: 'اشرح OAuth',
    tool: 'ask',
    mode: 'general',
    preferences: {},
    knowledge: { intent: 'learn', constraints: [], domains: ['security'], context: 'OAuth is an authorization framework.' },
  });
  assert.match(prompt, /USER REQUEST/);
  assert.match(prompt, /security/);
  assert.match(prompt, /Do not mention retrieval, RAG/);
});

test('review prompt protects natural conversation from over-formatting', () => {
  const prompt = buildLocalReviewPrompt({
    originalPrompt: 'انت بتعمل اي؟',
    draft: 'أنا بساعدك.',
    knowledge: { constraints: [] },
    style: 'balanced',
    preliminaryConfidence: { level: 'high' },
  });
  assert.match(prompt, /chatting casually/i);
  assert.match(prompt, /unnecessary framework/i);
});

test('complexity policy escalates technical analysis but not greetings', () => {
  assert.equal(isComplexLocalRequest({ prompt: 'حلل architecture النظام', tool: 'ask', preferences: {}, profile: 'strong', modelScaleB: 1.7 }), true);
  assert.equal(isComplexLocalRequest({ prompt: 'اهلا', tool: 'ask', preferences: {}, profile: 'strong', modelScaleB: 1.7 }), false);
});
