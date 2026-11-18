const PHRASE_PAIRS = [
  // Headings & structural markers
  ['ملخص ذكي للمواد', 'Smart Material Summary'],
  ['الدمج المنهجي الموحد لـ', 'Unified Curriculum Synthesis of'],
  ['مواد دراسية / معرفية', 'Study / Knowledge Materials'],
  ['زاوية التركيز المطلوبة:', 'Requested Focus Angle:'],
  ['هدف الدمج والتركيب:', 'Synthesis & Merge Objective:'],
  ['أهم المصطلحات والمفاهيم المحورية', 'Key Concepts & Core Terminology'],
  ['مراجعة نشطة لتثبيت الفهم', 'Active Recall & Comprehension Check'],
  ['١. القواسم والمفاهيم المشتركة بين المواد', '1. Shared Concepts & Pillars Across Materials'],
  ['٢. الملخص المدمج بدون تكرار', '2. Deduplicated Unified Master Summary'],
  ['٣. ما تنفرد به كل مادة عن الأخرى', '3. Distinct Angles & Unique Points per Source'],
  ['٤. خلاصة الربط والاستنتاج للتطبيق والامتحان', '4. Exam Connections & Practical Takeaways'],
  ['نقاط مهمة مرتبطة بطلبك', 'Key Insights Related to Your Request'],
  ['حاجات ممكن تبوّظ النتيجة', 'Common Pitfalls That Can Hurt Results'],
  ['خطوات عملية', 'Actionable Next Steps'],
  ['ملاحظة عن الحداثة', 'Freshness & Verification Note'],
  ['الخلاصة', 'Executive Summary'],
  ['خطة المعالجة', 'Processing & Action Plan'],
  ['استنتاجات من أكثر من مجال', 'Cross-Domain Insights'],
  ['اختبار عكسي قبل اعتماد الإجابة', 'Reverse Stress-Test Before Finalizing'],
  ['فحوص تعارض ومخاطر', 'Conflict & Risk Checks'],
  ['حدود المعرفة', 'Knowledge Boundaries'],
  ['تنبيه', 'Important Caution'],
  ['المعالجة المبنية على المعرفة', 'Knowledge-Grounded Analysis'],
  ['استنتاجات مركبة', 'Synthesized Conclusions'],
  ['النتيجة المحلية المتعمقة', 'In-Depth Local Analysis'],
  ['تطبيق مباشر للأداة', 'Direct Tool Output'],
  ['ملخص مركز', 'Focused Summary'],
  ['كلمات أساسية', 'Key Terms'],
  ['مراجعة نشطة', 'Active Review'],
  ['خطة مذاكرة قابلة للتنفيذ', 'Actionable Study Plan'],
  ['قاعدة التنفيذ', 'Execution Rule'],
  ['اختبار فهم', 'Comprehension Quiz'],
  ['طريقة الاستخدام', 'How to Use This'],
  ['بطاقات مراجعة', 'Review Flashcards'],
  ['خريطة بحث', 'Structured Research Map'],
  ['أسئلة البحث', 'Research Questions'],
  ['ترتيب المصادر', 'Source Priority Order'],
  ['المخرج النهائي', 'Final Deliverable'],
  ['شرح مبسّط', 'Clear Step-by-Step Explanation'],
  ['مصطلحات تستحق التركيز', 'Terms Worth Focusing On'],
  ['مثال عملي', 'Practical Example'],
  ['سؤال مراجعة', 'Review Question'],
  ['خطة تنفيذ', 'Execution Plan'],
  ['تعريف الانتهاء', 'Definition of Done'],
  ['ملخص اجتماع منظم', 'Structured Meeting Summary'],
  ['القرارات', 'Decisions Made'],
  ['أسئلة مفتوحة', 'Open Questions'],
  ['مخاطر / Dependencies', 'Risks & Dependencies'],
  ['CV bullet مقترح', 'Suggested CV Bullet'],
  ['قبل الاستخدام', 'Before Using This'],
  ['نسخة أوضح', 'Clearer Rewritten Version'],
  ['مراجعة سريعة', 'Quick Check'],
  ['أفكار موسعة حول:', 'Expanded Ideas Around:'],
  ['عملية وسريعة', 'Practical & Fast Wins'],
  ['أقوى من المعتاد', 'High-Impact Differentiated Options'],
  ['تجريبية', 'Experimental Directions'],
  ['اختبار سريع', 'Quick Validation Test'],
  ['مقارنة احتياطية', 'Structured Comparison Framework'],
  ['تنظيم عملي', 'Practical Daily Schedule'],
  ['هيكل محتوى', 'Content Structure'],
  ['القيمة', 'Core Value'],
  ['الخاتمة', 'Closing & Call to Action'],
  ['تحليل أولي', 'Initial Structured Analysis'],
  ['أفضل طريقة للبدء', 'Best Way to Start'],
  ['تحقق قبل التنفيذ', 'Pre-Execution Checklist'],
  ['مخصص لـ:', 'Tailored for:'],
  ['استخدام شخصي', 'Personal Use'],
  ['مدرس أو مشرف', 'Teacher or Supervisor'],
  ['مسؤول توظيف', 'Recruiter'],
  ['فريق عمل', 'Work Team'],

  // Reasoning trace titles & details
  ['١. تفكيك الهدف وحدود المطلوب', '1. Decompose Goal & Scope'],
  ['٢. استخراج الركائز والمفاهيم الحاكمة', '2. Extract Core Governing Pillars'],
  ['٣. الربط والدمج ومنع التكرار', '3. Cross-Link, Synthesize & Deduplicate'],
  ['٤. المراجعة النقدية وفحص نقاط اللبس', '4. Critical Verification & Pitfall Check'],
  ['التركيز على العلاقات السببية والروابط البنيوية للموضوع.', 'Focused on causal relationships and structural connections across the topic.'],
  ['مطابقة النقاط المشتركة بين المواد، حذف الحشو المكرر، والاحتفاظ بالفروق الدقيقة لكل مصدر.', 'Aligned shared points across materials, removed redundant filler, and preserved source-specific nuances.'],
  ['ربط الفكرة النظرية بالأمثلة التطبيقية والحالات الحدية لتعميق الفهم.', 'Connected theoretical principles to practical examples and edge cases for deeper mastery.'],
  ['مراجعة الاستنتاجات ضد التعميم الزائد، التحقق من الشروط الحاكمة، وتوضيح الأخطاء الشائعة.', 'Checked conclusions against overgeneralization, verified governing conditions, and highlighted common mistakes.'],

  // Common generated sentences & bullet prefixes
  ['نوع المهمة:', 'Task Type:'],
  ['الموضوعات المستخرجة:', 'Extracted Topics:'],
  ['القيود المكتشفة:', 'Detected Constraints:'],
  ['ثقة المطابقة:', 'Match Confidence:'],
  ['مرتفع نسبيًا', 'Relatively High'],
  ['متوسط إلى جيد', 'Moderate to Strong'],
  ['متوسط', 'Moderate'],
  ['منخفض', 'Conservative'],
  ['قاعدة أساسية:', 'Core Principle:'],
  ['عامل مكمل:', 'Complementary Factor:'],
  ['عامل قد يغيّر النتيجة:', 'Decisive Variable:'],
  ['مخاطرة متوقعة:', 'Expected Risk:'],
  ['فشل بديل يجب استبعاده:', 'Alternative Failure Mode to Rule Out:'],
  ['خطوة عملية أولى:', 'First Actionable Step:'],
  ['بعدها مباشرة:', 'Immediately Next:'],
  ['أهم ما يحكم الإجابة:', 'Primary Governing Factor:'],
  ['أفضل بداية عملية:', 'Best Practical Starting Point:'],
  ['الهدف:', 'Goal:'],
  ['الموضوع:', 'Topic:'],
  ['المطلوب:', 'Objective:'],
  ['طلبك:', 'Your Request:'],
  ['الملاحظات:', 'Notes:'],
  ['القرار:', 'Recommendation:'],
  ['محادثة جديدة', 'New chat'],
  ['ملاحظة: الجزء اللي يعتمد على معلومات حالية أو متغيرة يحتاج تحقق حي قبل الاعتماد عليه.', 'Note: Parts relying on current or fast-changing facts require live web verification before relying on them.'],
  ['أي سعر أو إصدار أو خبر أو قانون أو توفر حالي يحتاج تأكيد بالبحث الحي قبل الاعتماد عليه.', 'Any current price, version, news, regulation, or availability requires live search confirmation before relying on it.'],
  ['حاول شرح الفكرة بصوتك في دقيقتين، ثم ارجع للنقاط التي لم تستطع تذكرها.', 'Try explaining the concept out loud in two minutes, then revisit any points you could not recall from memory.'],
  ['لو تأخرت، قلّل كمية المحتوى لا وقت الاسترجاع والاختبار.', 'If you fall behind schedule, reduce passive reading volume rather than active recall and self-testing time.'],
  ['جاوب من الذاكرة أولًا، ثم راجع المصدر وصحح إجاباتك بلون مختلف.', 'Answer from memory first, then check your source material and correct your answers in a different color.'],
  ['ذاكر «الملخص المدمج» أولًا لتكوين الصورة الكلية المترابطة، ثم راجع «ما تنفرد به كل مادة» لضمان تغطية التفاصيل الدقيقة ومواضع الأسئلة المقالية.', 'Study the Unified Master Summary first to grasp the connected big picture, then review each source’s unique points to cover fine details and essay questions.'],
  ['تغطي المواد المرفقة زوايا متكاملة بتداخل لفظي محدود؛ تم ربطها في تسلسل منطقي موحد بالأسفل.', 'The attached materials cover complementary angles with minimal direct wording overlap; they are linked in a unified logical sequence below.'],
  ['تدعم المفاهيم المشتركة بأمثلة مكملة.', 'Reinforces the shared core concepts with complementary examples.'],
  ['تلخيص ودمج فوري للمواد المرفقة', 'Instant Summary & Synthesis of Attached Materials'],
  ['تلخيص ودمج المواد المرفقة', 'Summary & Synthesis of Attached Materials'],
];

