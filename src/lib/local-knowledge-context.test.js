import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpertKnowledgeContext } from './local-knowledge-context.js';
import { LOCAL_EXPERTISE_MAX_STATS, retrieveExpertMaxKnowledge } from './local-expertise-max.js';
import { LOCAL_EXPERTISE_DEEP_STATS, retrieveDeepExpertise } from './local-expertise-deep.js';

test('expert packs materially expand local expertise', () => {
  assert.ok(LOCAL_EXPERTISE_MAX_STATS.domains >= 30);
  assert.ok(LOCAL_EXPERTISE_MAX_STATS.facts >= 180);
  assert.ok(LOCAL_EXPERTISE_MAX_STATS.playbookSteps >= 180);
  assert.ok(LOCAL_EXPERTISE_DEEP_STATS.domains >= 25);
  assert.ok(LOCAL_EXPERTISE_DEEP_STATS.facts >= 150);
  assert.ok(LOCAL_EXPERTISE_DEEP_STATS.playbookSteps >= 150);
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

test('deep retrieval chooses React expertise for React hook problems', () => {
  const ids = retrieveDeepExpertise({
    prompt: 'React useEffect بيعمل setState و rerender زيادة ومحتاج أصلح hooks والperformance',
    tool: 'qa',
    mode: 'work',
    limit: 6,
  }).map((entry) => entry.id);
  assert.ok(ids.includes('deep-react-engineering'));
  assert.ok(ids.some((id) => /javascript|api|qa/.test(id)));
});

test('deep retrieval chooses authentication expertise for OAuth issues', () => {
  const ids = retrieveDeepExpertise({
    prompt: 'OAuth login محتاج PKCE و state والتحقق من audience و refresh token بأمان',
    tool: 'qa',
    mode: 'work',
    limit: 6,
  }).map((entry) => entry.id);
  assert.ok(ids.includes('deep-auth-oauth'));
  assert.ok(ids.some((id) => /cybersecurity|api/.test(id)));
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
  assert.ok(result.domains.some((id) => /react|frontend|performance|troubleshooting|testing/.test(id)));
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
  assert.ok(result.stats.domains > LOCAL_EXPERTISE_MAX_STATS.domains + LOCAL_EXPERTISE_DEEP_STATS.domains);
  assert.equal(result.stats.deepPackVersion, LOCAL_EXPERTISE_DEEP_STATS.version);
});

test('RAG context selects Arabic localization expertise for mixed RTL/LTR UI', () => {
  const result = buildExpertKnowledgeContext({
    prompt: 'لما احول الموقع English بيفضل placeholder عربي وكمان RTL وLTR داخلين في بعض',
    tool: 'qa',
    mode: 'work',
    preferences: { responseStyle: 'balanced' },
  });
  assert.ok(result.domains.includes('deep-arabic-language-qa'));
  assert.ok(result.domains.some((id) => /accessibility|frontend|react/.test(id)));
});
