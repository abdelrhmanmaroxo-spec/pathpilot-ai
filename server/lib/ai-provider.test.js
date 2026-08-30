import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProviderRequest, buildSystemPrompt, extractProviderText } from './ai-provider.js';

test('system prompt adapts to workspace and protects accuracy', () => {
  const prompt = buildSystemPrompt({ mode: 'work', tool: 'cv', preferences: { displayName: 'سارة' } });
  assert.match(prompt, /professional work assistant/i);
  assert.match(prompt, /سارة/);
  assert.match(prompt, /Never invent/i);
});

test('deep analysis preference adds stricter verification without exposing chain of thought', () => {
  const prompt = buildSystemPrompt({
    mode: 'general',
    tool: 'ask',
    preferences: { deepThinkEnabled: true, responseStyle: 'detailed' },
  });
  assert.match(prompt, /Deep analysis mode is enabled/i);
  assert.match(prompt, /verification pass/i);
  assert.match(prompt, /Do not reveal hidden chain-of-thought/i);
});

test('automatic chat agent guidance reaches the provider system prompt', () => {
  const prompt = buildSystemPrompt({
    preferences: {
      agentGuidance: 'Chat agent orchestration: agent-v1; selection mode: auto. Selected helper capabilities: context_memory, rag_retriever, final_quality_gate.',
    },
  });
  assert.match(prompt, /selection mode: auto/i);
  assert.match(prompt, /rag_retriever/);
  assert.match(prompt, /final_quality_gate/);
});

test('conversational guidance covers normalization, lightweight turns, variation, and safe gender adaptation', () => {
  const prompt = buildSystemPrompt({ preferences: { displayName: 'Ahmed', responseStyle: 'concise' } });
  assert.match(prompt, /semantic intent and normalized meaning/i);
  assert.match(prompt, /Keep lightweight social turns lightweight/i);
  assert.match(prompt, /Vary wording across nearby turns/i);
  assert.match(prompt, /Never infer gender from names/i);
  assert.match(prompt, /Do not use the display name as evidence for gender/i);
  assert.match(prompt, /one or two natural sentences/i);
});

test('language and follow-up guidance preserves dominant language and latest-turn context', () => {
  const prompt = buildSystemPrompt();
  assert.match(prompt, /follow-ups such as/i);
  assert.match(prompt, /most recent relevant turn/i);
  assert.match(prompt, /dominant language/i);
});

test('provider request supports optional reasoning without requiring it', () => {
  const chat = buildProviderRequest({ apiMode: 'chat-completions', model: 'model-a', prompt: 'مرحبا', reasoningEffort: '' });
  const responses = buildProviderRequest({ apiMode: 'responses', model: 'model-b', prompt: 'مرحبا', reasoningEffort: 'medium' });
  assert.equal(chat.model, 'model-a');
  assert.equal(chat.reasoning_effort, undefined);
  assert.equal(responses.reasoning.effort, 'medium');
});

test('provider response parsing supports both API modes', () => {
  assert.equal(extractProviderText({ choices: [{ message: { content: ' answer ' } }] }, 'chat-completions'), 'answer');
  assert.equal(extractProviderText({ output_text: ' result ' }, 'responses'), 'result');
});