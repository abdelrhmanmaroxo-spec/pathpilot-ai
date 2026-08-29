export const TOOL_LIBRARY = {
  study: [
    {
      id: 'explain',
      label: 'اشرح مفهومًا',
      description: 'شرح مبسّط ومتدرج مع مثال وسؤال مراجعة.',
      placeholder: 'مثال: اشرح لي مفهوم قواعد البيانات العلائقية كأنني أدرسه لأول مرة…',
      starters: ['اشرح التعلّم العميق ببساطة', 'وضّح الفرق بين HTTP وHTTPS', 'اشرح قانون نيوتن الثاني بمثال'],
    },
    {
      id: 'summarize',
      label: 'لخّص ملاحظاتي',
      description: 'حوّل النص الطويل إلى نقاط مركّزة وكلمات أساسية.',
      placeholder: 'الصق ملاحظات المحاضرة أو النص المراد تلخيصه…',
      starters: ['لخّص هذا الفصل في نقاط', 'استخرج أهم المصطلحات', 'أنشئ ملخصًا للمراجعة السريعة'],
    },
    {
      id: 'plan',
      label: 'خطة مذاكرة',
      description: 'قسّم الهدف إلى جلسات عملية قابلة للتنفيذ.',
      placeholder: 'مثال: عندي امتحان برمجة بعد 7 أيام، ساعتان متاحتان يوميًا…',
      starters: ['خطة أسبوع لمراجعة Python', 'قسّم مشروع التخرج على 14 يومًا', 'خطة مذاكرة قبل الامتحان'],
    },
    {
      id: 'quiz',
      label: 'اختبر فهمي',
      description: 'أسئلة قصيرة للمراجعة النشطة مع إرشاد للإجابة.',
      placeholder: 'اكتب الموضوع أو الصق الملخص الذي تريد أسئلة عليه…',
      starters: ['اختبار عن أساسيات الشبكات', 'أسئلة على OOP', 'اختبرني في مبادئ الاقتصاد'],
    },
    {
      id: 'flashcards',
      label: 'بطاقات مراجعة',
      description: 'حوّل أي موضوع إلى بطاقات سؤال وجواب سريعة.',
      placeholder: 'اكتب الموضوع أو الصق النقاط التي تريد تحويلها إلى بطاقات…',
      starters: ['بطاقات عن أساسيات الشبكات', 'راجع مصطلحات قواعد البيانات', 'بطاقات سريعة قبل الامتحان'],
    },
  ],
  work: [
    {
      id: 'email',
      label: 'بريد احترافي',
      description: 'صياغة واضحة ومهذبة مع موضوع وخطوة تالية.',
      placeholder: 'مثال: اكتب بريدًا لمديري أطلب فيه موعدًا لمراجعة المشروع…',
      starters: ['بريد متابعة بعد مقابلة', 'طلب موعد مع المدير', 'تحديث حالة مشروع للعميل'],
    },
    {
      id: 'tasks',
      label: 'حوّلها إلى مهام',
      description: 'حوّل الهدف المبعثر إلى خطوات وأولويات ومخرجات.',
      placeholder: 'صف المشروع أو الهدف والموعد النهائي المتاح…',
      starters: ['خطة إطلاق موقع خلال أسبوع', 'رتّب مهام اليوم حسب الأولوية', 'قسّم مهمة تحليل البيانات'],
    },
    {
      id: 'meeting',
      label: 'ملخص اجتماع',
      description: 'قرارات، مسؤوليات، مخاطر، وخطوات تالية.',
      placeholder: 'الصق ملاحظات الاجتماع حتى لو كانت غير مرتبة…',
      starters: ['رتّب ملاحظات الاجتماع', 'استخرج القرارات والمسؤوليات', 'أنشئ follow-up واضحًا'],
    },
    {
      id: 'cv',
      label: 'إنجاز للسيرة',
      description: 'حوّل العمل المنفذ إلى bullet قوي بلا ادعاءات.',
      placeholder: 'مثال: عملت على اختبار ردود نموذج AI واكتشفت أخطاء متكررة…',
      starters: ['حوّل خبرتي إلى CV bullet', 'صغ إنجازًا تقنيًا', 'حسّن وصف المشروع للـHR'],
    },
    {
      id: 'cover',
      label: 'خطاب تقديم',
      description: 'مسودة مخصصة تربط خبرتك بمتطلبات الوظيفة.',
      placeholder: 'الصق وصف الوظيفة واكتب أهم خبرة حقيقية عندك مرتبطة بها…',
      starters: ['خطاب لوظيفة AI Evaluator', 'تقديم على IT Support', 'رسالة تقديم لمطور Junior'],
    },
  ],
};

