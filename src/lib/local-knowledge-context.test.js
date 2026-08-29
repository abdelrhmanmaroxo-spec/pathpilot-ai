import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpertKnowledgeContext } from './local-knowledge-context.js';
import { LOCAL_EXPERTISE_MAX_STATS, retrieveExpertMaxKnowledge } from './local-expertise-max.js';

test('expert-max pack materially expands local expertise', () => {
  assert.ok(LOCAL_EXPERTISE_MAX_STATS.domains >= 30);
  assert.ok(LOCAL_EXPERTISE_MAX_STATS.facts >= 180);
  assert.ok(LOCAL_EXPERTISE_MAX_STATS.playbookSteps >= 180);
});

test('expert retrieval selects backend and security knowledge for API hardening', () => {
  const hits = retrieveExpertMaxKnowledge({
    prompt: 'صمم REST API آمن مع validation و rate limiting ومنع تسريب الأخطاء و idempotency',
    tool: 'qa',
    mode: 'work',
    limit: 8,
  });
  const ids = hits.map((entry) => entry.id);
  assert.ok(ids.includes('expert-backend-api-design'));
  assert.ok(ids.some((id) => id.includes('security') || id.includes('threat')));
});

test('RAG context extracts explicit constraints and stays inside budget', () => {
  const result = buildExpertKnowledgeContext({
    prompt: 'عندي تطبيق React على Windows ولازم أصلح بطء البحث خلال ساعتين وبدون تغيير الـ backend. حلل السبب واعمل خطة اختبار.',
    tool: 'qa',
    mode: 'work',
    preferences: { responseStyle: 'balanced' },
    maxChars: 7000,
  });
  assert.equal(result.intent, 'diagnosis');
  assert.ok(result.constraints.some((item) => /ساعتين/.test(item)));
  assert.ok(result.constraints.some((item) => /windows/i.test(item)));
  assert.ok(result.domains.length >= 4);
  assert.ok(result.domains.some((id) => /frontend|performance|troubleshooting|testing/.test(id)));
  assert.ok(result.context.length <= 7000);
  assert.match(result.context, /KNOWN FAILURE MODES \/ TRAPS/);
  assert.match(result.context, /PRACTICAL PLAYBOOK/);
});

test('RAG context selects LLM and retrieval expertise for local model questions', () => {
  const result = buildExpertKnowledgeContext({
    prompt: 'طور local LLM وخلي RAG أدق وقلل الحشو واعمل self review قبل الرد',
    tool: 'ask',
    mode: 'general',
    preferences: { responseStyle: 'detailed' },
  });
  assert.ok(result.domains.includes('expert-llm-engineering'));
  assert.ok(result.domains.some((id) => id === 'expert-rag-engineering' || id === 'expert-ai-evaluation'));
  assert.ok(result.stats.domains > LOCAL_EXPERTISE_MAX_STATS.domains);
});
