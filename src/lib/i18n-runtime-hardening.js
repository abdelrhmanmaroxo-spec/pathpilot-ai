const AR_TO_EN = {
  'يفهم نوع الطلب ويعطيك أفضل مسار متاح.': 'Understands the request and chooses the best available path.',
  'ينظّم النص ويجعله أوضح وأسهل في القراءة.': 'Organizes text and makes it clearer and easier to read.',
  'أفكار متنوعة مع ترتيب واختبار عملي.': 'Generates varied ideas, then ranks and pressure-tests them.',
  'قارن الخيارات بمعايير واضحة وقدّم توصية.': 'Compares options using clear criteria and gives a recommendation.',
  'حوّل الالتزامات إلى جدول واقعي ومرن.': 'Turns commitments into a realistic, flexible schedule.',
  'هيكل منشور أو فيديو أو مقال حسب الهدف والجمهور.': 'Structures a post, video, or article around the goal and audience.',
  'شرح مبسّط ومتدرج مع مثال وسؤال مراجعة.': 'A clear step-by-step explanation with an example and review question.',
  'حوّل النص الطويل إلى نقاط مركّزة وكلمات أساسية.': 'Turns long text into focused points and key terms.',
  'قسّم الهدف إلى جلسات عملية قابلة للتنفيذ.': 'Breaks a goal into practical, actionable study sessions.',
  'أسئلة قصيرة للمراجعة النشطة مع إرشاد للإجابة.': 'Short active-recall questions with guidance for answering.',
  'حوّل أي موضوع إلى بطاقات سؤال وجواب سريعة.': 'Turns any topic into quick question-and-answer flashcards.',
  'حوّل موضوعًا واسعًا إلى أسئلة ومحاور وخطة بحث.': 'Turns a broad topic into research questions, themes, and a plan.',
  'صياغة واضحة ومهذبة مع موضوع وخطوة تالية.': 'Clear, professional wording with a subject and next step.',
  'حوّل الهدف المبعثر إلى خطوات وأولويات ومخرجات.': 'Turns a scattered goal into steps, priorities, and deliverables.',
  'قرارات، مسؤوليات، مخاطر، وخطوات تالية.': 'Extracts decisions, owners, risks, and next steps.',
  'حوّل العمل المنفذ إلى bullet قوي بلا ادعاءات.': 'Turns real work into a strong CV bullet without exaggeration.',
  'مسودة مخصصة تربط خبرتك بمتطلبات الوظيفة.': 'Creates a tailored draft connecting your experience to the role.',
  'حوّل المشكلة إلى تقرير QA واضح وقابل للتنفيذ.': 'Turns an issue into a clear, actionable QA report.',
  'مساعد عربي عام للدراسة والعمل والحياة اليومية، بطبقات AI حي ومحلي وموسوعة معرفية.': 'A general AI assistant for study, work, and daily life, powered by live and local intelligence plus a knowledge encyclopedia.',
  'للأمان ومنع إساءة الاستخدام: قد يُسجّل عنوان IP وبيانات الجهاز الأساسية لمدة محدودة. لا يتم جمع GPS أو كلمات السر.': 'For security and abuse prevention, IP addresses and basic device data may be retained temporarily. GPS and passwords are never collected.',
  '🧪 PathPilot Beta: يستخدم بحث ويب وذكاء AI حي عندما تكون الخدمات متاحة، مع وضع احتياطي عند التعطل.': '🧪 PathPilot Beta: uses web research and live AI when available, with resilient local fallback when services are unavailable.',
  'جاهز نبدأ؟': 'Ready to start?',
  'اشرح التعلّم العميق ببساطة': 'Explain deep learning simply',
  'شرح مبسّط': 'Simple explanation',
  'الأدوات': 'Tools',
  'اكتب طلبك بالتفصيل': 'Describe your request',
  'آخر النتائج': 'Recent results',
  'لسه مفيش نتائج محفوظة على الجهاز.': 'No results are saved on this device yet.',
  'خصّص النتيجة': 'Customize result',
  'تُحفظ الإعدادات على جهازك فقط': 'Settings are saved on this device only',
  'اسمك': 'Your name',
  'اختياري': 'optional',
  'النتيجة موجهة إلى': 'Target audience',
  'مستوى التفاصيل': 'Detail level',
  'استخدام شخصي': 'Personal use',
  'مدرس أو مشرف': 'Teacher or supervisor',
  'مسؤول توظيف': 'Recruiter',
  'فريق عمل': 'Work team',
  'مختصر': 'Concise',
  'متوازن': 'Balanced',
  'مفصل': 'Detailed',
  'جديد': 'New',
  'جاري التجهيز': 'Generating…',
  'أنشئ النتيجة': 'Generate result',
  'النتيجة ستظهر هنا': 'Your result will appear here',
  'اكتب تفاصيل حقيقية؛ كلما كان السياق أوضح كانت النتيجة أكثر فائدة.': 'Add real details. The clearer the context, the more useful the result.',
  'قيّم النتيجة': 'Rate result',
  'مسح': 'Clear',
  'مساعد عام': 'General Assistant',
  'المساعد العام': 'General Assistant',
  'وضع محلي': 'Local mode',
  'Local LLM مفعّل': 'Local LLM enabled',
  'سيحاول PathPilot تشغيل نموذج لغوي محلي على جهازك، ثم يعود إلى الموسوعة ومحرك الاستدلال إذا تعذر.': 'PathPilot will try to run a local language model on your device, then fall back to the encyclopedia and reasoning engine if needed.',
  'يستخدم PathPilot الموسوعة المحلية ومحرك الاستدلال. يمكنك تفعيل Local LLM من إعدادات النتيجة على الأجهزة الداعمة.': 'PathPilot uses its local encyclopedia and reasoning engine. You can enable the Local LLM on supported devices.',
  'ابحث في PathPilot، الأدوات، الصفحات…': 'Search PathPilot, tools, pages…',
  'البحث في PathPilot بالكامل': 'Search all PathPilot',
  'البحث الشامل في PathPilot': 'Search PathPilot',
  'دوّر على صفحة، أداة، إعداد، نتيجة سابقة…': 'Search pages, tools, settings, history…',
  'ملقتش نتيجة مطابقة. جرّب كلمة تانية.': 'Nothing matched. Try another word.',
  'موجود في الصفحة الحالية': 'On this page',
  'فتح / إغلاق': 'Open / close',
  'فتح أول نتيجة': 'Open first result',
  'إغلاق': 'Close',
  'Google Sign-In لسه محتاج GOOGLE_CLIENT_ID في إعدادات السيرفر.': 'Google Sign-In still needs GOOGLE_CLIENT_ID in the server configuration.',
  'حساب': 'Account',
  'محفوظ بالفعل، لكن مزود البريد لم يسلّم رسالة التفعيل في المحاولة الحالية.': 'is already saved, but the email provider did not deliver the verification message on this attempt.',
  '. افتح الرسالة واضغط Verify email، وبعدها ارجع وسجل دخولك.': '. Open the message, select Verify email, then return here and sign in.',
  'أو': 'or',
  'تم حذف المحادثة المحددة فقط.': 'The selected conversation was deleted.',
  'إدارة المحادثات': 'Manage conversations',
  'ابحث، ثبّت المهم، ونظّم المحادثات في مجلدات وTags بدون لمس باقي السجل.': 'Search, favorite important items, and organize conversations into folders and tags without changing the rest of your history.',
  'ابحث في السؤال، الإجابة، المجلد أو Tag…': 'Search the question, answer, folder, or tag…',
  'مفيش نتائج مطابقة للبحث.': 'No conversations match your search.',
  'مفيش محادثات محفوظة حاليًا.': 'No saved conversations yet.',
  'مجلد المحادثة': 'Conversation folder',
  'بدون مجلد': 'No folder',
  'وسوم المحادثة': 'Conversation tags',
  'إزالة من المفضلة': 'Remove from favorites',
  'إضافة للمفضلة': 'Add to favorites',
  'حذف هذه المحادثة فقط': 'Delete this conversation only',
  'أنشئ نتيجة الأول عشان تشارك المحادثة.': 'Generate a result first before sharing the conversation.',
  'تم نسخ هذه المحادثة فقط للمشاركة.': 'This conversation was copied for sharing.',
  'مشاركة هذه المحادثة فقط': 'Share this conversation only',
  'إدارة وتنظيم المحادثات': 'Manage and organize conversations',
  'إدارة': 'Manage',
};

