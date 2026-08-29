import { localReasonedResponse, retrieveLocalKnowledge } from './local-intelligence.js';

const INTENTS = [
  ['comparison', /(قارن|مقارنة|أفضل|اختار|أختار|ولا|vs\.?|compare|best|choose|pros?\s+and\s+cons?)/i],
  ['diagnosis', /(مشكلة|خطأ|مش شغال|لا يعمل|crash|error|bug|fix|حل المشكلة|debug|تعطل)/i],
  ['plan', /(خطة|رتب|نظم|ابدأ|كيف أبدأ|roadmap|plan|organize|schedule|خطوات)/i],
  ['research', /(ابحث|بحث|مصادر|مراجع|دراسة|آخر تحديث|احدث|latest|research|sources|evidence)/i],
  ['writing', /(اكتب|صياغ|رسالة|ايميل|إيميل|بوست|مقال|سكريبت|cv|cover|write|rewrite)/i],
  ['brainstorm', /(أفكار|فكرة|اقتراحات|brainstorm|ideas|ابتكر|طور الفكرة)/i],
  ['learn', /(اشرح|علمني|فهمني|ما هو|ما هي|يعني ايه|explain|learn|teach|difference|الفرق)/i],
  ['decision', /(هل أعمل|هل اعمل|تنصح|قرار|أشتري|اشتري|أقدم|أختار|should i|recommend)/i],
];

const FRESHNESS = /(آخر|احدث|أحدث|اليوم|حاليا|دلوقت|2026|2027|سعر|أسعار|نسخة|version|release|latest|today|current|news|تحديثات)/i;
const HIGH_STAKES = /(طبي|دواء|تشخيص صحي|قانوني|محامي|استثمار مضمون|قرض|ضرائب|حمل|جرعة|medical|legal|dosage)/i;

