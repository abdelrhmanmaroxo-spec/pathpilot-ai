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

const CHALLENGE_HINTS = {
  comparison: 'متى يكون الاختيار العكسي أفضل وما الشرط الذي يقلب القرار',
  diagnosis: 'فرضية بديلة سبب غير مباشر نقطة فشل سابقة وكيف أفند السبب الأول',
  plan: 'ما الذي قد يفشل الخطة اعتماد خفي تأخير مورد ناقص نقطة تراجع',
  research: 'دليل مضاد مصدر مستقل تحيز تضارب مصالح claim لا تدعمه الأدلة',
  writing: 'سوء فهم محتمل غموض نبرة خاطئة ادعاء غير مدعوم',
  brainstorm: 'لماذا قد تفشل الفكرة وما أرخص تجربة تقتل الافتراض مبكرًا',
  learn: 'مثال مضاد حد المفهوم التباس شائع سؤال نقل لموقف جديد',
  decision: 'ندم محتمل downside أسوأ حالة شرط توقف حساسية القرار',
  general: 'افتراض مخفي بديل معقول خطر فشل وكيف أختبره بسرعة',
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function detectLocalIntent(prompt, tool = 'ask') {
  const text = normalize(prompt);
  if (tool === 'decide') return 'comparison';
  if (tool === 'brainstorm') return 'brainstorm';
  if (tool === 'research') return 'research';
  if (['rewrite', 'email', 'cover', 'cv', 'content'].includes(tool)) return 'writing';
  if (['plan', 'organize', 'tasks'].includes(tool)) return 'plan';
  if (tool === 'qa') return 'diagnosis';
  if (['explain', 'quiz', 'flashcards', 'summarize'].includes(tool)) return 'learn';
  return INTENTS.find(([, pattern]) => pattern.test(text))?.[0] || 'general';
}

export function extractLocalEntities(prompt, limit = 8) {
  const stop = new Set(['هذا', 'هذه', 'ذلك', 'على', 'إلى', 'الى', 'من', 'في', 'عن', 'مع', 'او', 'أو', 'هل', 'عايز', 'اريد', 'أريد', 'اعمل', 'ساعدني', 'best', 'with', 'from', 'that', 'this', 'what', 'how', 'the', 'and', 'for']);
  const counts = new Map();
  const words = normalize(prompt).match(/[-\p{L}\p{N}+#.]{2,}/gu) || [];
  for (const word of words) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

export function extractLocalConstraints(prompt, limit = 6) {
  const text = String(prompt || '');
  const candidates = [];
  const patterns = [
    /\b\d+(?:\.\d+)?\s*(?:دقيقة|دقائق|ساعة|ساعات|يوم|أيام|اسبوع|أسبوع|أسابيع|شهر|شهور|minute|minutes|hour|hours|day|days|week|weeks|month|months)\b/gi,
    /(?:\$|€|£|جنيه|دولار|ريال|egp|usd|eur)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:\$|€|£|جنيه|دولار|ريال|egp|usd|eur)/gi,
    /\b(?:windows|linux|macos|android|ios|chrome|edge|firefox|node(?:\.js)?|python|react|vue|railway|github|webgpu)\b/gi,
    /(?:لازم|ضروري|شرط|بدون|فقط|أقصى|اقل|أقل|must|without|only|max(?:imum)?|min(?:imum)?)[^،,.\n]{0,55}/gi,
  ];
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) candidates.push(match.trim());
  }
  return [...new Set(candidates)].slice(0, limit);
}

function taskShape(intent) {
  const shapes = {
    comparison: ['حدد الخيارات الحقيقية', 'استخرج الشروط التي لا يمكن التنازل عنها', 'اختر معايير القرار المهمة ورتبها', 'قارن نقاط القوة والضعف حسب حالة الاستخدام', 'اختبر متى ينقلب القرار للخيار الآخر', 'قدّم اختيارًا مشروطًا لا ترتيبًا مطلقًا'],
    diagnosis: ['حدد المتوقع والفعلي', 'ثبّت البيئة وآخر تغيير سبق المشكلة', 'قلّص المشكلة لأصغر حالة قابلة لإعادة الإنتاج', 'رتب الأسباب بالاحتمال والتأثير وسهولة الاختبار', 'اختبر فرضية واحدة ثم حاول تفنيدها', 'تحقق أن الإصلاح أزال السبب ولم يخفِ العرض فقط'],
    plan: ['حدد النتيجة النهائية ومعيار قبولها', 'استخرج القيود والموارد والاعتماديات', 'قسّم لمراحل صغيرة لها مخرجات قابلة للمراجعة', 'ضع نقطة تحقق ومعيار توقف لكل مرحلة', 'أضف هامشًا للفشل أو التأخير وخطة تراجع', 'ابدأ بأصغر خطوة تقلل أكبر قدر من الغموض'],
    research: ['حوّل السؤال إلى ادعاءات قابلة للتحقق', 'فضّل المصدر الأولي أو الرسمي', 'ابحث عن مصدر مستقل ودليل مضاد', 'افصل الحقيقة عن الاستنتاج والتوقع', 'راجع تاريخ المعلومة وتعارض المصالح', 'علّم بوضوح ما يحتاج بحثًا حيًا'],
    writing: ['حدد الجمهور والهدف والنتيجة المطلوبة', 'ابدأ بالرسالة الأساسية مباشرة', 'رتب التفاصيل حسب ما يحتاجه القارئ', 'احذف الحشو والادعاءات غير المدعومة', 'اختبر أين يمكن أن يُفهم النص بشكل خاطئ', 'اختم بخطوة تالية واضحة'],
    brainstorm: ['وسّع مساحة الحلول قبل التقييم', 'قسّم الأفكار حسب القيمة والتكلفة والمخاطرة', 'أضف اتجاهات مختلفة بدل نسخ الفكرة نفسها', 'حدد الافتراض الأخطر في كل فكرة قوية', 'صمم تجربة صغيرة ورخيصة لاختبار الافتراض', 'رتب الأفكار بالقيمة وسهولة التحقق'],
    learn: ['عرّف الفكرة ببساطة وحدد حدودها', 'اربطها بمشكلة تحلها', 'اعط مثالًا عمليًا ومثالًا مضادًا', 'اذكر خطأ شائعًا ولماذا هو خطأ', 'اطلب تطبيق الفكرة في حالة جديدة', 'صحح الفهم بناء على نتيجة التطبيق'],
    decision: ['حدد ما يهم المستخدم فعلًا', 'فرّق بين شرط أساسي وتفضيل', 'وازن الفائدة والتكلفة والمخاطرة', 'اختبر أسوأ حالة وندم القرار', 'حدد ما الذي لو تغير سيقلب القرار', 'قدّم توصية مشروطة مع نقطة إعادة تقييم'],
    general: ['حدد المطلوب الحقيقي', 'استخرج القيود والافتراضات', 'قسّم المشكلة إلى أجزاء قابلة للاختبار', 'افحص بديلًا معقولًا للتفسير الأول', 'اختر خطوة عملية تقلل الغموض', 'راجع النتيجة قبل التوسع'],
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
  return `${prompt} ${entities.join(' ')} ${GAP_HINTS[intent] || GAP_HINTS.general} جوانب مكملة غير مغطاة ${covered}`;
}

function challengePassQuery(prompt, intent, entities, packs) {
  const covered = packs.map((pack) => pack.id).join(' ');
  return `${prompt} ${entities.join(' ')} ${CHALLENGE_HINTS[intent] || CHALLENGE_HINTS.general} اختبر الافتراضات وابحث عن تفسير أو مخاطرة بديلة ${covered}`;
}

function deriveCrossDomainInsights(packs, intent, max = 7) {
  const facts = [...new Set(packs.flatMap((pack) => pack.facts || []))];
  const mistakes = [...new Set(packs.flatMap((pack) => pack.mistakes || []))];
  const steps = [...new Set(packs.flatMap((pack) => pack.steps || []))];
  const out = [];
  if (facts[0]) out.push(`• قاعدة أساسية: ${facts[0]}`);
  if (facts[1]) out.push(`• عامل مكمل: ${facts[1]}`);
  if (facts[2] && ['comparison', 'decision', 'research', 'diagnosis'].includes(intent)) out.push(`• عامل قد يغيّر النتيجة: ${facts[2]}`);
  if (mistakes[0]) out.push(`• مخاطرة متوقعة: ${mistakes[0]}`);
  if (mistakes[1] && ['research', 'decision', 'diagnosis'].includes(intent)) out.push(`• فشل بديل يجب استبعاده: ${mistakes[1]}`);
  if (steps[0]) out.push(`• خطوة عملية أولى: ${steps[0]}`);
  if (steps[1] && ['diagnosis', 'plan', 'research'].includes(intent)) out.push(`• بعدها مباشرة: ${steps[1]}`);
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

function confidenceLabel(firstPass, secondPass, challengePass, entities) {
  const total = uniquePacks(firstPass, secondPass, challengePass).length;
  if (total >= 5 && entities.length >= 3) return 'مرتفع نسبيًا';
  if (total >= 3) return 'متوسط إلى جيد';
  if (total >= 2) return 'متوسط';
  return 'منخفض';
}

function buildSummary(intent, packs, constraints) {
  const facts = [...new Set(packs.flatMap((pack) => pack.facts || []))];
  const steps = [...new Set(packs.flatMap((pack) => pack.steps || []))];
  const lines = [];
  if (facts[0]) lines.push(`• أهم ما يحكم الإجابة: ${facts[0]}`);
  if (steps[0]) lines.push(`• أفضل بداية عملية: ${steps[0]}`);
  if (constraints.length) lines.push(`• القرار لازم يحترم القيود المذكورة: ${constraints.join('، ')}.`);
  if (!lines.length) lines.push(`• تم التعامل مع الطلب كمسألة ${intent} مع تقليل الافتراضات غير المدعومة.`);
  return lines;
}

export function advancedLocalResponse({ prompt, tool = 'ask', mode = 'general', preferences = {} }) {
  const intent = detectLocalIntent(prompt, tool);
  const entities = extractLocalEntities(prompt, 10);
  const constraints = extractLocalConstraints(prompt, 6);
  const detailed = preferences.responseStyle === 'detailed';
  const concise = preferences.responseStyle === 'concise';
  const limit = detailed ? 6 : concise ? 3 : 4;

  const firstPass = retrieveLocalKnowledge({ prompt, tool, mode, limit });
  const expandedQuery = secondPassQuery(prompt, intent, entities, firstPass);
  const secondPass = retrieveLocalKnowledge({ prompt: expandedQuery, tool, mode, limit });
  const mergedBeforeChallenge = uniquePacks(firstPass, secondPass);
  const challengeQuery = challengePassQuery(prompt, intent, entities, mergedBeforeChallenge);
  const challengePass = retrieveLocalKnowledge({ prompt: challengeQuery, tool, mode, limit: concise ? 2 : limit });
  const packs = uniquePacks(firstPass, secondPass, challengePass).slice(0, detailed ? 11 : concise ? 6 : 9);
  const insights = deriveCrossDomainInsights(packs, intent, detailed ? 8 : concise ? 4 : 6);
  const checks = conflictChecks(packs);
  const steps = taskShape(intent).slice(0, concise ? 4 : detailed ? 7 : 6);
  const base = localReasonedResponse({ prompt, tool, mode, preferences });
  const summary = buildSummary(intent, packs, constraints);

  const lines = [
    '🧠 PathPilot Local Reasoner',
    `• نوع المهمة: ${intent}`,
    `• الموضوعات المستخرجة: ${entities.length ? entities.join('، ') : 'لم يتم استخراج عناصر واضحة'}`,
    `• القيود المكتشفة: ${constraints.length ? constraints.join('، ') : 'لا توجد قيود صريحة؛ تجنبت افتراض قيود من عندي'}`,
    `• ثقة المطابقة: ${confidenceLabel(firstPass, secondPass, challengePass, entities)}`,
    '',
    'الخلاصة',
    ...summary,
    '',
    'خطة المعالجة',
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    'استنتاجات من أكثر من مجال',
    ...(insights.length ? insights : ['• لا يوجد تطابق معرفي قوي؛ قلّل الافتراضات واطلب تفاصيل إضافية عند الحاجة.']),
    '',
    'اختبار عكسي قبل اعتماد الإجابة',
    `• حاول إثبات أن أول تفسير أو اختيار غير صحيح: ${CHALLENGE_HINTS[intent] || CHALLENGE_HINTS.general}.`,
  ];

  if (checks.length) lines.push('', 'فحوص تعارض ومخاطر', ...checks.map((check) => `• ${check}`));
  if (FRESHNESS.test(prompt)) lines.push('', 'حدود المعرفة', '• الطلب يتضمن معلومات متغيرة زمنيًا. المحلي يحلل ويهيكل، لكنه لا يثبت أحدث نسخة أو سعر أو خبر بدون بحث حي.');
  if (HIGH_STAKES.test(prompt)) lines.push('', 'تنبيه', '• الموضوع عالي التأثير نسبيًا. استخدم المحلي للتنظيم والفهم وليس كبديل عن مصدر متخصص مؤهل.');

  lines.push('', 'المعالجة المبنية على المعرفة', base);
  return lines.join('\n');
}