const EN_TO_AR = Object.fromEntries(Object.entries(AR_TO_EN).map(([ar, en]) => [en, ar]));
let queued = false;
let busy = false;

function currentLanguage() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function shouldSkip(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('#pathpilot-language-switch')) return true;
  return ['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(parent.tagName);
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceCatalogEntry(value, from, to) {
  const boundary = '[^\\p{L}\\p{N}_]';
  const pattern = new RegExp(`(^|${boundary})${escapePattern(from)}(?=$|${boundary})`, 'gu');
  return value.replace(pattern, (_match, prefix) => `${prefix}${to}`);
}

export function translateRuntimeText(value, targetLanguage) {
  if (!value) return value;
  const table = targetLanguage === 'en' ? AR_TO_EN : EN_TO_AR;
  const trimmed = value.trim();
  const exact = table[trimmed];
  if (exact) {
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${exact}${value.slice(start + trimmed.length)}`;
  }
  const entries = Object.entries(table)
    .sort((a, b) => b[0].length - a[0].length);
  let result = value;
  for (const [from, to] of entries) {
    result = replaceCatalogEntry(result, from, to);
  }
  return result;
}

function applyRuntimeTranslations() {
  if (!document.body || busy) return;
  busy = true;
  try {
    const targetLanguage = currentLanguage();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (shouldSkip(node)) continue;
      const next = translateRuntimeText(node.nodeValue, targetLanguage);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    document.body.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
      if (element.closest('#pathpilot-language-switch')) return;
      for (const attribute of ['placeholder', 'title', 'aria-label']) {
        if (!element.hasAttribute(attribute)) continue;
        const current = element.getAttribute(attribute);
        const next = translateRuntimeText(current, targetLanguage);
        if (next !== current) element.setAttribute(attribute, next);
      }
    });
  } finally {
    busy = false;
  }
}

function schedule() {
  if (queued || busy) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    applyRuntimeTranslations();
  });
}

export function initI18nRuntimeHardening() {
  applyRuntimeTranslations();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-language', 'placeholder', 'title', 'aria-label'],
  });
  window.addEventListener('pathpilot:language-changed', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
}
