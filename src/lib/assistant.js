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
    {
      id: 'research',
      label: 'خريطة بحث',
      description: 'حوّل موضوعًا واسعًا إلى أسئلة ومحاور وخطة بحث.',
      placeholder: 'اكتب موضوع البحث، المطلوب، والمدة المتاحة…',
      starters: ['خطة بحث عن الأمن السيبراني', 'محاور مشروع تخرج', 'أسئلة بحث عن الذكاء الاصطناعي'],
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
    {
      id: 'qa',
      label: 'تقرير جودة',
      description: 'حوّل المشكلة إلى تقرير QA واضح وقابل للتنفيذ.',
      placeholder: 'صف الخطأ، خطوات ظهوره، المتوقع، والنتيجة الفعلية…',
      starters: ['اكتب Bug Report احترافي', 'حوّل ملاحظاتي إلى QA report', 'رتّب نتائج اختبار موقع'],
    },
  ],
  general: [
    {
      id: 'ask',
      label: 'اسأل أي حاجة',
      description: 'يفهم نوع الطلب ويعطيك أفضل مسار محلي متاح.',
      placeholder: 'اكتب أي سؤال، مشكلة، فكرة، أو شيء تريد تنفيذه…',
      starters: ['ساعدني أحل مشكلة', 'كيف أبدأ في فكرة جديدة؟', 'رتّب لي الموضوع ده'],
    },
    {
      id: 'rewrite',
      label: 'حسّن أي نص',
      description: 'ينظّم النص ويجعله أوضح وأسهل في القراءة.',
      placeholder: 'الصق الرسالة أو الفقرة أو المحتوى الذي تريد تحسينه…',
      starters: ['حسّن الرسالة دي', 'خلّي الكلام احترافي', 'رتّب الفقرة واختصرها'],
    },
    {
      id: 'brainstorm',
      label: 'ولّد أفكارًا',
      description: 'أفكار متنوعة مع طريقة سريعة لاختيار الأنسب.',
      placeholder: 'اكتب الموضوع، الجمهور، والهدف من الأفكار…',
      starters: ['أفكار مشروع صغير', 'أفكار محتوى تقني', 'أفكار لتحسين منتج'],
    },
    {
      id: 'decide',
      label: 'ساعدني أقرر',
      description: 'قارن الخيارات بمعايير واضحة بدل الاختيار العشوائي.',
      placeholder: 'اكتب الخيارات المتاحة وما الذي يهمك في القرار…',
      starters: ['قارن بين خيارين', 'ساعدني أختار جهاز', 'هل أبدأ الآن أم أنتظر؟'],
    },
    {
      id: 'organize',
      label: 'نظّم يومي',
      description: 'حوّل الالتزامات إلى جدول واقعي ومرن.',
      placeholder: 'اكتب المهام، المواعيد، والوقت المتاح اليوم…',
      starters: ['رتّب مهام يومي', 'اعمل جدولًا مرنًا', 'وزّع وقتي بين الدراسة والعمل'],
    },
    {
      id: 'content',
      label: 'اصنع محتوى',
      description: 'هيكل منشور أو فيديو أو مقال حسب الهدف والجمهور.',
      placeholder: 'اكتب نوع المحتوى، موضوعه، الجمهور، والمنصة…',
      starters: ['بوست LinkedIn تقني', 'سكريبت فيديو قصير', 'هيكل مقال بسيط'],
    },
  ],
};

const MODE_LABELS = { study: 'مساحة الدراسة', work: 'مساحة العمل', general: 'المساعد العام' };
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

