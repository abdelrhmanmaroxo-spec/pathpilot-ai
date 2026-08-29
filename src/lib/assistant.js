import { advancedLocalResponse } from './local-reasoner.js';

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

function cleanInput(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function sentences(value) { return String(value || '').split(/(?<=[.!؟\n])\s+/).map(cleanInput).filter((item) => item.length > 12); }

export function extractKeywords(value, limit = 6) {
  const stopWords = new Set(['هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'على', 'إلى', 'من', 'في', 'عن', 'مع', 'أو', 'هو', 'هي', 'تم', 'كان', 'have', 'with', 'from', 'that', 'this', 'and', 'the', 'for']);
  const counts = new Map();
  String(value || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.forEach((word) => {
    if (!stopWords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function audiencePrefix(preferences = {}) {
  const audience = AUDIENCE_LABELS[preferences.audience];
  return audience && preferences.audience !== 'self' ? `مخصص لـ: ${audience}\n\n` : '';
}

function localComparison(prompt) {
  return `مقارنة احتياطية\nطلبك: ${prompt}\n\nتعذر الوصول للمحرك الحي الآن، لذلك لن أخترع تفاصيل حديثة أو أسعارًا أو ترتيبات غير متحققة. لكن بدل ما أسيبك من غير رد، استخدم المقارنة العملية دي فورًا:\n\n1. حدّد 4 إلى 6 خيارات مرتبطة مباشرة بطلبك.\n2. قارن بينها في: سهولة البداية، جودة المحتوى، التطبيق العملي، التكلفة، دعم المجتمع، الشهادات، والملاءمة لهدفك.\n3. لكل خيار اكتب ميزتين وعيبين على الأقل.\n4. استبعد أي خيار يفشل في شرط أساسي عندك.\n5. رشّح خيارًا للمبتدئ، خيارًا للتطبيق العملي، وخيارًا لمن يريد مسارًا عميقًا.\n\nمهم\nهذه طبقة احتياطية فقط. بمجرد عودة البحث الحي، PathPilot يعيد نفس الطلب بمقارنة فعلية وأسماء ومصادر حديثة.`;
}

function localBrainstorm(prompt) {
  const topic = cleanInput(prompt);
  return `أفكار موسعة حول: ${topic}\n\nعملية وسريعة\n1. نسخة مصغرة تحل المشكلة الأساسية فقط.\n2. خدمة موجهة لشريحة ضيقة جدًا بدل جمهور عام.\n3. قالب أو أداة قابلة لإعادة الاستخدام.\n4. أتمتة جزء متكرر يستهلك وقتًا.\n\nأقوى من المعتاد\n5. دمج فكرتين موجودتين في تجربة واحدة أبسط.\n6. إضافة طبقة تخصيص حسب نوع المستخدم.\n7. تحويل المنتج إلى تجربة خطوة بخطوة مع قياس تقدم.\n8. بناء نسخة مجانية محدودة تقود لميزة مدفوعة واضحة.\n\nتجريبية\n9. مساعد ذكي يقترح الخطوة التالية بدل انتظار أمر المستخدم.\n10. نظام مقارنة أو توصية يشرح سبب الاختيار.\n11. لوحة قياس تعرض التقدم والأخطاء والفرص.\n12. تجربة جماعية تسمح بالمشاركة والتقييم والتعاون.\n\nاختيار سريع\nابدأ بأعلى فكرة في قيمة للمستخدم + سهولة الاختبار + تكلفة منخفضة + إمكانية قياس النتيجة خلال أسبوع.`;
}

function localStudy(tool, prompt) {
  if (tool === 'summarize') {
    const items = sentences(prompt).slice(0, 7);
    return `ملخص احتياطي\n${(items.length ? items : [cleanInput(prompt)]).map((item) => `• ${item}`).join('\n')}`;
  }
  if (tool === 'quiz') return `اختبار سريع حول: ${prompt}\n\n1. عرّف الفكرة بكلماتك.\n2. أعط مثالًا صحيحًا.\n3. أعط مثالًا مضادًا.\n4. اشرح خطأ شائعًا.\n5. طبّق الفكرة على حالة جديدة.\n\nالإجابة الجيدة تشرح لماذا، وليس فقط ماذا.`;
  if (tool === 'flashcards') return `بطاقات مراجعة حول: ${prompt}\n\n1. ما التعريف الأساسي؟\n2. ما أهم استخدام؟\n3. ما الفرق عن أقرب مفهوم مشابه؟\n4. ما الخطأ الشائع؟\n5. ما مثال عملي؟`;
  if (tool === 'plan') return `خطة دراسة احتياطية\nالهدف: ${prompt}\n\nاليوم 1: تشخيص المستوى وتجميع المصادر.\nاليومان 2 و3: فهم المفاهيم الأساسية مع أمثلة.\nاليومان 4 و5: تطبيق وأسئلة بدون الرجوع للحل.\nاليوم 6: اختبار محاكاة وتحليل الأخطاء.\nاليوم 7: مراجعة مركزة ونقاط الضعف فقط.`;
  if (tool === 'research') return `خريطة بحث احتياطية\nالموضوع: ${prompt}\n\n• التعريف والسياق\n• السؤال الرئيسي والأسئلة الفرعية\n• المصادر الأولية المطلوبة\n• الأدلة المؤيدة والمعارضة\n• المقارنات والبدائل\n• القيود وما يحتاج تحققًا حديثًا\n• الاستنتاجات والأسئلة المفتوحة`;
  return `شرح احتياطي\nالموضوع: ${prompt}\n\nابدأ بتعريف الفكرة، ثم المشكلة التي تحلها، ثم كيف تعمل، ثم مثال عملي، ثم خطأ شائع، وأخيرًا حالة جديدة تختبر بها فهمك. تعذر الوصول للمحرك الحي، لذلك لن أضيف حقائق حديثة غير متحققة.`;
}

function localWork(tool, prompt, preferences) {
  const name = cleanInput(preferences.displayName);
  if (tool === 'email') return `الموضوع: متابعة بخصوص ${cleanInput(prompt).slice(0, 70)}\n\nمرحبًا،\n\nأكتب إليك بخصوص ${cleanInput(prompt)}. أود تأكيد الخطوة التالية وأي موعد أو متطلبات لازمة حتى أتمكن من استكمال الموضوع بصورة واضحة.\n\nشكرًا لوقتك، ويسعدني إرسال أي تفاصيل إضافية.\n\nمع خالص التحية${name ? `،\n${name}` : ''}`;
  if (tool === 'cv') return `صياغة CV احتياطية\n• ${cleanInput(prompt)}، مع التركيز على التنفيذ، الدقة، حل المشكلات، ومراجعة الجودة دون إضافة أرقام أو نتائج غير موثقة.`;
  if (tool === 'cover') return `مسودة خطاب تقديم\n\nالسادة فريق التوظيف المحترمون،\n\nأتقدم لهذه الفرصة لأن متطلباتها ترتبط بخبرتي في ${cleanInput(prompt)}. أركز على تنفيذ المتطلبات بدقة، مراجعة الجودة، حل المشكلات، والتواصل الواضح.\n\nيسعدني مناقشة أمثلة حقيقية من خبرتي وكيف يمكن توظيفها لدعم الفريق.\n\nمع خالص التحية${name ? `،\n${name}` : ''}`;
  if (tool === 'qa') return `تقرير QA احتياطي\n\nالمشكلة: ${prompt}\n\n• المتوقع: [اكتب السلوك الصحيح]\n• الفعلي: ${prompt}\n• خطوات إعادة الإنتاج: ابدأ من الحالة النظيفة وسجل كل خطوة.\n• البيئة: الجهاز، النظام، المتصفح، الإصدار.\n• التأثير: من يتأثر وما الذي يتعطل.\n• الأدلة: لقطة شاشة، وقت الحدوث، والرسائل الظاهرة.\n• إعادة الاختبار: كرر نفس الخطوات بعد الإصلاح.`;
  if (tool === 'meeting') return `ملخص اجتماع احتياطي\n${sentences(prompt).slice(0, 6).map((item) => `• ${item}`).join('\n') || `• ${prompt}`}\n\nاستخرج بعد ذلك: القرارات، المسؤول، الموعد، المخاطر، والأسئلة المفتوحة.`;
  return `خطة تنفيذ احتياطية\nالهدف: ${prompt}\n\n1. عرّف المخرج النهائي ومعيار قبوله.\n2. اجمع الاعتماديات والمدخلات.\n3. نفّذ أصغر نسخة قابلة للمراجعة.\n4. اختبر الحالات الأساسية والطرفية.\n5. وثّق النتيجة والخطوة التالية.`;
}

function detectIntent(prompt) {
  if (/(قارن|مقارنة|أفضل|اختار|أختار|ولا|compare|best|choose)/i.test(prompt)) return 'comparison';
  if (/(فكرة|أفكار|brainstorm|اقتراح)/i.test(prompt)) return 'brainstorm';
  if (/(مشكلة|خطأ|مش شغال|لا يعمل|error|bug|fix)/i.test(prompt)) return 'problem';
  if (/(اكتب|صياغ|رسالة|بوست|مقال|سكريبت|write)/i.test(prompt)) return 'writing';
  if (/(ازاي|كيف|طريقة|ابدأ|أنفذ|خطة|how)/i.test(prompt)) return 'howto';
  return 'general';
}

function localGeneral(tool, prompt) {
  if (tool === 'brainstorm') return localBrainstorm(prompt);
  if (tool === 'decide' || detectIntent(prompt) === 'comparison') return localComparison(prompt);
  if (tool === 'rewrite') return `نسخة أوضح\n\n${sentences(prompt).join('\n\n') || cleanInput(prompt)}\n\nراجع الأسماء والأرقام والمواعيد قبل الاستخدام.`;
  if (tool === 'organize') return `تنظيم عملي\nالمدخلات: ${prompt}\n\n1. أهم نتيجة اليوم.\n2. جلستان تركيز للمهمات الثقيلة.\n3. دفعة واحدة للأعمال القصيرة.\n4. 20٪ وقت احتياطي.\n5. مراجعة سريعة ونقل مهمة واحدة فقط لليوم التالي.`;
  if (tool === 'content') return `هيكل محتوى\nالموضوع: ${prompt}\n\n• Hook واضح\n• المشكلة\n• الفكرة الرئيسية\n• 3 نقاط قيمة\n• مثال عملي\n• خطأ شائع\n• CTA واحد واضح`;
  const intent = detectIntent(prompt);
  if (intent === 'problem') return `تشخيص احتياطي\nالمشكلة: ${prompt}\n\n1. ما المتوقع وما الفعلي؟\n2. ما آخر تغيير سبق المشكلة؟\n3. هل يمكن إعادة المشكلة بأصغر حالة؟\n4. ما رسالة الخطأ والبيئة؟\n5. اختبر تغييرًا واحدًا في كل مرة.`;
  if (intent === 'howto') return `خطة بداية\nالهدف: ${prompt}\n\n1. عرّف النتيجة النهائية.\n2. حدّد ما لديك وما ينقصك.\n3. نفّذ أصغر خطوة تقلل الغموض.\n4. اختبر النتيجة.\n5. حسّن بناءً على ما تعلمته.`;
  if (intent === 'writing') return `مسودة احتياطية\nالهدف: ${prompt}\n\nابدأ بالرسالة الأساسية مباشرة، أضف السياق الضروري فقط، رتّب التفاصيل حسب أهميتها، ثم اختم بخطوة تالية واضحة.`;
  return `رد احتياطي مفيد\nطلبك: ${prompt}\n\nالمحرك الحي غير متاح في هذه اللحظة. بدل ما أسيبك من غير رد، أفضل مسار هو: تحديد الهدف، القيود، البدائل، المخاطر، ثم اختيار أصغر خطوة عملية قابلة للاختبار. المعلومات الحديثة أو المتغيرة تحتاج إعادة المحاولة عند عودة الاتصال.`;
}

function applyResponseStyle(answer, preferences = {}) {
  if (preferences.responseStyle === 'concise') return answer.split('\n').filter((line) => line.trim()).slice(0, 12).join('\n');
  if (preferences.responseStyle === 'detailed') return `${answer}\n\nمراجعة نهائية\nتحقق من الأسماء والأرقام والمواعيد وأي معلومة متغيرة قبل اتخاذ قرار نهائي.`;
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
  const knowledgeAnswer = advancedLocalResponse(args);
  const specialized = generateDemoResponse(args);
  const reasonText = reason === 'timeout' ? 'انتهت مهلة الخدمة الحية قبل وصول النتيجة.' : 'تعذر الوصول إلى البحث والذكاء الحي في هذه المحاولة.';
  return {
    answer: `⚠️ Local Intelligence Beta\n${reasonText}\nتم تشغيل قاعدة المعرفة المحلية ومحرك الاستدلال والاسترجاع بدل إيقاف الرد. المعلومات الحديثة تحتاج بحثًا حيًا للتأكيد.\n\n${knowledgeAnswer}\n\nتطبيق مباشر للأداة\n${specialized}`,
    source: 'local-fallback',
    degraded: true,
  };
}

export async function generateAssistantResponse({ mode, tool, prompt, preferences = {} }) {
  const args = { mode, tool, prompt, preferences };
  if (!hasLiveAI) return fallbackResponse(args, 'offline');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 85000);
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
    };
  } catch (error) {
    console.warn('PathPilot live response failed; using advanced local intelligence fallback.', error);
    return fallbackResponse(args, error?.name === 'AbortError' ? 'timeout' : 'offline');
  } finally {
    clearTimeout(timeout);
  }
}

export function getModeLabel(mode) { return MODE_LABELS[mode] || ''; }
