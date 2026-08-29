import { advancedLocalResponse, detectLocalIntent, extractLocalEntities } from './local-reasoner.js';
import { retrieveEncyclopediaKnowledge, LOCAL_ENCYCLOPEDIA_STATS } from './local-encyclopedia.js';
import { retrieveExpandedKnowledge, EXPANDED_ENCYCLOPEDIA_STATS } from './local-encyclopedia-plus.js';
import { retrieveExpertMaxKnowledge, LOCAL_EXPERTISE_MAX_STATS } from './local-expertise-max.js';
import { retrieveDeepExpertise, LOCAL_EXPERTISE_DEEP_STATS } from './local-expertise-deep.js';
import { retrieveProExpertise, LOCAL_EXPERTISE_PRO_STATS } from './local-expertise-pro.js';

const INTENT_EXPANSIONS = {
  comparison: 'قرار tradeoff معايير مخاطر تكلفة قيمة بدائل تفكير نقدي sensitivity scenario regret architecture finance product',
  diagnosis: 'سبب جذري دليل اختبار فرضيات نظام شبكات امن architecture observability troubleshooting testing incident counterfactual',
  plan: 'أهداف موارد مراحل مخاطر اعتماديات project management decision bottleneck contingency delivery operations',
  research: 'منهج بحث مصادر أدلة احصاء تفكير نقدي تحيز تحقق source credibility synthesis retrieval evaluation',
  writing: 'جمهور هدف وضوح اقناع writing communication ethics ambiguity claim evidence recruiter product',
  brainstorm: 'ابتكار business product value risk experiment entrepreneurship assumption test unit economics',
  learn: 'تعلم شرح مثال ذاكرة تطبيق critical thinking science misconception transfer algorithms systems ai',
  decision: 'قرار احتمال مخاطرة تكلفة منفعة alternative scenario decision science sensitivity downside unit economics',
  general: 'تفكير نقدي قرار تحليل نظام معرفة عامة assumptions failure modes verification software security product',
};

const FRESHNESS = /(آخر|احدث|أحدث|اليوم|حاليا|دلوقت|سعر|أسعار|نسخة|version|release|latest|today|current|news|تحديثات|2026|2027)/i;

function uniqueEntries(...groups) {
  const seen = new Set();
  const result = [];
  for (const entry of groups.flat()) {
    if (!entry?.id || seen.has(entry.id)) continue;
    seen.add(entry.id);
    result.push(entry);
  }
  return result;
}

function uniqueValues(entries, field, limit) {
  const seen = new Set();
  const values = [];
  for (const entry of entries) {
    for (const raw of entry[field] || []) {
      const value = String(raw || '').replace(/\s+/g, ' ').trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      values.push(value);
      if (values.length >= limit) return values;
    }
  }
  return values;
}

function knowledgeBreadth() {
  return {
    domains: LOCAL_ENCYCLOPEDIA_STATS.domains
      + EXPANDED_ENCYCLOPEDIA_STATS.domains
      + LOCAL_EXPERTISE_MAX_STATS.domains
      + LOCAL_EXPERTISE_DEEP_STATS.domains
      + LOCAL_EXPERTISE_PRO_STATS.domains,
    facts: LOCAL_ENCYCLOPEDIA_STATS.facts
      + EXPANDED_ENCYCLOPEDIA_STATS.facts
      + LOCAL_EXPERTISE_MAX_STATS.facts
      + LOCAL_EXPERTISE_DEEP_STATS.facts
      + LOCAL_EXPERTISE_PRO_STATS.facts,
  };
}

function baseAnswerFromAdvanced(value) {
  const text = String(value || '');
  const marker = 'المعالجة المبنية على المعرفة\n';
  const index = text.lastIndexOf(marker);
  if (index >= 0) return text.slice(index + marker.length).trim();
  return text.trim();
}