function studyResearch(prompt) {
  const topics = extractKeywords(prompt, 6);
  const subject = topics[0] || cleanInput(prompt);
  return `خريطة بحث: ${subject}\n\nسؤال البحث الرئيسي\nكيف يمكن فهم ${subject} وتحليل أثره أو تطبيقه بصورة قابلة للتحقق؟\n\nالمحاور\n1. التعريف والسياق: ما المفاهيم الأساسية؟\n2. المشكلة: لماذا يستحق الموضوع الدراسة؟\n3. الأدلة: ما المصادر والبيانات المطلوبة؟\n4. المقارنة: ما البدائل أو وجهات النظر المختلفة؟\n5. التطبيق: كيف يظهر الموضوع في حالة حقيقية؟\n\nخطة التنفيذ\n□ ابدأ بمصدرين تمهيديين موثوقين.\n□ دوّن الادعاء ومصدره وتاريخ الوصول.\n□ افصل بين الحقيقة والرأي والاستنتاج.\n□ اختم بالنتائج والقيود والأسئلة المفتوحة.\n\nكلمات بحث مقترحة\n${topics.map((topic) => `• ${topic}`).join('\n') || `• ${subject}`}`;
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

function workQa(prompt) {
  const details = cleanInput(prompt);
  return `تقرير جودة / Bug Report\n\nالعنوان\nمشكلة تحتاج تحقق: ${details.slice(0, 90)}\n\nالبيئة\n• الجهاز/النظام: [أضف القيمة]\n• المتصفح أو الإصدار: [أضف القيمة]\n• حالة الاتصال: [Online / Offline]\n\nخطوات إعادة المشكلة\n1. افتح الشاشة أو الميزة المتأثرة.\n2. نفّذ نفس الخطوات التي أدت للمشكلة.\n3. سجّل المدخلات والوقت وأي رسالة خطأ.\n\nالنتيجة الفعلية\n${details}\n\nالنتيجة المتوقعة\nاكتب السلوك الصحيح القابل للفحص في جملة واحدة.\n\nالتأثير والأولوية\n• التأثير: [من يتأثر؟ وما الذي يتعطل؟]\n• التكرار: [دائم / متقطع / مرة واحدة]\n• الأولوية المقترحة: حدّدها بعد قياس التأثير والتكرار.\n\nالأدلة\n□ لقطة شاشة أو تسجيل\n□ وقت حدوث المشكلة\n□ خطوات دقيقة وبيانات اختبار غير حساسة`;
}

function detectGeneralIntent(prompt) {
  if (/(مشكلة|خطأ|مش شغال|لا يعمل|error|bug|fix)/i.test(prompt)) return 'problem';
  if (/(قارن|اختار|أختار|أفضل|ولا|compare|choose)/i.test(prompt)) return 'decision';
  if (/(اكتب|صياغ|رسالة|بوست|مقال|سكريبت|write)/i.test(prompt)) return 'writing';
  if (/(ازاي|كيف|طريقة|ابدأ|أنفذ|خطة|how)/i.test(prompt)) return 'howto';
  return 'general';
}

function generalAsk(prompt) {
  const intent = detectGeneralIntent(prompt);
  const keywords = extractKeywords(prompt, 5);
  const focus = keywords.join('، ') || cleanInput(prompt);
  const responses = {
    problem: `فهم المشكلة\n${prompt}\n\nتشخيص منظم\n1. حدّد ما كان يجب أن يحدث وما حدث فعليًا.\n2. اعزل آخر تغيير سبق المشكلة.\n3. جرّب أصغر حالة تعيدها.\n4. سجّل رسالة الخطأ والبيئة والتوقيت.\n5. اختبر حلًا واحدًا في كل مرة.\n\nالخطوة التالية\nابدأ بإرسال النتيجة المتوقعة والفعلية وأي رسالة خطأ؛ من دون هذه البيانات سيكون أي حل مجرد تخمين.`,
    decision: `قرار يحتاج مقارنة\nالموضوع: ${prompt}\n\nالمعايير المقترحة\n• النتيجة التي تريدها فعلًا\n• التكلفة والوقت\n• المخاطر وقابلية الرجوع\n• سهولة التنفيذ الآن\n• القيمة على المدى الطويل\n\nطريقة الحسم\nامنح كل خيار درجة من 1 إلى 5 لكل معيار، واضربها في أهمية المعيار. لا تجعل معيارًا جذابًا لكنه غير مهم يحسم القرار.`,
    writing: `مسودة العمل\nالهدف: ${focus}\n\nالهيكل الأفضل\n1. افتح بالرسالة الأساسية مباشرة.\n2. أضف السياق الضروري فقط.\n3. رتّب التفاصيل من الأهم إلى الأقل أهمية.\n4. اختم بخطوة تالية واضحة.\n\nنسخة أولية\nبخصوص ${cleanInput(prompt)}، الهدف هو توضيح المطلوب بصورة مباشرة وسهلة التنفيذ. فيما يلي أهم النقاط التي يجب مراعاتها، ثم الخطوة التالية المقترحة لإكمال الموضوع بوضوح.`,
    howto: `خطة بداية عملية\nالهدف: ${prompt}\n\n1. عرّف النتيجة النهائية في جملة قابلة للقياس.\n2. حدّد ما لديك وما ينقصك قبل البدء.\n3. نفّذ أصغر خطوة تعطيك معلومة أو نتيجة.\n4. راجع النتيجة وعدّل المسار.\n5. وثّق ما نجح وما لم ينجح.\n\nابدأ الآن\nاختر خطوة تستغرق أقل من 20 دقيقة وتقلل أكبر قدر من الغموض.`,
    general: `فهمت طلبك\n${prompt}\n\nأهم عناصره\n${keywords.length ? keywords.map((item) => `• ${item}`).join('\n') : '• الهدف\n• السياق\n• النتيجة المطلوبة'}\n\nأفضل طريقة للتعامل معه\nحدّد الهدف النهائي، القيود، وما الذي جربته بالفعل. بعد ذلك قسّم الموضوع إلى قرار واحد أو خطوة واحدة قابلة للتنفيذ بدل التعامل معه ككتلة كبيرة.`,
  };
  return responses[intent];
}

function generalRewrite(prompt) {
  const items = sentences(prompt);
  const cleaned = items.length ? items : [cleanInput(prompt)];
  return `نسخة أوضح ومنظمة\n\n${cleaned.map((item) => item.replace(/\s*([،,.!?؟])\s*/g, '$1 ')).join('\n\n')}\n\nمراجعة قبل الاستخدام\n• احذف التكرار الذي لا يضيف معنى.\n• ضع الطلب أو الرسالة الأساسية في البداية.\n• أضف اسم الجهة والموعد والخطوة التالية عند الحاجة.`;
}

function generalBrainstorm(prompt) {
  const topic = cleanInput(prompt);
  return `أفكار حول: ${topic}\n\nأفكار سريعة\n1. نسخة بسيطة تحل المشكلة الأساسية فقط.\n2. تجربة مخصصة لفئة صغيرة ومحددة.\n3. تحويل الفكرة إلى أداة أو قالب يعاد استخدامه.\n4. دمج الفكرة مع عادة أو منصة يستخدمها الجمهور بالفعل.\n5. تقديمها كتحدٍ قصير أو سلسلة خطوات.\n6. بناء مثال قبل/بعد يوضح القيمة.\n7. اختبار نسخة مجانية محدودة وجمع الملاحظات.\n8. التعاون مع شخص يكمل المهارة الناقصة.\n\nفلتر الاختيار\nاختر الفكرة الأعلى في: قيمة واضحة + تنفيذ سريع + تكلفة منخفضة + إمكانية اختبارها خلال أسبوع.`;
}

function generalDecide(prompt) {
  return `لوحة قرار\nالموضوع: ${cleanInput(prompt)}\n\nاكتب الخيارات ثم قيّم كل واحد من 1 إلى 5\n• مناسب للهدف النهائي — الوزن 5\n• التكلفة المقبولة — الوزن 4\n• الوقت المطلوب — الوزن 3\n• المخاطر — الوزن 4\n• سهولة التراجع — الوزن 2\n• القيمة المستقبلية — الوزن 4\n\nقاعدة القرار\nاستبعد أي خيار يفشل في شرط أساسي حتى لو حصل على مجموع مرتفع. لو تقارب خياران، اختر التجربة الأصغر والأكثر قابلية للرجوع بدل الالتزام الكبير.`;
}

function generalOrganize(prompt) {
  return `خطة يوم مرنة\nالمدخلات: ${cleanInput(prompt)}\n\nالمرحلة 1 — أهم نتيجة\n□ اختر مهمة واحدة لو أنجزتها يصبح اليوم ناجحًا.\n\nالمرحلة 2 — جلستا تركيز\n□ 60–90 دقيقة للمهمة الأساسية.\n□ 45–60 دقيقة للمهمة الثانية.\n\nالمرحلة 3 — الأعمال القصيرة\n□ اجمع الرسائل والمكالمات والمهام تحت 15 دقيقة في دفعة واحدة.\n\nالمرحلة 4 — مساحة احتياطية\n□ اترك 20٪ من الوقت للتأخير والمفاجآت.\n\nنهاية اليوم\nراجع ما تم، انقل مهمة واحدة فقط لليوم التالي، واكتب أول خطوة لبدء الغد.`;
}

function generalContent(prompt) {
  const topic = cleanInput(prompt);
  return `هيكل محتوى\nالموضوع: ${topic}\n\nالافتتاحية\nابدأ بمشكلة واضحة أو نتيجة تهم الجمهور، من دون مقدمة طويلة.\n\nالجسم\n1. ما المشكلة؟\n2. لماذا تحدث؟\n3. ما الحل أو الفكرة الرئيسية؟\n4. مثال عملي أو خطوة قابلة للتطبيق.\n5. خطأ شائع يجب تجنبه.\n\nالخاتمة\nلخّص القيمة في جملة، ثم اطلب خطوة واحدة مناسبة للمنصة: تعليق، تجربة، حفظ، أو مشاركة.\n\nقائمة الجودة\n□ عنوان محدد\n□ فكرة واحدة أساسية\n□ مثال حقيقي\n□ جمل قصيرة\n□ دعوة واضحة للفعل`;
}

const DEMO_GENERATORS = {
  study: { explain: studyExplain, summarize: studySummary, plan: studyPlan, quiz: studyQuiz, flashcards: studyFlashcards, research: studyResearch },
  work: { email: workEmail, tasks: workTasks, meeting: workMeeting, cv: workCv, cover: workCover, qa: workQa },
  general: { ask: generalAsk, rewrite: generalRewrite, brainstorm: generalBrainstorm, decide: generalDecide, organize: generalOrganize, content: generalContent },
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
