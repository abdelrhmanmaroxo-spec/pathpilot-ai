import { advancedLocalResponse, detectLocalIntent, extractLocalEntities } from './local-reasoner.js';
import { retrieveEncyclopediaKnowledge, LOCAL_ENCYCLOPEDIA_STATS } from './local-encyclopedia.js';
import { retrieveExpandedKnowledge, EXPANDED_ENCYCLOPEDIA_STATS } from './local-encyclopedia-plus.js';
import { retrieveExpertMaxKnowledge, LOCAL_EXPERTISE_MAX_STATS } from './local-expertise-max.js';

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

function collectFacts(entries, limit) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    for (const fact of entry.facts || []) {
      if (seen.has(fact)) continue;
      seen.add(fact);
      result.push({ domain: entry.id, fact });
      if (result.length >= limit) return result;
    }
  }
  return result;
}

function collectMistakes(entries, limit) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    for (const mistake of entry.mistakes || []) {
      if (seen.has(mistake)) continue;
      seen.add(mistake);
      result.push({ domain: entry.id, mistake });
      if (result.length >= limit) return result;
    }
  }
  return result;
}

function collectSteps(entries, limit) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    for (const step of entry.steps || []) {
      if (seen.has(step)) continue;
      seen.add(step);
      result.push({ domain: entry.id, step });
      if (result.length >= limit) return result;
    }
  }
  return result;
}

function knowledgeBreadth() {
  return {
    domains: LOCAL_ENCYCLOPEDIA_STATS.domains + EXPANDED_ENCYCLOPEDIA_STATS.domains + LOCAL_EXPERTISE_MAX_STATS.domains,
    facts: LOCAL_ENCYCLOPEDIA_STATS.facts + EXPANDED_ENCYCLOPEDIA_STATS.facts + LOCAL_EXPERTISE_MAX_STATS.facts,
    mistakes: LOCAL_ENCYCLOPEDIA_STATS.mistakes + EXPANDED_ENCYCLOPEDIA_STATS.mistakes + LOCAL_EXPERTISE_MAX_STATS.mistakes,
    steps: LOCAL_ENCYCLOPEDIA_STATS.playbookSteps + EXPANDED_ENCYCLOPEDIA_STATS.playbookSteps + LOCAL_EXPERTISE_MAX_STATS.playbookSteps,
    expertVersion: LOCAL_EXPERTISE_MAX_STATS.version,
  };
}

function synthesize({ prompt, intent, entities, entries, preferences }) {
  if (!entries.length) return 'لم يظهر تطابق موسوعي قوي إضافي، لذلك خفّض المحرك الثقة واعتمد على الاستدلال الأساسي بدل اختراع تفاصيل.';
  const concise = preferences?.responseStyle === 'concise';
  const detailed = preferences?.responseStyle === 'detailed';
  const facts = collectFacts(entries, concise ? 5 : detailed ? 16 : 10);
  const mistakes = collectMistakes(entries, concise ? 2 : detailed ? 8 : 5);
  const steps = collectSteps(entries, concise ? 4 : detailed ? 10 : 6);

  const lines = [
    'توسيع معرفي خبير',
    `• المجالات الأقرب للسؤال: ${entries.slice(0, detailed ? 12 : 8).map((entry) => entry.id).join(' + ')}`,
    `• مفاتيح السؤال: ${entities.length ? entities.join('، ') : 'سؤال عام'}`,
    '',
    'نقاط معرفية تغيّر جودة القرار',
    ...facts.map(({ domain, fact }) => `• [${domain}] ${fact}`),
    '',
    'أين قد يخطئ التحليل',
    ...mistakes.map(({ domain, mistake }) => `• [${domain}] ${mistake}`),
    '',
    'ترتيب التنفيذ المقترح',
    ...steps.map(({ step }, index) => `${index + 1}. ${step}`),
  ];

  if (['comparison', 'decision', 'diagnosis', 'research'].includes(intent) && mistakes.length) {
    lines.push('', 'اختبار مضاد', `• قبل اعتماد أول إجابة، اختبر تحديدًا احتمال: ${mistakes[0].mistake}.`);
  }

  if (/(آخر|أحدث|احدث|اليوم|حاليا|دلوقت|سعر|version|release|latest|today|current|news|تحديثات|2026|2027)/i.test(prompt)) {
    lines.push('', 'حدود المعرفة المحلية', '• قاعدة المعرفة محلية وثابتة نسبيًا. تستخدم للفهم والتحليل، بينما الحقائق المتغيرة زمنيًا تحتاج البحث الحي للتأكيد.');
  }
  return lines.join('\n');
}

export function superLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt, 14);
  const detailed = preferences.responseStyle === 'detailed';
  const baseLimit = detailed ? 8 : 5;
  const expandedLimit = detailed ? 10 : 6;
  const expertLimit = detailed ? 12 : 7;

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

  const expertSeeds = [...seedIds, ...expandedEntries.map((entry) => entry.id)];
  const expertFirst = retrieveExpertMaxKnowledge({ prompt: expansion, tool, mode, limit: expertLimit, seedIds: expertSeeds });
  const expertSecond = retrieveExpertMaxKnowledge({
    prompt: `${prompt} ${entities.join(' ')} failure mode security maintainability performance verification tradeoff`,
    tool,
    mode,
    limit: expertLimit,
    seedIds: [...expertSeeds, ...expertFirst.map((entry) => entry.id)],
  });
  const expertEntries = uniqueEntries(expertFirst, expertSecond).slice(0, detailed ? 18 : 11);

  const allEntries = uniqueEntries(expertEntries, expandedEntries, baseEntries).slice(0, detailed ? 28 : 18);
  const reasoned = advancedLocalResponse({ prompt, tool, mode, preferences });
  const encyclopedia = synthesize({ prompt, intent, entities, entries: allEntries, preferences });
  const breadth = knowledgeBreadth();

  return [
    '🧠 PathPilot Local Expert Reasoner',
    `قاعدة المعرفة المحلية النشطة: ${breadth.domains} مجالًا، ${breadth.facts} مبدأ/قاعدة معرفية، ${breadth.mistakes} نمط خطأ، ${breadth.steps} خطوة إرشادية.`,
    `Expert Pack: ${breadth.expertVersion}`,
    '',
    reasoned,
    '',
    encyclopedia,
    '',
    'تركيب نهائي',
    '• المحلي لا يكتفي بأول تطابق: يوسّع الفجوات، يسترجع خبرة تخصصية، ثم يبحث عن اعتراض أو سبب فشل مضاد.',
    '• القيود الصريحة في طلب المستخدم لها أولوية على القواعد العامة.',
    '• عند التعارض، خفّض الثقة وحدد ما يحتاج تحققًا بدل إخفاء عدم اليقين.',
    '• لا تحوّل المعرفة العامة إلى حقيقة حديثة أو شخصية لم يقدمها المستخدم.',
    '• في البرمجة والأنظمة والأمن، راجع failure modes والاختبارات والمراقبة قبل اعتبار الحل مكتملًا.',
    '• اختم بخطوة قابلة للاختبار، ثم راجع النتيجة قبل التوسع.'
  ].join('\n');
}