const GAP_HINTS = {
  comparison: 'معايير بدائل مزايا عيوب تكلفة مخاطر قرار شروط أساسية',
  diagnosis: 'أسباب جذرية logs timeout شبكة api database regression اختبار',
  plan: 'مراحل أولويات اعتماديات موارد وقت مخاطر نقاط تحقق تنفيذ',
  research: 'مصدر رسمي توثيق دليل تحقق حداثة تعارض جودة citations',
  writing: 'جمهور هدف نبرة وضوح بنية سياق خطوة تالية',
  brainstorm: 'بدائل جدوى تكلفة قيمة مستخدم مخاطرة تجربة صغيرة',
  learn: 'تعريف مثال تطبيق مقارنة خطأ شائع اختبار فهم',
  decision: 'شروط تكلفة فائدة مخاطرة tradeoff بدائل قيود',
  general: 'هدف قيود بدائل مخاطر تنفيذ تحقق',
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function detectLocalIntent(prompt, tool = 'ask') {
  const text = normalize(prompt);
  if (tool === 'decide') return 'comparison';
  if (tool === 'brainstorm') return 'brainstorm';
  if (tool === 'research') return 'research';
  if (['rewrite','email','cover','cv','content'].includes(tool)) return 'writing';
  if (['plan','organize','tasks'].includes(tool)) return 'plan';
  if (tool === 'qa') return 'diagnosis';
  if (['explain','quiz','flashcards','summarize'].includes(tool)) return 'learn';
  return INTENTS.find(([, pattern]) => pattern.test(text))?.[0] || 'general';
}

export function extractLocalEntities(prompt, limit = 8) {
  const stop = new Set(['هذا','هذه','ذلك','على','إلى','الى','من','في','عن','مع','او','أو','هل','عايز','اريد','أريد','اعمل','ساعدني','best','with','from','that','this','what','how','the','and','for']);
  const counts = new Map();
  const words = normalize(prompt).match(/[-\p{L}\p{N}+#.]{2,}/gu) || [];
  for (const word of words) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, limit).map(([word]) => word);
}

function taskShape(intent) {
  const shapes = {
    comparison: ['حدد الخيارات الحقيقية', 'اختر معايير القرار المهمة', 'قارن نقاط القوة والضعف', 'استبعد ما يفشل في الشروط الأساسية', 'قدّم اختيارًا حسب حالة الاستخدام'],
    diagnosis: ['حدد المتوقع والفعلي', 'حدد آخر تغيير محتمل', 'قلّص المشكلة لأصغر حالة', 'رتب الأسباب بالاحتمال والتأثير', 'اختبر فرضية واحدة في كل مرة', 'تحقق أن الإصلاح لم يكسر شيئًا آخر'],
    plan: ['حدد النتيجة النهائية', 'حدد القيود والموارد', 'قسّم لمراحل صغيرة', 'ضع نقطة تحقق لكل مرحلة', 'أضف هامشًا للفشل أو التأخير', 'ابدأ بأصغر خطوة تقلل الغموض'],
    research: ['حدد الادعاءات التي تحتاج تحققًا', 'فضّل المصدر الأولي أو الرسمي', 'قارن أكثر من مصدر عند التعارض', 'افصل الحقائق عن الاستنتاج', 'علّم ما يحتاج تحديثًا حيًا'],
    writing: ['حدد الجمهور والهدف', 'ابدأ بالرسالة الأساسية', 'رتب التفاصيل حسب الأهمية', 'احذف الحشو', 'اختم بخطوة تالية واضحة'],
    brainstorm: ['وسّع مساحة الحلول أولًا', 'قسّم الأفكار حسب التكلفة والمخاطرة', 'أضف اتجاهات غير تقليدية', 'رتب أقوى الأفكار بالقيمة وسهولة الاختبار', 'حدد تجربة صغيرة لكل فكرة قوية'],
    learn: ['عرّف الفكرة ببساطة', 'اربطها بمشكلة تحلها', 'اعط مثالًا', 'اذكر خطأ شائعًا', 'اختبر الفهم بحالة جديدة'],
    decision: ['حدد ما يهم المستخدم فعلًا', 'فرّق بين شرط أساسي وتفضيل', 'وازن الفائدة والتكلفة والمخاطرة', 'اذكر ما قد يغيّر القرار', 'قدّم توصية مشروطة'],
    general: ['حدد المطلوب الحقيقي', 'استخرج القيود', 'قسّم المشكلة', 'افحص البدائل', 'اختر خطوة عملية قابلة للاختبار'],
  };
  return shapes[intent] || shapes.general;
}

function uniquePacks(...groups) {
  const seen = new Set();
  const result = [];
  for (const pack of groups.flat()) {
    if (!pack?.id || seen.has(pack.id)) continue;
    seen.add(pack.id);
    result.push(pack);
  }
  return result;
}

function secondPassQuery(prompt, intent, entities, firstPass) {
  const covered = firstPass.map((pack) => pack.id).join(' ');
  return `${prompt} ${entities.join(' ')} ${GAP_HINTS[intent] || GAP_HINTS.general} ابحث محليًا عن جوانب مكملة غير مغطاة ${covered}`;
}

function deriveCrossDomainInsights(packs, intent, max = 6) {
  const facts = [...new Set(packs.flatMap((pack) => pack.facts || []))];
  const mistakes = [...new Set(packs.flatMap((pack) => pack.mistakes || []))];
  const steps = [...new Set(packs.flatMap((pack) => pack.steps || []))];
  const out = [];
  if (facts[0]) out.push(`• قاعدة أساسية: ${facts[0]}`);
  if (facts[1]) out.push(`• عامل مكمل: ${facts[1]}`);
  if (facts[2] && ['comparison','decision','research'].includes(intent)) out.push(`• عامل قد يغيّر النتيجة: ${facts[2]}`);
  if (mistakes[0]) out.push(`• مخاطرة متوقعة: ${mistakes[0]}`);
  if (steps[0]) out.push(`• خطوة عملية أولى: ${steps[0]}`);
  if (steps[1] && ['diagnosis','plan'].includes(intent)) out.push(`• الخطوة التالية: ${steps[1]}`);
  return out.slice(0, max);
}

function conflictChecks(packs) {
  const ids = new Set(packs.map((pack) => pack.id));
  const checks = [];
  if (ids.has('security') && (ids.has('web') || ids.has('api'))) checks.push('لا تُضحّي بالأمان لتسهيل التنفيذ، خصوصًا مع الأسرار والصلاحيات.');
  if (ids.has('ai') && ids.has('research')) checks.push('المعرفة المحلية لا تثبت حداثة ادعاء AI أو API؛ يلزم بحث حي للمعلومات المتغيرة.');
  if (ids.has('database') && ids.has('web')) checks.push('أي تغيير تخزين أو schema يحتاج مراعاة الترحيل والتوافق والنسخ الاحتياطي.');
  if (ids.has('career') && ids.has('writing')) checks.push('تحسين الصياغة لا يبرر إضافة خبرة أو أرقام غير مقدمة من المستخدم.');
  return checks.slice(0, 3);
}

function confidenceLabel(firstPass, secondPass, entities) {
  const total = uniquePacks(firstPass, secondPass).length;
  if (total >= 4 && entities.length >= 3) return 'مرتفع نسبيًا';
  if (total >= 2) return 'متوسط';
  return 'منخفض';
}

export function advancedLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt, 10);
  const detailed = preferences.responseStyle === 'detailed';
  const concise = preferences.responseStyle === 'concise';
  const limit = detailed ? 6 : concise ? 3 : 4;

  const firstPass = retrieveLocalKnowledge({ prompt, tool, mode, limit });
  const expandedQuery = secondPassQuery(prompt, intent, entities, firstPass);
  const secondPass = retrieveLocalKnowledge({ prompt: expandedQuery, tool, mode, limit });
  const packs = uniquePacks(firstPass, secondPass).slice(0, detailed ? 9 : 7);
  const firstIds = new Set(firstPass.map((pack) => pack.id));
  const newlyFound = packs.filter((pack) => !firstIds.has(pack.id));
  const insights = deriveCrossDomainInsights(packs, intent, detailed ? 7 : concise ? 4 : 6);
  const checks = conflictChecks(packs);
  const steps = taskShape(intent).slice(0, concise ? 4 : detailed ? 7 : 6);
  const base = localReasonedResponse({ prompt, tool, mode, preferences });

  const lines = [
    '🧠 PathPilot Local Reasoner',
    'طبقة الاستدلال المحلي',
    `• نوع المهمة: ${intent}`,
    `• الموضوعات المستخرجة: ${entities.length ? entities.join('، ') : 'لم يتم استخراج كيانات واضحة'}`,
    `• الاسترجاع الأول: ${firstPass.length ? firstPass.map((pack) => pack.id).join(' + ') : 'معرفة عامة'}`,
    `• الاسترجاع الثاني: ${newlyFound.length ? newlyFound.map((pack) => pack.id).join(' + ') : 'لم يحتج مجالًا إضافيًا واضحًا'}`,
    `• ثقة المطابقة: ${confidenceLabel(firstPass, secondPass, entities)}`,
    '',
    'خطة المعالجة',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    'استنتاجات من أكثر من مجال',
    ...(insights.length ? insights : ['• لا يوجد تطابق معرفي قوي؛ قلّل الافتراضات واطلب تفاصيل إضافية عند الحاجة.']),
  ];

  if (checks.length) lines.push('', 'فحوص تعارض ومخاطر', ...checks.map((check) => `• ${check}`));
  if (FRESHNESS.test(prompt)) lines.push('', 'حدود المعرفة', '• الطلب يتضمن معلومات متغيرة زمنيًا. المحلي يحلل ويهيكل، لكنه لا يثبت أحدث نسخة أو سعر أو خبر بدون بحث حي.');
  if (HIGH_STAKES.test(prompt)) lines.push('', 'تنبيه', '• الموضوع عالي التأثير نسبيًا. استخدم المحلي للتنظيم والفهم وليس كبديل عن مصدر متخصص مؤهل.');

  lines.push('', 'المعالجة المبنية على المعرفة', base);
  return lines.join('\n');
}