const WORD_LEVEL_AR_TO_EN = [
  ['الشبكات العصبية', 'neural networks'],
  ['التعلم العميق', 'deep learning'],
  ['التعلّم العميق', 'deep learning'],
  ['الذكاء الاصطناعي', 'artificial intelligence'],
  ['قواعد البيانات العلائقية', 'relational databases'],
  ['قواعد البيانات', 'databases'],
  ['هندسة البرمجيات', 'software engineering'],
  ['الأمن السيبراني', 'cybersecurity'],
  ['خوارزمية', 'algorithm'],
  ['خوارزميات', 'algorithms'],
  ['المحاضرة', 'Lecture'],
  ['الفصل', 'Chapter'],
  ['الوحدة', 'Unit'],
  ['المادة', 'Material'],
  ['المواد', 'Materials'],
  ['ملخص', 'Summary'],
  ['مقارنة', 'Comparison'],
  ['مميزات', 'Advantages'],
  ['عيوب', 'Disadvantages'],
  ['أهمية', 'Importance'],
  ['تعريف', 'Definition'],
  ['تطبيقات', 'Applications'],
  ['أمثلة', 'Examples'],
  ['مثال', 'Example'],
  ['سؤال', 'Question'],
  ['إجابة', 'Answer'],
  ['خطوات', 'Steps'],
  ['أولًا', 'First'],
  ['ثانيًا', 'Second'],
  ['ثالثًا', 'Third'],
  ['رابعًا', 'Fourth'],
  ['خامسًا', 'Fifth'],
  ['بالتالي', 'therefore'],
  ['بينما', 'whereas'],
  ['بالإضافة إلى', 'in addition to'],
  ['يعتمد على', 'relies on'],
  ['يتكون من', 'consists of'],
  ['يهدف إلى', 'aims to'],
  ['يساعد على', 'helps to'],
  ['يؤدي إلى', 'leads to'],
  ['بدون تكرار', 'without repetition'],
  ['بشكل واضح', 'clearly'],
  ['بالتفصيل', 'in detail'],
  ['ببساطة', 'simply'],
  ['كلمة', 'words'],
  ['دقائق', 'min'],
  ['دقيقة', 'min'],
];

