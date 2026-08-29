import { superLocalResponse } from './local-super-reasoner.js';
import { generateBrowserLLMResponse, isBrowserLLMReady } from './local-llm.js';

export const TOOL_LIBRARY = {
  study: [
    { id: 'explain', label: 'اشرح مفهومًا', description: 'شرح مبسّط ومتدرج مع مثال وسؤال مراجعة.', placeholder: 'مثال: اشرح لي مفهوم قواعد البيانات العلائقية كأنني أدرسه لأول مرة…', starters: ['اشرح التعلّم العميق ببساطة', 'وضّح الفرق بين HTTP وHTTPS', 'اشرح قانون نيوتن الثاني بمثال'] },
    { id: 'summarize', label: 'لخّص ملاحظاتي', description: 'حوّل النص الطويل إلى نقاط مركّزة وكلمات أساسية.', placeholder: 'الصق ملاحظات المحاضرة أو النص المراد تلخيصه…', starters: ['لخّص هذا الفصل في نقاط', 'استخرج أهم المصطلحات', 'أنشئ ملخصًا للمراجعة السريعة'] },
    { id: 'plan', label: 'خطة مذاكرة', description: 'قسّم الهدف إلى جلسات عملية قابلة للتنفيذ.', placeholder: 'مثال: عندي امتحان برمجة بعد 7 أيام، ساعتان متاحتان يوميًا…', starters: ['خطة أسبوع لمراجعة Python', 'قسّم مشروع التخرج على 14 يومًا', 'خطة مذاكرة قبل الامتحان'] },
    { id: 'quiz', label: 'اختبر فهمي', description: 'أسئلة قصيرة للمراجعة النشطة مع إرشاد للإجابة.', placeholder: 'اكتب الموضوع أو الصق الملخص الذي تريد أسئلة عليه…', starters: ['اختبار عن أساسيات الشبكات', 'أسئلة على OOP', 'اختبرني في مبادئ الاقتصاد'] },
    { id: 'flashcards', label: 'بطاقات مراجعة', description: 'حوّل أي موضوع إلى بطاقات سؤال وجواب سريعة.', placeholder: 'اكتب الموضوع أو الصق النقاط التي تريد تحويلها إلى بطاقات…', starters: ['بطاقات عن أساسيات الشبكات', 'راجع مصطلحات قواعد البيانات', 'بطاقات سريعة قبل الامتحان'] },
    { id: 'research', label: 'خريطة بحث', description: 'حوّل موضوعًا واسعًا إلى أسئلة ومحاور وخطة بحث.', placeholder: 'اكتب موضوع البحث، المطلوب، والمدة المتاحة…', starters: ['خطة بحث عن الأمن السيبراني', 'محاور مشروع تخرج', 'أسئلة بحث عن الذكاء الاصطناعي'] },
  ],
  work: [
    { id: 'email', label: 'بريد احترافي', description: 'صياغة واضحة ومهذبة مع موضوع وخطوة تالية.', placeholder: 'مثال: اكتب بريدًا لمديري أطلب فيه موعدًا لمراجعة المشروع…', starters: ['بريد متابعة بعد مقابلة', 'طلب موعد مع المدير', 'تحديث حالة مشروع للعميل'] },
    { id: 'tasks', label: 'حوّلها إلى مهام', description: 'حوّل الهدف المبعثر إلى خطوات وأولويات ومخرجات.', placeholder: 'صف المشروع أو الهدف والموعد النهائي المتاح…', starters: ['خطة إطلاق موقع خلال أسبوع', 'رتّب مهام اليوم حسب الأولوية', 'قسّم مهمة تحليل البيانات'] },
    { id: 'meeting', label: 'ملخص اجتماع', description: 'قرارات، مسؤوليات، مخاطر، وخطوات تالية.', placeholder: 'الصق ملاحظات الاجتماع حتى لو كانت غير مرتبة…', starters: ['رتّب ملاحظات الاجتماع', 'استخرج القرارات والمسؤوليات', 'أنشئ follow-up واضحًا'] },
    { id: 'cv', label: 'إنجاز للسيرة', description: 'حوّل العمل المنفذ إلى bullet قوي بلا ادعاءات.', placeholder: 'مثال: عملت على اختبار ردود نموذج AI واكتشفت أخطاء متكررة…', starters: ['حوّل خبرتي إلى CV bullet', 'صغ إنجازًا تقنيًا', 'حسّن وصف المشروع للـHR'] },
    { id: 'cover', label: 'خطاب تقديم', description: 'مسودة مخصصة تربط خبرتك بمتطلبات الوظيفة.', placeholder: 'الصق وصف الوظيفة واكتب أهم خبرة حقيقية عندك مرتبطة بها…', starters: ['خطاب لوظيفة AI Evaluator', 'تقديم على IT Support', 'رسالة تقديم لمطور Junior'] },
    { id: 'qa', label: 'تقرير جودة', description: 'حوّل المشكلة إلى تقرير QA واضح وقابل للتنفيذ.', placeholder: 'صف الخطأ، خطوات ظهوره، المتوقع، والنتيجة الفعلية…', starters: ['اكتب Bug Report احترافي', 'حوّل ملاحظاتي إلى QA report', 'رتّب نتائج اختبار موقع'] },
  ],
  general: [
    { id: 'ask', label: 'اسأل أي حاجة', description: 'يفهم نوع الطلب ويعطيك أفضل مسار متاح.', placeholder: 'اكتب أي سؤال، مشكلة، فكرة، أو شيء تريد تنفيذه…', starters: ['ساعدني أحل مشكلة', 'كيف أبدأ في فكرة جديدة؟', 'رتّب لي الموضوع ده'] },
    { id: 'rewrite', label: 'حسّن أي نص', description: 'ينظّم النص ويجعله أوضح وأسهل في القراءة.', placeholder: 'الصق الرسالة أو الفقرة أو المحتوى الذي تريد تحسينه…', starters: ['حسّن الرسالة دي', 'خلّي الكلام احترافي', 'رتّب الفقرة واختصرها'] },
    { id: 'brainstorm', label: 'ولّد أفكارًا', description: 'أفكار متنوعة مع ترتيب واختبار عملي.', placeholder: 'اكتب الموضوع، الجمهور، والهدف من الأفكار…', starters: ['أفكار مشروع صغير', 'أفكار محتوى تقني', 'أفكار لتحسين منتج'] },
    { id: 'decide', label: 'ساعدني أقرر', description: 'قارن الخيارات بمعايير واضحة وقدّم توصية.', placeholder: 'اكتب الخيارات المتاحة وما الذي يهمك في القرار…', starters: ['قارن بين خيارين', 'ساعدني أختار جهاز', 'هل أبدأ الآن أم أنتظر؟'] },
    { id: 'organize', label: 'نظّم يومي', description: 'حوّل الالتزامات إلى جدول واقعي ومرن.', placeholder: 'اكتب المهام، المواعيد، والوقت المتاح اليوم…', starters: ['رتّب مهام يومي', 'اعمل جدولًا مرنًا', 'وزّع وقتي بين الدراسة والعمل'] },
    { id: 'content', label: 'اصنع محتوى', description: 'هيكل منشور أو فيديو أو مقال حسب الهدف والجمهور.', placeholder: 'اكتب نوع المحتوى، موضوعه، الجمهور، والمنصة…', starters: ['بوست LinkedIn تقني', 'سكريبت فيديو قصير', 'هيكل مقال بسيط'] },
  ],
};

