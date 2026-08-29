import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProviderRequest, buildSystemPrompt, extractProviderText } from './ai-provider.js';

test('system prompt adapts to workspace and protects accuracy', () => {
  const prompt = buildSystemPrompt({ mode: 'work', tool: 'cv', preferences: { displayName: 'سارة' } });
  assert.match(prompt, /professional work assistant/i);
  assert.match(prompt, /سارة/);
  assert.match(prompt, /Never invent/i);
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