const SORTED_AR_TO_EN = [...PHRASE_PAIRS].sort((a, b) => b[0].length - a[0].length);
const SORTED_EN_TO_AR = [...PHRASE_PAIRS].sort((a, b) => b[1].length - a[1].length);
const SORTED_WORDS_AR_TO_EN = [...WORD_LEVEL_AR_TO_EN].sort((a, b) => b[0].length - a[0].length);
const SORTED_WORDS_EN_TO_AR = [...WORD_LEVEL_AR_TO_EN].sort((a, b) => b[1].length - a[1].length);

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toWesternDigits(text) {
  return String(text || '').replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

export function detectDominantLanguage(text) {
  const sample = String(text || '').replace(/```[\s\S]*?```/g, '');
  const ar = (sample.match(/[\u0600-\u06FF]/g) || []).length;
  const en = (sample.match(/[A-Za-z]/g) || []).length;
  if (ar === 0 && en === 0) return 'neutral';
  return ar >= en * 0.45 ? 'ar' : 'en';
}

function translateDynamicPatterns(line, targetLang) {
  let out = line;
  if (targetLang === 'en') {
    out = toWesternDigits(out)
      .replace(/ملخص ذكي للمواد\s*\((\d+)\s*(?:مادة|مواد)\s*·\s*(\d+)\s*كلمة\s*·\s*قراءة\s*~(\d+)\s*دقائق\)/g, 'Smart Material Summary ($1 sources · $2 words · ~$3 min read)')
      .replace(/الدمج المنهجي الموحد لـ\s*(\d+)\s*مواد دراسية \/ معرفية/g, 'Unified Synthesis of $1 Study Materials')
      .replace(/تحليل\s+(\d+)\s+(?:مادة مرفقة|مواد مرفقة)\s*\((\d+)\s*كلمة\)\s*وتحديد نمط المعالجة الأنسب\s*\(([^)]+)\)\./g, 'Analyzed $1 attached material(s) ($2 words) and selected optimal processing mode ($3).')
      .replace(/تحديد الهدف الأساسي للطلب\s*\(([^)]+)\)\s*وفصل المعطيات الصريحة عن الافتراضات\./g, 'Identified primary request intent ($1) and separated explicit facts from assumptions.')
      .replace(/المفاهيم المفتاحية المستخرجة:\s*([^.]+)\./g, 'Extracted key concepts: $1.')
      .replace(/اشرح بكلماتك العلاقة بين\s*\*\*([^*]+)\*\*\s*و\*\*([^*]+)\*\*\s*بدون الرجوع للنص\./g, 'Explain in your own words how **$1** relates to **$2** without looking at your notes.')
      .replace(/ما أهم شرط أو قاعدة في هذا الملخص لو تغيرت ستتغير النتيجة؟/g, 'Which key condition or rule in this summary would change the outcome if altered?')
      .replace(/^(\s*•\s*)س:\s*/gm, '$1Q: ')
      .replace(/^(\s*)ج:\s*/gm, '$1A: ')
      .replace(/\bالمادة\s+(\d+)\b/g, 'Material $1')
      .replace(/\bالمحاضرة\s+(\d+)\b/g, 'Lecture $1')
      .replace(/\bالفصل\s+(\d+)\b/g, 'Chapter $1');
  } else {
    out = out
      .replace(/Smart Material Summary\s*\((\d+)\s*sources?\s*·\s*(\d+)\s*words\s*·\s*~(\d+)\s*min read\)/gi, 'ملخص ذكي للمواد ($1 مواد · $2 كلمة · قراءة ~$3 دقائق)')
      .replace(/Unified Synthesis of\s*(\d+)\s*(?:Study\s+)?Materials/gi, 'الدمج المنهجي الموحد لـ $1 مواد دراسية / معرفية')
      .replace(/Analyzed\s+(\d+)\s+attached material\(s\)\s*\((\d+)\s*words\)\s*and selected optimal processing mode\s*\(([^)]+)\)\./gi, 'تحليل $1 مواد مرفقة ($2 كلمة) وتحديد نمط المعالجة الأنسب ($3).')
      .replace(/Identified primary request intent\s*\(([^)]+)\)\s*and separated explicit facts from assumptions\./gi, 'تحديد الهدف الأساسي للطلب ($1) وفصل المعطيات الصريحة عن الافتراضات.')
      .replace(/Identified primary task\s*"([^"]+)"\s*and separated explicit requirements from assumptions\./gi, 'تحديد الهدف الأساسي للطلب ($1) وفصل المعطيات الصريحة عن الافتراضات.')
      .replace(/Extracted key concepts:\s*([^.]+)\./gi, 'المفاهيم المفتاحية المستخرجة: $1.')
      .replace(/Key anchors:\s*([^.]+)\./gi, 'المفاهيم المفتاحية المستخرجة: $1.')
      .replace(/Explain in your own words how\s*\*\*([^*]+)\*\*\s*relates to\s*\*\*([^*]+)\*\*[^.]*\./gi, 'اشرح بكلماتك العلاقة بين **$1** و**$2** بدون الرجوع للنص.')
      .replace(/Explain the relationship between\s*\*\*([^*]+)\*\*\s*and\s*\*\*([^*]+)\*\*\s*in your own words\./gi, 'اشرح بكلماتك العلاقة بين **$1** و**$2** بدون الرجوع للنص.')
      .replace(/Which (?:key condition or rule|point) in this summary would change the outcome if (?:altered|its main condition changed)\?/gi, 'ما أهم شرط أو قاعدة في هذا الملخص لو تغيرت ستتغير النتيجة؟')
      .replace(/^(\s*•\s*)Q:\s*/gm, '$1س: ')
      .replace(/^(\s*)A:\s*/gm, '$1ج: ')
      .replace(/\bMaterial\s+(\d+)\b/gi, 'المادة $1')
      .replace(/\bLecture\s+(\d+)\b/gi, 'المحاضرة $1')
      .replace(/\bChapter\s+(\d+)\b/gi, 'الفصل $1');
  }
  return out;
}

