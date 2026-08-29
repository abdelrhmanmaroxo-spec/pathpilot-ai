import { localReasonedResponse, retrieveLocalKnowledge } from './local-intelligence.js';

const INTENTS = [
  ['comparison', /(قارن|مقارنة|أفضل|اختار|أختار|ولا|vs\.?|compare|best|choose|pros?\s+and\s+cons?)/i],
  ['diagnosis', /(مشكلة|خطأ|مش شغال|لا يعمل|crash|error|bug|fix|حل المشكلة|debug|تعطل)/i],
  ['plan', /(خطة|رتب|نظم|ابدأ|ابدأ ازاي|كيف أبدأ|roadmap|plan|organize|schedule|خطوات)/i],
  ['research', /(ابحث|بحث|مصادر|مراجع|دراسة|آخر تحديث|احدث|latest|research|sources|evidence)/i],
  ['writing', /(اكتب|صياغ|رسالة|ايميل|إيميل|بوست|مقال|سكريبت|cv|cover|write|rewrite)/i],
  ['brainstorm', /(أفكار|فكرة|اقتراحات|brainstorm|ideas|ابتكر|طور الفكرة)/i],
  ['learn', /(اشرح|علمني|فهمني|ما هو|ما هي|يعني ايه|explain|learn|teach|difference|الفرق)/i],
  ['decision', /(هل أعمل|هل اعمل|تنصح|قرار|أشتري|اشتري|أقدم|أختار|should i|recommend)/i],
];

const FRESHNESS = /(آخر|احدث|أحدث|اليوم|حاليا|دلوقت|2026|2027|سعر|أسعار|نسخة|version|release|latest|today|current|news|تحديثات)/i;
const HIGH_STAKES = /(طبي|دواء|تشخيص صحي|قانوني|محامي|استثمار مضمون|قرض|ضرائب|حمل|جرعة|medical|legal|dosage)/i;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function detectLocalIntent(prompt, tool = 'ask') {
  const text = normalize(prompt);
  if (tool === 'decide') return 'comparison';
  if (tool === 'brainstorm') return 'brainstorm';
  if (tool === 'research') return 'research';
  if (tool === 'rewrite' || tool === 'email' || tool === 'cover' || tool === 'cv' || tool === 'content') return 'writing';
  if (tool === 'plan' || tool === 'organize' || tool === 'tasks') return 'plan';
  if (tool === 'qa') return 'diagnosis';
  if (tool === 'explain' || tool === 'quiz' || tool === 'flashcards' || tool === 'summarize') return 'learn';
  return INTENTS.find(([, pattern]) => pattern.test(text))?.[0] || 'general';
}

export function extractLocalEntities(prompt, limit = 8) {
  const stop = new Set(['هذا','هذه','ذلك','على','إلى','الى','من','في','عن','مع','او','أو','هل','عايز','اريد','أريد','اعمل','اعمللي','ساعدني','best','with','from','that','this','what','how','the','and','for']);
  const counts = new Map();
  const words = normalize(prompt).match(/[\p{L}\p{N}+#.\-]{2,}/gu) || [];
  for (const word of words) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
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

function confidenceLabel(packs, entities) {
  if (packs.length >= 3 && entities.length >= 3) return 'مرتفع نسبيًا';
  if (packs.length >= 1) return 'متوسط';
  return 'منخفض';
}

function composeAdaptiveSection({ intent, prompt, entities, packs, preferences }) {
  const detailed = preferences?.responseStyle === 'detailed';
  const concise = preferences?.responseStyle === 'concise';
  const steps = taskShape(intent).slice(0, concise ? 4 : detailed ? 7 : 6);
  const domainNames = packs.map((pack) => pack.id);
  const lines = [
    'طبقة الاستدلال المحلي',
    `• نوع المهمة: ${intent}`,
    `• الموضوعات المستخرجة: ${entities.length ? entities.join('، ') : 'لم يتم استخراج كيانات واضحة'}`,
    `• المجالات المسترجعة: ${domainNames.length ? domainNames.join(' + ') : 'معرفة عامة'}`,
    `• ثقة المطابقة: ${confidenceLabel(packs, entities)}`,
    '',
    'خطة التفكير',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
  ];

  if (FRESHNESS.test(prompt)) {
    lines.push('', 'حدود المعرفة', '• الطلب يتضمن معلومات زمنية أو متغيرة. المحلي يقدر يحلل ويهيكل، لكنه لا يثبت أحدث نسخة/سعر/خبر بدون بحث حي.');
  }
  if (HIGH_STAKES.test(prompt)) {
    lines.push('', 'تنبيه', '• الموضوع قد يكون عالي التأثير. استخدم المحلي للمساعدة في التنظيم والفهم، وليس كبديل عن مصدر متخصص مؤهل.');
  }
  return lines.join('\n');
}

export function advancedLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt);
  const packs = retrieveLocalKnowledge({ prompt, tool, mode, limit: preferences.responseStyle === 'detailed' ? 6 : 4 });
  const base = localReasonedResponse({ prompt, tool, mode, preferences });
  const adaptive = composeAdaptiveSection({ intent, prompt, entities, packs, preferences });

  return [
    '🧠 PathPilot Local Reasoner',
    adaptive,
    '',
    'المعالجة المبنية على المعرفة',
    base,
  ].join('\n');
}
