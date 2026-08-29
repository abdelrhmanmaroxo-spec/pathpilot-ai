import { advancedLocalResponse, detectLocalIntent, extractLocalEntities } from './local-reasoner.js';
import { retrieveEncyclopediaKnowledge, LOCAL_ENCYCLOPEDIA_STATS } from './local-encyclopedia.js';

const INTENT_EXPANSIONS = {
  comparison: 'قرار tradeoff معايير مخاطر تكلفة قيمة بدائل تفكير نقدي',
  diagnosis: 'سبب جذري دليل اختبار فرضيات نظام شبكات امن architecture',
  plan: 'أهداف موارد مراحل مخاطر اعتماديات project management decision',
  research: 'منهج بحث مصادر أدلة احصاء تفكير نقدي تحيز تحقق',
  writing: 'جمهور هدف وضوح اقناع writing communication ethics',
  brainstorm: 'ابتكار business product value risk experiment entrepreneurship',
  learn: 'تعلم شرح مثال ذاكرة تطبيق critical thinking science',
  decision: 'قرار احتمال مخاطرة تكلفة منفعة alternative scenario decision science',
  general: 'تفكير نقدي قرار تحليل نظام معرفة عامة',
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
      result.push(mistake);
      if (result.length >= limit) return result;
    }
  }
  return result;
}

function collectSteps(entries, limit) {
  return [...new Set(entries.flatMap((entry) => entry.steps || []))].slice(0, limit);
}

function synthesize({ prompt, intent, entities, entries, preferences }) {
  if (!entries.length) return 'الموسوعة لم تجد مجالًا إضافيًا قويًا لهذا الطلب، لذلك اعتمد المحرك على قاعدة المعرفة والاستدلال الأساسية.';
  const concise = preferences?.responseStyle === 'concise';
  const detailed = preferences?.responseStyle === 'detailed';
  const facts = collectFacts(entries, concise ? 4 : detailed ? 12 : 8);
  const mistakes = collectMistakes(entries, concise ? 2 : detailed ? 6 : 4);
  const steps = collectSteps(entries, concise ? 3 : detailed ? 7 : 5);
  const lines = [
    '📚 طبقة الموسوعة الفكرية',
    `• نوع السؤال: ${intent}`,
    `• المجالات الموسوعية: ${entries.map((entry) => entry.id).join(' + ')}`,
    `• مفاتيح السؤال: ${entities.length ? entities.join('، ') : 'عام'}`,
    '',
    'معرفة موسوعية مرتبطة',
    ...facts.map(({ domain, fact }) => `• [${domain}] ${fact}`),
    '',
    'أخطاء تفكير محتملة',
    ...mistakes.map((item) => `• ${item}`),
    '',
    'مسار عمل مقترح',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
  ];

  if (/(آخر|أحدث|احدث|اليوم|حاليا|دلوقت|سعر|version|release|latest|today|current|news|تحديثات|2026|2027)/i.test(prompt)) {
    lines.push('', 'حدود الموسوعة', '• الموسوعة محلية وثابتة نسبيًا. تستخدم للفهم والتحليل، بينما الحقائق المتغيرة زمنيًا تحتاج البحث الحي للتأكيد.');
  }
  return lines.join('\n');
}

export function superLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt, 12);
  const first = retrieveEncyclopediaKnowledge({ prompt, tool, mode, limit: preferences.responseStyle === 'detailed' ? 8 : 5 });
  const expansion = `${prompt} ${entities.join(' ')} ${INTENT_EXPANSIONS[intent] || INTENT_EXPANSIONS.general}`;
  const second = retrieveEncyclopediaKnowledge({ prompt: expansion, tool, mode, limit: preferences.responseStyle === 'detailed' ? 8 : 5 });
  const entries = uniqueEntries(first, second).slice(0, preferences.responseStyle === 'detailed' ? 12 : 8);
  const reasoned = advancedLocalResponse({ prompt, tool, mode, preferences });
  const encyclopedia = synthesize({ prompt, intent, entities, entries, preferences });

  return [
    '🧠 PathPilot Local Super Reasoner',
    `موسوعة محلية: ${LOCAL_ENCYCLOPEDIA_STATS.domains} مجالًا، ${LOCAL_ENCYCLOPEDIA_STATS.facts} قاعدة معرفية، ${LOCAL_ENCYCLOPEDIA_STATS.playbookSteps} خطوة إرشادية.`,
    '',
    reasoned,
    '',
    encyclopedia,
    '',
    'تركيب نهائي',
    '• اجمع بين المعرفة المباشرة والموسوعية، وفضّل ما يطابق هدف المستخدم وقيوده.',
    '• عند التعارض، لا تخفِ عدم اليقين وحدد ما يحتاج تحققًا إضافيًا.',
    '• لا تحوّل المعرفة العامة إلى حقيقة حديثة أو شخصية لم يقدمها المستخدم.',
    '• اختم دائمًا بخطوة قابلة للتنفيذ بدل الاكتفاء بالتفسير.'
  ].join('\n');
}