function translatePlainSegmentSync(segment, targetLang) {
  const dominant = detectDominantLanguage(segment);
  if (dominant === 'neutral' || dominant === targetLang) return segment;

  let result = segment;
  if (targetLang === 'en') {
    for (const [ar, en] of SORTED_AR_TO_EN) {
      if (result.includes(ar)) result = result.split(ar).join(en);
    }
    result = translateDynamicPatterns(result, targetLang);
    if (/[\u0600-\u06FF]/.test(result)) {
      for (const [arWord, enWord] of SORTED_WORDS_AR_TO_EN) {
        if (result.includes(arWord)) result = result.split(arWord).join(enWord);
      }
      result = toWesternDigits(result).replace(/،/g, ',').replace(/؛/g, ';').replace(/؟/g, '?');
    }
  } else {
    result = translateDynamicPatterns(result, targetLang);
    for (const [ar, en] of SORTED_EN_TO_AR) {
      if (result.includes(en)) result = result.split(en).join(ar);
    }
    if (/[A-Za-z]{4,}/.test(result) && !/https?:\/\//.test(result)) {
      for (const [arWord, enWord] of SORTED_WORDS_EN_TO_AR) {
        const escaped = enWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), arWord);
      }
    }
  }
  return result;
}

export function translateMarkdownSync(markdown, targetLang = 'ar') {
  const raw = String(markdown || '');
  if (!raw.trim()) return raw;
  const lang = targetLang === 'en' ? 'en' : 'ar';

  // Preserve fenced code blocks untouched
  const parts = raw.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) => (part.startsWith('```') ? part : translatePlainSegmentSync(part, lang)))
    .join('');
}

