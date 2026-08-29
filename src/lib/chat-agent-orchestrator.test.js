import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_AGENT_OPTION_GROUPS,
  CHAT_AGENT_TOOLS,
  agentPlanGuidance,
  disabledToolsForGroups,
  planChatAgent,
  publicAgentToolSummary,
  sanitizeDisabledChatTools,
} from './chat-agent-orchestrator.js';

test('chat agent exposes a broad helper capability registry', () => {
  assert.ok(CHAT_AGENT_TOOLS.length >= 30);
  assert.equal(new Set(CHAT_AGENT_TOOLS.map((tool) => tool.id)).size, CHAT_AGENT_TOOLS.length);
  assert.ok(CHAT_AGENT_OPTION_GROUPS.length >= 8);
});

test('auto mode selects research helpers for fresh questions', () => {
  const plan = planChatAgent({ prompt: 'ايه أحدث إصدار من Node دلوقتي؟' });
  assert.equal(plan.mode, 'auto');
  assert.equal(plan.freshnessNeeded, true);
  assert.equal(plan.allowResearch, true);
  assert.ok(plan.toolIds.includes('web_search'));
  assert.ok(plan.toolIds.includes('source_crosscheck'));
  assert.ok(plan.toolIds.includes('citation_guard'));
});

test('auto mode selects deeper specialist tools for technical planning', () => {
  const plan = planChatAgent({ prompt: 'حلل architecture لمشروع React و Node واعمل خطة deployment آمنة' });
  assert.equal(plan.intent, 'plan');
  assert.equal(plan.domain, 'software');
  assert.equal(plan.deepReview, true);
  assert.ok(plan.toolIds.includes('code_analyzer'));
  assert.ok(plan.toolIds.includes('planner'));
  assert.ok(plan.toolIds.includes('deep_analyzer'));
  assert.ok(plan.toolIds.includes('qa_reviewer'));
});

test('user opt-outs remove optional tools but cannot disable safety or quality gates', () => {
  const disabled = sanitizeDisabledChatTools(['web_search', 'deep_analyzer', 'safety_guard', 'final_quality_gate', 'unknown']);
  assert.deepEqual(disabled.sort(), ['deep_analyzer', 'web_search']);

  const plan = planChatAgent({
    prompt: 'ابحث عن أحدث إصدار وحلل المخاطر',
    disabledToolIds: ['web_search', 'deep_analyzer', 'safety_guard', 'final_quality_gate'],
  });
  assert.equal(plan.allowResearch, false);
  assert.equal(plan.deepReview, false);
  assert.ok(!plan.toolIds.includes('web_search'));
  assert.ok(!plan.toolIds.includes('deep_analyzer'));
  assert.ok(plan.toolIds.includes('safety_guard'));
  assert.ok(plan.toolIds.includes('final_quality_gate'));
  assert.match(agentPlanGuidance(plan), /web research is disabled/i);
});

test('group opt-outs expand only to user-toggleable helper tools', () => {
  const ids = disabledToolsForGroups(['search', 'code']);
  assert.ok(ids.includes('web_search'));
  assert.ok(ids.includes('code_analyzer'));
  assert.ok(!ids.includes('safety_guard'));
});

test('voice input and public tool summary expose useful non-sensitive state', () => {
  const plan = planChatAgent({ prompt: 'اكتب رسالة قصيرة', voiceInput: true });
  assert.ok(plan.toolIds.includes('voice_dictation'));
  const summary = publicAgentToolSummary(plan);
  assert.ok(summary.length > 0 && summary.length <= 8);
  assert.ok(summary.every((item) => item.id && item.label && item.stage));
});
