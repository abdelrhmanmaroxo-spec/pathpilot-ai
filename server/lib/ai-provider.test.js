import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProviderRequest, buildSystemPrompt, buildTurnGuidance, detectConversationIntent, extractProviderText, inferSafeAgreement } from './ai-provider.js';

test('system prompt adapts to workspace and protects accuracy', () => {
  const prompt = buildSystemPrompt({ mode: 'work', tool: 'cv', preferences: { displayName: 'سارة' } });
  assert.match(prompt, /professional work assistant/i);
  assert.match(prompt, /سارة/);
  assert.match(prompt, /Never invent/i);
});

test('deep analysis preference adds stricter verification without exposing chain of thought', () => {
  const prompt = buildSystemPrompt({ preferences: { deepThinkEnabled: true, responseStyle: 'detailed' } });
  assert.match(prompt, /Deep analysis mode is enabled/i);
  assert.match(prompt, /verification pass/i);
  assert.match(prompt, /Do not reveal hidden chain-of-thought/i);
});

test('automatic chat agent guidance reaches the provider system prompt', () => {
  const prompt = buildSystemPrompt({ preferences: { agentGuidance: 'Chat agent orchestration: agent-v1; selection mode: auto. Selected helper capabilities: context_memory, rag_retriever, final_quality_gate.' } });
  assert.match(prompt, /selection mode: auto/i);
  assert.match(prompt, /rag_retriever/);
});

test('conversational guidance covers normalization, lightweight turns, variation, and safe gender adaptation', () => {
  const prompt = buildSystemPrompt({ preferences: { displayName: 'Ahmed', responseStyle: 'concise' } });
  assert.match(prompt, /semantic intent and normalized meaning|semantic intent and normalized meaning/i);
  assert.match(prompt, /Keep lightweight social turns lightweight/i);
  assert.match(prompt, /Vary wording across nearby turns/i);
  assert.match(prompt, /Never infer gender from names/i);
  assert.match(prompt, /Do not use the display name as evidence for gender/i);
  assert.match(prompt, /one or two natural sentences/i);
});

test('turn intent handles Arabic, Egyptian Arabic, Arabizi noise, and English social turns', () => {
  assert.equal(detectConversationIntent('هلووو!!!'), 'greeting');
  assert.equal(detectConversationIntent('msh fahhhhhm??'), 'confusion');
  assert.equal(detectConversationIntent('thank you!!!'), 'thanks');
  assert.equal(detectConversationIntent('طب وبعدين؟'), 'follow_up');
  assert.equal(detectConversationIntent('debug this function'), 'substantive');
});

test('turn profile keeps lightweight turns lightweight and preserves concrete requests', () => {
  assert.deepEqual(buildTurnGuidance('تمام، شكرا'), { intent: 'thanks', language: 'arabic', agreement: 'unknown', lightweight: true, directRequest: false });
  assert.equal(buildTurnGuidance('محتاج تشرحلي OAuth').directRequest, true);
  assert.equal(buildTurnGuidance('ok debug this API').lightweight, false);
});

test('gender adaptation is explicit, scoped, and conflict-safe', () => {
  assert.equal(inferSafeAgreement('أنا مبسوطة جدًا'), 'feminine');
  assert.equal(inferSafeAgreement('انا محتاج مساعدة'), 'masculine');
  assert.equal(inferSafeAgreement('اسمي سارة'), 'unknown');
  assert.equal(inferSafeAgreement('أنا مبسوط ومبسوطة'), 'unknown');
});

test('provider request carries deterministic turn metadata without changing API shape', () => {
  const chat = buildProviderRequest({ apiMode: 'chat-completions', model: 'model-a', prompt: 'مرحبا', reasoningEffort: '' });
  const responses = buildProviderRequest({ apiMode: 'responses', model: 'model-b', prompt: 'اشرح OAuth', reasoningEffort: 'medium' });
  assert.equal(chat.model, 'model-a');
  assert.equal(chat.reasoning_effort, undefined);
  assert.equal(responses.reasoning.effort, 'medium');
  assert.match(chat.messages[0].content, /intent=greeting/);
  assert.match(responses.input[0].content, /directRequest=true/);
});

test('provider response parsing supports both API modes', () => {
  assert.equal(extractProviderText({ choices: [{ message: { content: ' answer ' } }] }, 'chat-completions'), 'answer');
  assert.equal(extractProviderText({ output_text: ' result ' }, 'responses'), 'result');
});