export function translateThinkingTraceSync(trace, targetLang = 'ar') {
  if (!trace || !Array.isArray(trace.steps)) return trace;
  const lang = targetLang === 'en' ? 'en' : 'ar';
  return {
    ...trace,
    steps: trace.steps.map((step) => ({
      ...step,
      title: translateMarkdownSync(step.title, lang),
      detail: translateMarkdownSync(step.detail, lang),
    })),
  };
}

async function fetchPublicTranslationFallback(text, targetLang, signal) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.length > 9000) return '';
  const sourceLang = targetLang === 'en' ? 'ar' : 'en';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await globalThis.fetch?.(url, { signal });
    if (!response?.ok) return '';
    const data = await response.json();
    if (!Array.isArray(data?.[0])) return '';
    return data[0].map((chunk) => chunk?.[0] || '').join('').trim();
  } catch {
    return '';
  }
}

export async function translateMarkdownAsync(markdown, targetLang = 'ar', { aiTranslate, signal } = {}) {
  const raw = String(markdown || '').trim();
  if (!raw) return raw;
  const lang = targetLang === 'en' ? 'en' : 'ar';
  const dominant = detectDominantLanguage(raw);
  if (dominant === 'neutral' || dominant === lang) return raw;

  if (typeof aiTranslate === 'function') {
    try {
      const translated = await aiTranslate(raw, lang, signal);
      if (translated && translated.trim()) return translated.trim();
    } catch {
      // Fall through to deterministic + public fallback
    }
  }

  // Split by code blocks so code is never sent to external translation or mangled
  const segments = raw.split(/(```[\s\S]*?```)/g);
  const translatedSegments = await Promise.all(segments.map(async (segment) => {
    if (segment.startsWith('```') || !segment.trim()) return segment;
    const syncCandidate = translatePlainSegmentSync(segment, lang);
    // If sync translation already converted the majority of the text cleanly, return it immediately
    if (detectDominantLanguage(syncCandidate) === lang) return syncCandidate;
    const networkCandidate = await fetchPublicTranslationFallback(segment, lang, signal);
    return networkCandidate || syncCandidate;
  }));

  return translatedSegments.join('');
}

export function resolveTurnForLanguage(turn, language = 'ar') {
  if (!turn || typeof turn !== 'object') return turn;
  const lang = language === 'en' ? 'en' : 'ar';
  const cached = turn.i18n?.[lang];
  const prompt = cached?.prompt || translateMarkdownSync(turn.prompt, lang);
  const answer = cached?.answer ? cached.answer : (turn.answer ? translateMarkdownSync(turn.answer, lang) : '');
  const thinkingTrace = cached?.thinkingTrace || (turn.thinkingTrace ? translateThinkingTraceSync(turn.thinkingTrace, lang) : undefined);

  return {
    ...turn,
    prompt,
    answer,
    ...(thinkingTrace ? { thinkingTrace } : {}),
  };
}