const MODE_LABELS = { study: 'مساحة الدراسة', work: 'مساحة العمل' };
const AUDIENCE_LABELS = {
  self: 'استخدام شخصي',
  teacher: 'مدرس أو مشرف',
  recruiter: 'مسؤول توظيف',
  team: 'فريق عمل',
};

export const hasLiveAI = Boolean(import.meta.env?.VITE_AI_API_URL?.trim());

function cleanInput(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentences(value) {
  return String(value || '')
    .split(/(?<=[.!؟\n])\s+/)
    .map(cleanInput)
    .filter((sentence) => sentence.length > 12);
}

export function extractKeywords(value, limit = 6) {
  const stopWords = new Set(['هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'على', 'إلى', 'من', 'في', 'عن', 'مع', 'أو', 'هو', 'هي', 'تم', 'كان', 'have', 'with', 'from', 'that', 'this', 'and', 'the', 'for']);
  const counts = new Map();
  String(value || '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]{3,}/gu)?.forEach((word) => {
      if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function studyExplain(prompt) {
  return `شرح مبسّط\n${prompt} هو موضوع يمكن فهمه على ثلاث طبقات: الفكرة الأساسية، طريقة عملها، ثم استخدامها عمليًا. ابدأ بالسؤال: ما المشكلة التي يحلّها هذا المفهوم؟ وبعدها اربط كل جزء بمثال تعرفه.\n\nمثال تطبيقي\nتخيّل أنك تشرح الموضوع لزميل في دقيقة واحدة: عرّف الفكرة بجملة، اعرض مثالًا، ثم اذكر متى نستخدمها. لو لم تستطع، ارجع للمصطلح الذي توقفت عنده وافهمه وحده.\n\nخطوات تثبيت الفهم\n1. اكتب التعريف بطريقتك.\n2. ارسم العلاقة بين المكوّنات.\n3. طبّق مثالًا صغيرًا.\n4. اشرح الفكرة بصوت مرتفع.\n\nاختبر نفسك\nما الفرق بين تعريف «${prompt}» ومثال حقيقي عليه؟`;
}

function studySummary(prompt) {
  const source = sentences(prompt);
  const selected = (source.length ? source : [cleanInput(prompt)]).slice(0, 5);
  const keywords = extractKeywords(prompt);
  return `الملخص المركّز\n${selected.map((item) => `• ${item}`).join('\n')}\n\nالكلمات الأساسية\n${keywords.length ? keywords.map((item) => `#${item}`).join('  ') : 'أضف نصًا أطول لاستخراج الكلمات الأساسية.'}\n\nمراجعة في 60 ثانية\nاقرأ النقاط مرة، أغلق النص، ثم اكتب أهم ثلاث أفكار من الذاكرة.`;
}

function studyPlan(prompt) {
  const keywords = extractKeywords(prompt, 4);
  const focus = keywords.length ? keywords.join('، ') : cleanInput(prompt);
  return `خطة مذاكرة قابلة للتنفيذ\nالهدف: ${focus}\n\nاليوم 1 — تشخيص وتجهيز\n• حدّد المطلوب ومصادر المذاكرة.\n• اختبر مستواك في 10 دقائق.\n\nاليومان 2–3 — فهم نشط\n• جلستان تركيز × 35 دقيقة.\n• لخّص كل جلسة في 5 نقاط.\n\nاليومان 4–5 — تطبيق\n• حل أمثلة من دون الرجوع للحل.\n• سجّل الأخطاء المتكررة وسببها.\n\nاليوم 6 — محاكاة\n• اختبار بوقت محدد.\n• راجع نقاط الضعف فقط.\n\nاليوم 7 — تثبيت\n• مراجعة البطاقات والملخصات.\n• راحة ونوم جيد قبل التقييم.\n\nمقياس النجاح\nتستطيع شرح الفكرة وحل مثال جديد من دون مساعدة.`;
}

function studyQuiz(prompt) {
  const topics = extractKeywords(prompt, 5);
  const subject = topics[0] || cleanInput(prompt) || 'الموضوع';
  return `اختبار مراجعة: ${subject}\n\n1. عرّف ${subject} بكلماتك في سطرين.\n2. ما المشكلة التي يحلّها؟\n3. اذكر مثالًا صحيحًا ومثالًا مضادًا.\n4. ما أكثر نقطة يمكن أن تسبب التباسًا؟\n5. كيف تربط ${subject} بـ${topics[1] || 'موضوع سبق أن درسته'}؟\n\nتحدّي تطبيقي\nصمّم مسألة صغيرة تستخدم فيها الفكرة، ثم اشرح خطوات الحل من دون حفظ.\n\nالتقييم\nامنح نفسك نقطتين لكل إجابة: الفكرة صحيحة + المثال واضح. أقل من 7/10 يعني أن الموضوع يحتاج جولة فهم إضافية.`;
}

function studyFlashcards(prompt) {
  const topics = extractKeywords(prompt, 5);
  const subjects = topics.length ? topics : [cleanInput(prompt)];
  return `بطاقات المراجعة\n${subjects.map((topic, index) => `\n${index + 1}. السؤال: ما المقصود بـ${topic}؟\n   الإجابة: اكتب تعريفًا واضحًا، ثم اربطه بمثال واحد من موضوعك.`).join('\n')}\n\nطريقة الاستخدام\nغطِّ الإجابات، أجب بصوت مرتفع، ثم صنّف كل بطاقة: أعرفها / تحتاج مراجعة. أعد البطاقات الصعبة بعد 10 دقائق.`;
}

function signature(preferences = {}) {
  const name = cleanInput(preferences.displayName);
  return name ? `\n${name}` : '';
}

function workEmail(prompt, preferences) {
  return `الموضوع: متابعة واضحة بخصوص ${cleanInput(prompt).slice(0, 70)}\n\nمرحبًا،\n\nأتمنى أن تكون بخير. أكتب إليك بخصوص ${cleanInput(prompt)}. أود التأكد من الخطوة التالية والموعد الأنسب لاستكمال الموضوع، حتى أتمكن من ترتيب التنفيذ بصورة واضحة.\n\nأنا جاهز لتقديم أي تفاصيل إضافية مطلوبة. هل يناسبك أن نتفق على الخطوة التالية والموعد المستهدف؟\n\nمع خالص التحية،${signature(preferences)}`;
}

function workTasks(prompt) {
  const focus = cleanInput(prompt);
  return `خطة تنفيذ: ${focus}\n\nأولوية 1 — تعريف النتيجة\n□ اكتب المخرج النهائي ومعيار قبوله.\n□ حدّد الموعد وصاحب القرار.\n\nأولوية 2 — تقليل المخاطر\n□ اجمع المدخلات والاعتماديات الناقصة.\n□ نفّذ أصغر نسخة قابلة للمراجعة.\n\nأولوية 3 — التنفيذ\n□ قسّم العمل إلى وحدات لا تتجاوز كل منها 60–90 دقيقة.\n□ اختبر كل وحدة قبل الانتقال للتالية.\n\nأولوية 4 — التسليم\n□ راجع الجودة والأخطاء والحالات الطرفية.\n□ وثّق ما تم والخطوة التالية.\n\nتعريف الإنجاز\nمخرج قابل للفحص + ملاحظات واضحة + لا توجد مهمة مبهمة من دون مسؤول أو موعد.`;
}

function workMeeting(prompt) {
  const items = sentences(prompt).slice(0, 6);
  return `ملخص الاجتماع\n${items.length ? items.map((item) => `• ${item}`).join('\n') : `• ${cleanInput(prompt)}`}\n\nالقرارات\n• تأكيد الأولوية والنتيجة المطلوبة قبل بدء التنفيذ.\n• مشاركة نسخة أولية للمراجعة المبكرة.\n\nالإجراءات التالية\n□ تحويل كل قرار إلى مهمة لها مسؤول وموعد.\n□ توثيق الأسئلة المفتوحة في رسالة المتابعة.\n□ مراجعة التقدم في نقطة زمنية متفق عليها.\n\nمخاطر تحتاج متابعة\n• أي اعتماد غير مؤكد أو موعد بلا مالك واضح.`;
}

function workCv(prompt) {
  const action = cleanInput(prompt).replace(/^(انا|أنا|كنت|قمت|عملت)\s+/i, '');
  return `صياغة مقترحة للسيرة الذاتية\n• ${action.charAt(0).toUpperCase()}${action.slice(1)}، مع توثيق خطوات التنفيذ ومراجعة الجودة لضمان مخرجات دقيقة وقابلة للتسليم.\n\nنسخة مناسبة لـLinkedIn\nنفذت ${action} مع تركيز على الدقة، حل المشكلات، وتحويل المتطلبات إلى نتائج عملية واضحة.\n\nمهم\nأضف رقمًا فقط لو تستطيع إثباته: عدد الحالات، زمن التسليم، نسبة التحسن، أو حجم البيانات. لا تضف مقاييس تقديرية.`;
}

function workCover(prompt, preferences) {
  const name = cleanInput(preferences?.displayName);
  return `مسودة خطاب تقديم\n\nالسادة فريق التوظيف المحترمون،\n\nأتقدم باهتمام لهذه الفرصة لأن متطلباتها ترتبط مباشرة بخبرتي العملية في ${cleanInput(prompt)}. أركز في عملي على فهم المطلوب بدقة، تنفيذ المهام بصورة منظمة، مراجعة الجودة، وتوثيق النتائج بشكل واضح.\n\nما أقدمه للدور\n• قدرة على تحويل التعليمات إلى خطوات تنفيذ قابلة للفحص.\n• اهتمام بالتفاصيل واكتشاف الأخطاء قبل التسليم.\n• تواصل واضح واستعداد للتعلم والعمل مع فرق متنوعة.\n\nيسعدني مناقشة كيفية توظيف خبرتي في احتياجات الفريق، وتقديم أمثلة حقيقية على أعمال مرتبطة بالدور.\n\nمع خالص التحية،${name ? `\n${name}` : ''}\n\nقبل الإرسال\nاستبدل الوصف العام بمهارتين من إعلان الوظيفة، وأضف مثالًا حقيقيًا واحدًا من خبرتك من دون ادعاء أرقام غير موثقة.`;
}

const DEMO_GENERATORS = {
  study: { explain: studyExplain, summarize: studySummary, plan: studyPlan, quiz: studyQuiz, flashcards: studyFlashcards },
  work: { email: workEmail, tasks: workTasks, meeting: workMeeting, cv: workCv, cover: workCover },
};

function applyResponseStyle(answer, preferences = {}) {
  const style = preferences.responseStyle || 'balanced';
  if (style === 'detailed') {
    return `${answer}\n\nخطوة تالية مقترحة\nراجع الناتج مقابل سياقك الحقيقي، عدّل الأسماء والمواعيد، ثم استخدمه كمسودة قابلة للتحسين.`;
  }
  if (style === 'concise') {
    const lines = answer.split('\n').filter((line) => line.trim());
    return lines.slice(0, 9).join('\n');
  }
  return answer;
}

export function generateDemoResponse({ mode, tool, prompt, preferences = {} }) {
  const cleanPrompt = cleanInput(prompt);
  if (cleanPrompt.length < 4) throw new Error('اكتب تفاصيل أكثر حتى أساعدك بشكل مفيد.');
  const generator = DEMO_GENERATORS[mode]?.[tool];
  if (!generator) throw new Error('الأداة المطلوبة غير متاحة.');
  const answer = generator(cleanPrompt, preferences);
  const audience = AUDIENCE_LABELS[preferences.audience];
  const contextualAnswer = audience && preferences.audience !== 'self'
    ? `مخصص لـ: ${audience}\n\n${answer}`
    : answer;
  return applyResponseStyle(contextualAnswer, preferences);
}

export async function generateAssistantResponse({ mode, tool, prompt, preferences = {} }) {
  if (!hasLiveAI) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { answer: generateDemoResponse({ mode, tool, prompt, preferences }), source: 'demo' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(import.meta.env.VITE_AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, tool, prompt: cleanInput(prompt), preferences }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    const payload = await response.json();
    if (typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error('Invalid AI response');
    return { answer: payload.answer.trim(), source: 'live' };
  } catch (error) {
    console.warn('Live AI unavailable; using local demo.', error);
    return { answer: generateDemoResponse({ mode, tool, prompt, preferences }), source: 'demo-fallback' };
  } finally {
    clearTimeout(timeout);
  }
}

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || '';
}
