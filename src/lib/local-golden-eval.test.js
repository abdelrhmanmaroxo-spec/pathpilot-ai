import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpertKnowledgeContext } from './local-knowledge-augment.js';
import { computeLocalConfidence } from './local-confidence.js';

const CASES = [
  {
    name: 'React performance diagnosis',
    prompt: 'React search component بيرندر كتير وبيبطأ على جهاز ضعيف. شخص السبب واعمل خطة اختبار بدون تغيير backend.',
    tool: 'qa',
    mode: 'work',
    expected: /react|frontend|web-performance|test/i,
  },
  {
    name: 'OAuth security',
    prompt: 'راجع Google OAuth login وتأكد من issuer audience expiry refresh token وامن الجلسات.',
    tool: 'qa',
    mode: 'work',
    expected: /auth|oauth|security|iam/i,
  },
  {
    name: 'Arabic RTL localization',
    prompt: 'في English mode لسه placeholder عربي و RTL/LTR داخلين في بعض في الواجهة. شخص المشكلة.',
    tool: 'qa',
    mode: 'work',
    expected: /arabic|react|frontend|accessibility|local/i,
  },
  {
    name: 'Network timeout diagnosis',
    prompt: 'API ساعات يعمل timeout مع إن ping شغال. عايز تشخيص DNS TCP TLS HTTP والproxy.',
    tool: 'qa',
    mode: 'work',
    expected: /network|sre|troubleshoot|api/i,
  },
  {
    name: 'SQL performance',
    prompt: 'SQLite query بقى بطيء بعد ما البيانات كبرت. راجع indexes وquery plan والكتابة.',
    tool: 'qa',
    mode: 'work',
    expected: /sql|database|performance/i,
  },
  {
    name: 'Financial modeling',
    prompt: 'ابني DCF في Excel مع cash flow وsensitivity وراجع الassumptions والformulas.',
    tool: 'ask',
    mode: 'work',
    expected: /financial|spreadsheet|account/i,
  },
  {
    name: 'AI evaluation',
    prompt: 'صمم rubric لتقييم LLM عربي فيه factuality instruction following hallucination وagreement بين المراجعين.',
    tool: 'qa',
    mode: 'work',
    expected: /ai-evaluation|data-annotation|arabic/i,
  },
  {
    name: 'Product experiment',
    prompt: 'عايز اختبر feature جديدة على نسبة صغيرة من المستخدمين واعرف هل حسنت retention ولا لأ.',
    tool: 'decide',
    mode: 'general',
    expected: /product|statistics|experiment|analytics/i,
  },
  {
    name: 'PWA stale cache',
    prompt: 'المستخدم شايف نسخة قديمة بعد deploy جديد في PWA. شخص service worker والcache والupdate flow.',
    tool: 'qa',
    mode: 'work',
    expected: /pwa|frontend|web-performance/i,
  },
  {
    name: 'Security incident',
    prompt: 'في spike في محاولات login وpayloads مشبوهة. اعمل containment وincident response وخطة تحقق.',
    tool: 'qa',
    mode: 'work',
    expected: /security|incident|auth|threat/i,
  },
];

for (const golden of CASES) {
  test(`golden local retrieval: ${golden.name}`, () => {
    const result = buildExpertKnowledgeContext({
      prompt: golden.prompt,
      tool: golden.tool,
      mode: golden.mode,
      preferences: { responseStyle: 'balanced' },
      maxChars: 10500,
    });

    assert.ok(result.domains.length >= 4, `too few domains: ${result.domains.join(', ')}`);
    assert.ok(result.domains.some((id) => golden.expected.test(id)), `missing relevant domain: ${result.domains.join(', ')}`);
    assert.ok(result.context.length <= 10500);
    assert.match(result.context, /FAILURE MODES|TRAPS|SPECIALIST FAILURE MODES/i);
  });
}

test('confidence remains conservative for freshness-sensitive local questions', () => {
  const prompt = 'ايه أحدث سعر متاح النهارده وهل القانون الجديد اتغير؟';
  const knowledge = buildExpertKnowledgeContext({ prompt, tool: 'ask', mode: 'general', maxChars: 7000 });
  const confidence = computeLocalConfidence({
    knowledge,
    profile: 'strong',
    modelScaleB: 1.7,
    reviewed: true,
    prompt,
    tool: 'ask',
  });

  assert.equal(confidence.freshnessSensitive, true);
  assert.ok(confidence.score < 0.82);
});