const MODE_LABELS = { study: 'مساحة الدراسة', work: 'مساحة العمل', general: 'المساعد العام' };
const AUDIENCE_LABELS = { self: 'استخدام شخصي', teacher: 'مدرس أو مشرف', recruiter: 'مسؤول توظيف', team: 'فريق عمل' };
export const hasLiveAI = Boolean(import.meta.env?.VITE_AI_API_URL?.trim());

function cleanInput(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentences(value) {
  return String(value || '')
    .split(/(?<=[.!؟\n])\s+/)
    .map(cleanInput)
    .filter((item) => item.length > 12);
}

export function extractKeywords(value, limit = 6) {
  const stopWords = new Set(['هذا','هذه','ذلك','التي','الذي','على','إلى','من','في','عن','مع','أو','هو','هي','تم','كان','have','with','from','that','this','and','the','for']);
  const counts = new Map();
  String(value || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.forEach((word) => {
    if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function audiencePrefix(preferences = {}) {
  const audience = AUDIENCE_LABELS[preferences.audience];
  return audience && preferences.audience !== 'self' ? `مخصص لـ: ${audience}\n\n` : '';
}

function localComparison(prompt) {
  return `مقارنة احتياطية\nطلبك: ${prompt}\n\nتعذر الوصول للمحرك الحي الآن، لذلك لن أخترع تفاصيل حديثة أو أسعارًا أو ترتيبات غير متحققة.\n\n1. حدّد الخيارات الحقيقية المرتبطة بطلبك.\n2. قارن سهولة البداية، الجودة، التطبيق العملي، التكلفة، المجتمع، والملاءمة للهدف.\n3. لكل خيار اكتب نقاط قوة وضعف.\n4. استبعد ما يفشل في شرط أساسي.\n5. اختر حسب حالة الاستخدام لا حسب ترتيب مطلق.\n\nمهم\nبمجرد عودة البحث الحي، أعد الطلب للحصول على أسماء ومصادر حديثة.`;
}

function localBrainstorm(prompt) {
  const topic = cleanInput(prompt);
  return `أفكار موسعة حول: ${topic}\n\nعملية وسريعة\n1. نسخة مصغرة تحل المشكلة الأساسية فقط.\n2. خدمة موجهة لشريحة ضيقة.\n3. قالب أو أداة قابلة لإعادة الاستخدام.\n4. أتمتة جزء متكرر.\n\nأقوى من المعتاد\n5. دمج فكرتين في تجربة أبسط.\n6. تخصيص حسب نوع المستخدم.\n7. قياس تقدم واضح.\n8. نسخة مجانية محدودة تقود لقيمة مدفوعة.\n\nتجريبية\n9. مساعد يقترح الخطوة التالية.\n10. نظام توصية يشرح سبب الاختيار.\n11. لوحة قياس للأخطاء والفرص.\n12. تجربة تفاعلية تتغير حسب مدخلات المستخدم.\n\nاختبار سريع\nاختر فكرتين فقط واسأل: هل تحل مشكلة حقيقية؟ هل أقدر أبني نسخة صغيرة منها هذا الأسبوع؟`;
}

function localStudy(tool, prompt) {
  const keywords = extractKeywords(prompt);
  if (tool === 'summarize') {
    const points = sentences(prompt).slice(0, 8);
    return `ملخص مركز\n${points.length ? points.map((item, index) => `${index + 1}. ${item}`).join('\n') : `• ${prompt}`}\n\nكلمات أساسية\n${keywords.join(' • ') || 'استخرج المصطلحات الأساسية من النص.'}\n\nمراجعة نشطة\nحاول شرح الفكرة بصوتك في دقيقتين، ثم ارجع للنقاط التي لم تستطع تذكرها.`;
  }
  if (tool === 'plan') return `خطة مذاكرة قابلة للتنفيذ\nالهدف: ${prompt}\n\n1. قياس نقطة البداية — 20 دقيقة\n2. تقسيم المنهج إلى وحدات صغيرة مرتبة بالأهمية.\n3. جلسات تركيز 45–60 دقيقة يتبعها استرجاع من الذاكرة.\n4. نهاية كل جلسة: 5 أسئلة بدون الرجوع للمصدر.\n5. مراجعة تراكمية بعد كل 3 جلسات.\n6. آخر 20% من الوقت: نماذج وأسئلة على مناطق الضعف.\n\nقاعدة التنفيذ\nلو تأخرت، قلّل كمية المحتوى لا وقت الاسترجاع والاختبار.`;
  if (tool === 'quiz') return `اختبار فهم\nالموضوع: ${prompt}\n\n1. عرّف الفكرة الأساسية بكلماتك.\n2. اذكر مثالًا صحيحًا ومثالًا مضادًا.\n3. ما الخطأ الشائع في هذا الموضوع؟\n4. طبّق الفكرة على موقف جديد.\n5. لخّصها في جملة واحدة لشخص مبتدئ.\n\nطريقة الاستخدام\nجاوب من الذاكرة أولًا، ثم راجع المصدر وصحح إجاباتك بلون مختلف.`;
  if (tool === 'flashcards') return `بطاقات مراجعة\nالموضوع: ${prompt}\n\n• س: ما الفكرة الأساسية؟\n  ج: اكتب تعريفًا قصيرًا جدًا من المصدر.\n• س: لماذا تهم هذه الفكرة؟\n  ج: اربطها باستخدام حقيقي.\n• س: ما مثالها؟\n  ج: استخدم أبسط مثال صحيح.\n• س: ما الفرق بينها وبين أقرب مفهوم مشابه؟\n  ج: ركّز على معيار واحد حاسم.\n• س: ما الخطأ الشائع؟\n  ج: دوّن الخطأ وطريقة اكتشافه.`;
  if (tool === 'research') return `خريطة بحث\nالموضوع: ${prompt}\n\nأسئلة البحث\n1. ما تعريف وحدود الموضوع؟\n2. ما أهم النظريات أو التقنيات المرتبطة به؟\n3. ما الأدلة المؤيدة والمعارضة؟\n4. ما التطبيقات الحالية؟\n5. أين توجد فجوات أو أسئلة مفتوحة؟\n\nترتيب المصادر\nمصادر أولية أو رسمية ← أوراق ومراجع أكاديمية ← مصادر شرح موثوقة ← أمثلة تطبيقية.\n\nالمخرج النهائي\nملخص تنفيذي + محاور + أدلة لكل محور + قائمة أسئلة تحتاج تحقق.`;
  return `شرح مبسّط\nالموضوع: ${prompt}\n\nابدأ بالفكرة الكبيرة: حاول تحديد «ما المشكلة التي يحلها هذا المفهوم؟». بعد ذلك افهم المكوّنات الأساسية واحدة واحدة واربط كل جزء بمثال صغير.\n\nمصطلحات تستحق التركيز\n${keywords.join(' • ') || 'التعريف • المكونات • المثال • التطبيق'}\n\nمثال عملي\nحوّل المفهوم إلى موقف تعرفه، وحدد المدخلات، ما الذي يحدث بينها، والنتيجة.\n\nسؤال مراجعة\nلو تغير عنصر أساسي في المثال، كيف ستتغير النتيجة ولماذا؟`;
}

function localWork(tool, prompt, preferences) {
  const name = cleanInput(preferences?.displayName);
  if (tool === 'email') return `Subject: Follow-up / Next Step\n\nHello,\n\n${prompt}\n\nPlease let me know the best next step or if you need anything else from me.\n\nBest regards,\n${name || '[Your name]'}`;
  if (tool === 'tasks') return `خطة تنفيذ\nالهدف: ${prompt}\n\nالآن\n1. حدّد المخرج النهائي ومعيار القبول.\n2. اجمع المدخلات والاعتماديات الناقصة.\n3. نفّذ أصغر جزء يزيل أكبر قدر من عدم اليقين.\n\nبعدها\n4. قسّم التنفيذ إلى وحدات يمكن اختبارها.\n5. راجع الجودة قبل الدمج أو التسليم.\n6. وثّق ما تم وما تبقى والمالك والموعد.\n\nتعريف الانتهاء\nمخرج قابل للتسليم + مراجعة مكتملة + لا توجد نقاط حرجة بلا مالك.`;
  if (tool === 'meeting') return `ملخص اجتماع منظم\nالملاحظات: ${prompt}\n\nالقرارات\n• حوّل كل قرار واضح إلى جملة واحدة.\n\nAction items\n• [المهمة] — Owner: [الاسم] — Due: [الموعد]\n\nأسئلة مفتوحة\n• ما الذي لم يُحسم؟\n\nمخاطر / Dependencies\n• ما الذي قد يؤخر التنفيذ أو يحتاج موافقة خارجية؟`;
  if (tool === 'cv') return `CV bullet مقترح\n• Executed ${prompt.replace(/[.!؟]+$/u, '')}, documenting findings and applying structured quality checks to support accurate, consistent delivery.\n\nقبل الاستخدام\nاستبدل أي صياغة عامة برقم أو أداة أو نتيجة حقيقية لو كانت عندك، ولا تضف ادعاء لم يحدث.`;
  if (tool === 'cover') return `Dear Hiring Team,\n\nI am interested in this opportunity because it aligns with my hands-on experience and the type of work I want to continue developing. My relevant background includes ${prompt}\n\nI focus on careful execution, clear documentation, and learning project-specific guidelines quickly. I would welcome the opportunity to discuss how this experience can support your team.\n\nBest regards,\n${name || '[Your name]'}`;
  return `QA / Bug Report\n\nSummary\n${prompt}\n\nEnvironment\n• Device / OS: [add]\n• Browser / app version: [add]\n\nSteps to reproduce\n1. [step]\n2. [step]\n3. [step]\n\nExpected result\n[what should happen]\n\nActual result\n[what happened]\n\nImpact / Severity\n[who is affected and how badly]\n\nEvidence\n[screenshot, recording, logs, timestamp]`;
}

function localGeneral(tool, prompt) {
  if (tool === 'rewrite') {
    const compact = cleanInput(prompt);
    return `نسخة أوضح\n${compact}\n\nمراجعة سريعة\n• الفكرة الأساسية واضحة ومباشرة.\n• احذف أي تكرار لا يضيف معلومة.\n• ضع الطلب أو الخطوة التالية في آخر سطر إن كان النص رسالة عملية.`;
  }
  if (tool === 'brainstorm') return localBrainstorm(prompt);
  if (tool === 'decide') return localComparison(prompt);
  if (tool === 'organize') return `تنظيم عملي\nالمطلوب: ${prompt}\n\n1. ثبّت المواعيد التي لا يمكن تحريكها.\n2. اختر أهم 1–3 نتائج لليوم.\n3. ضع أصعب مهمة في فترة طاقة عالية.\n4. اجمع الأعمال الصغيرة في كتلة واحدة.\n5. اترك 20% من الوقت فراغًا للتأخير والطوارئ.\n6. في النهاية انقل غير الضروري بدل تمديد اليوم بلا نهاية.`;
  if (tool === 'content') return `هيكل محتوى\nالموضوع: ${prompt}\n\nHook\nابدأ بالمشكلة أو النتيجة التي تهم الجمهور فورًا.\n\nالقيمة\n• الفكرة الأساسية.\n• مثال أو دليل.\n• خطوة قابلة للتطبيق.\n\nالخاتمة\nلخّص الرسالة في سطر واحد ثم ضع CTA مناسبًا للمنصة.`;
  return `تحليل أولي\nطلبك: ${prompt}\n\nأفضل طريقة للبدء\n1. حدّد النتيجة التي تريد الوصول لها بدقة.\n2. افصل الحقائق المؤكدة عن الافتراضات.\n3. اكتشف أكبر معلومة ناقصة قد تغيّر القرار.\n4. نفّذ أصغر خطوة آمنة تعطيك معلومة جديدة.\n5. راجع النتيجة وعدّل المسار بدل الالتزام بخطة ثابتة.\n\nلو كان الطلب يعتمد على أسعار أو أخبار أو معلومات تتغير بمرور الوقت، استخدم البحث الحي قبل اتخاذ قرار نهائي.`;
}

function applyResponseStyle(answer, preferences = {}) {
  if (preferences.responseStyle === 'concise') return answer.split('\n').slice(0, 14).join('\n');
  if (preferences.responseStyle === 'detailed') return `${answer}\n\nتحقق قبل التنفيذ\n• ما الافتراضات الموجودة؟\n• ما المعلومة التي لو تغيرت ستغيّر القرار؟\n• ما معيار النجاح الواضح؟`;
  return answer;
}

export function generateDemoResponse({ mode, tool, prompt, preferences = {} }) {
  const value = cleanInput(prompt);
  if (value.length < 4) throw new Error('اكتب تفاصيل أكثر حتى أساعدك بشكل مفيد.');
  let answer;
  if (mode === 'study') answer = localStudy(tool, value);
  else if (mode === 'work') answer = localWork(tool, value, preferences);
  else answer = localGeneral(tool, value);
  return applyResponseStyle(`${audiencePrefix(preferences)}${answer}`, preferences);
}

function fallbackResponse(args, reason) {
  const knowledgeAnswer = superLocalResponse(args);
  const specialized = generateDemoResponse(args);
  const reasonText = reason === 'timeout' ? 'انتهت مهلة الخدمة الحية قبل وصول النتيجة.' : 'تعذر الوصول إلى البحث والذكاء الحي في هذه المحاولة.';
  return {
    answer: `⚠️ Local Intelligence Beta\n${reasonText}\nتم تشغيل الموسوعة المحلية + الاسترجاع متعدد المراحل + محرك التفكير بدل إيقاف الرد. المعلومات الحديثة تحتاج بحثًا حيًا للتأكيد.\n\n${knowledgeAnswer}\n\nتطبيق مباشر للأداة\n${specialized}`,
    source: 'local-fallback',
    degraded: true,
  };
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException('The operation was aborted.', 'AbortError');
}

async function llmAwareFallback(args, reason, allowColdStart, signal) {
  throwIfAborted(signal);
  if (args.preferences?.localLlmEnabled && (allowColdStart || isBrowserLLMReady())) {
    try {
      const localLlm = await generateBrowserLLMResponse({
        ...args,
        timeoutMs: allowColdStart ? 70_000 : 25_000,
      });
      throwIfAborted(signal);
      if (localLlm?.answer) {
        return {
          answer: `🧠 Local LLM · Beta\nتشغيل نموذج لغوي محلي على جهازك مع موسوعة PathPilot كسياق. المعلومات الحديثة ما زالت تحتاج بحثًا حيًا للتأكيد.\n\n${localLlm.answer}`,
          source: 'local-llm',
          degraded: true,
          localModel: localLlm.model,
        };
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn('PathPilot on-device LLM unavailable; falling back to deterministic local reasoner.', error);
    }
  }
  throwIfAborted(signal);
  return fallbackResponse(args, reason);
}

export async function generateAssistantResponse({ mode, tool, prompt, preferences = {}, signal }) {
  const args = { mode, tool, prompt, preferences };
  throwIfAborted(signal);
  if (!hasLiveAI) return llmAwareFallback(args, 'offline', true, signal);

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(signal?.reason || new DOMException('The operation was aborted.', 'AbortError'));
  if (signal) signal.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Live AI request timed out.', 'TimeoutError'));
  }, 85_000);

  try {
    const response = await fetch(import.meta.env.VITE_AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, tool, prompt: cleanInput(prompt), preferences }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.code || payload.error || `AI service returned ${response.status}`);
    if (typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error('Invalid AI response');
    return {
      answer: payload.answer.trim(),
      source: payload.sourceMode || 'live',
      degraded: Boolean(payload.researchFailed),
      sources: Array.isArray(payload.sources) ? payload.sources : [],
      sourceCount: Number(payload.sourceCount || 0),
      targetReached: Boolean(payload.targetReached),
      route: payload.route || null,
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn('PathPilot live response failed; trying local AI tiers.', error);
    return llmAwareFallback(args, timedOut || error?.name === 'TimeoutError' ? 'timeout' : 'offline', false, signal);
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', abortFromCaller);
  }
}

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || '';
}