function synthesize({ prompt, intent, entries, preferences }) {
  if (!entries.length) {
    return FRESHNESS.test(prompt)
      ? 'المعلومة المطلوبة قد تتغير بمرور الوقت، لذلك استخدم البحث الحي للتأكد من الجزء الزمني بدل التخمين.'
      : '';
  }

  const concise = preferences?.responseStyle === 'concise';
  const detailed = preferences?.responseStyle === 'detailed';
  const facts = uniqueValues(entries, 'facts', concise ? 4 : detailed ? 13 : 8);
  const mistakes = uniqueValues(entries, 'mistakes', concise ? 2 : detailed ? 6 : 4);
  const steps = uniqueValues(entries, 'steps', concise ? 3 : detailed ? 8 : 5);
  const lines = [];

  if (facts.length) {
    lines.push('### نقاط مهمة مرتبطة بطلبك', ...facts.map((fact) => `- ${fact}`));
  }

  if (mistakes.length && ['comparison', 'decision', 'diagnosis', 'research', 'plan'].includes(intent)) {
    lines.push('', '### حاجات ممكن تبوّظ النتيجة', ...mistakes.map((mistake) => `- ${mistake}`));
  }

  if (steps.length) {
    lines.push('', '### خطوات عملية', ...steps.map((step, index) => `${index + 1}. ${step}`));
  }

  if (FRESHNESS.test(prompt)) {
    lines.push('', '### ملاحظة عن الحداثة', '- أي سعر أو إصدار أو خبر أو قانون أو توفر حالي يحتاج تأكيد بالبحث الحي قبل الاعتماد عليه.');
  }

  return lines.join('\n').trim();
}

export function superLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt, 14);
  const detailed = preferences.responseStyle === 'detailed';
  const baseLimit = detailed ? 8 : 5;
  const expandedLimit = detailed ? 10 : 6;
  const specialistLimit = detailed ? 12 : 7;

  const baseFirst = retrieveEncyclopediaKnowledge({ prompt, tool, mode, limit: baseLimit });
  const expansion = `${prompt} ${entities.join(' ')} ${INTENT_EXPANSIONS[intent] || INTENT_EXPANSIONS.general}`;
  const baseSecond = retrieveEncyclopediaKnowledge({ prompt: expansion, tool, mode, limit: baseLimit });
  const baseEntries = uniqueEntries(baseFirst, baseSecond).slice(0, detailed ? 12 : 8);
  const seedIds = baseEntries.map((entry) => entry.id);

  const expandedFirst = retrieveExpandedKnowledge({ prompt, tool, mode, limit: expandedLimit, seedIds });
  const expandedSecond = retrieveExpandedKnowledge({
    prompt: `${expansion} counterexample failure mode second order effect verification`,
    tool,
    mode,
    limit: expandedLimit,
    seedIds: [...seedIds, ...expandedFirst.map((entry) => entry.id)],
  });
  const expandedEntries = uniqueEntries(expandedFirst, expandedSecond).slice(0, detailed ? 16 : 10);

  const specialistSeeds = [...seedIds, ...expandedEntries.map((entry) => entry.id)];
  const expertEntries = uniqueEntries(
    retrieveExpertMaxKnowledge({ prompt: expansion, tool, mode, limit: specialistLimit, seedIds: specialistSeeds }),
    retrieveExpertMaxKnowledge({
      prompt: `${prompt} ${entities.join(' ')} failure mode security maintainability performance verification tradeoff`,
      tool,
      mode,
      limit: specialistLimit,
      seedIds: specialistSeeds,
    }),
  ).slice(0, detailed ? 18 : 11);

  const deepSeeds = [...specialistSeeds, ...expertEntries.map((entry) => entry.id)];
  const deepEntries = uniqueEntries(
    retrieveDeepExpertise({ prompt: expansion, tool, mode, limit: specialistLimit, seedIds: deepSeeds }),
    retrieveDeepExpertise({
      prompt: `${prompt} practical implementation edge cases debugging validation testing`,
      tool,
      mode,
      limit: specialistLimit,
      seedIds: deepSeeds,
    }),
  ).slice(0, detailed ? 16 : 10);

  const proSeeds = [...deepSeeds, ...deepEntries.map((entry) => entry.id)];
  const proEntries = uniqueEntries(
    retrieveProExpertise({ prompt: expansion, tool, mode, limit: specialistLimit, seedIds: proSeeds }),
    retrieveProExpertise({
      prompt: `${prompt} production workflow measurement quality delivery risk verification`,
      tool,
      mode,
      limit: specialistLimit,
      seedIds: proSeeds,
    }),
  ).slice(0, detailed ? 16 : 10);

  const allEntries = uniqueEntries(proEntries, deepEntries, expertEntries, expandedEntries, baseEntries)
    .slice(0, detailed ? 36 : 22);

  const advanced = advancedLocalResponse({ prompt, tool, mode, preferences });
  const baseAnswer = baseAnswerFromAdvanced(advanced);
  const enrichment = synthesize({ prompt, intent, entries: allEntries, preferences });

  // Keep coverage metadata available internally without exposing implementation details in the user answer.
  void knowledgeBreadth();

  return [baseAnswer, enrichment].filter(Boolean).join('\n\n').trim();
}
