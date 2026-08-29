const STORAGE_KEY = 'pathpilot.language.v1';

const AR_TO_EN = {
  'العودة للرئيسية': 'Back to home',
  'التنقل الرئيسي': 'Main navigation',
  'الرئيسية': 'Home',
  'المساعد العام': 'General Assistant',
  'الدراسة': 'Study',
  'العمل': 'Work',
  'الإدارة': 'Admin',
  'متصل': 'Online',
  'يعمل Offline': 'Works offline',
  'تثبيت': 'Install',
  'مُثبّت': 'Installed',
  'دخول': 'Sign in',
  'تسجيل الخروج': 'Sign out',
  'فتح القائمة': 'Open menu',
  'إغلاق': 'Close',
  'خليه تطبيق على جهازك.': 'Install it as an app.',
  'يعمل على Windows وAndroid وiPhone/iPad، ولا يحتاج حسابًا. بيانات كل مستخدم تبقى محفوظة على جهازه.': 'Works on Windows, Android, iPhone and iPad. No account is required, and each user’s local data stays on their device.',
  'PathPilot مثبت بالفعل على هذا الجهاز.': 'PathPilot is already installed on this device.',
  'تثبيت الآن': 'Install now',
  'افتح الرابط في Safari.': 'Open the link in Safari.',
  'اضغط زر المشاركة.': 'Tap Share.',
  'اختر «إضافة إلى الشاشة الرئيسية».': 'Choose “Add to Home Screen”.',
  'افتح الرابط في Chrome.': 'Open the link in Chrome.',
  'اضغط قائمة ⋮.': 'Open the ⋮ menu.',
  'اختر «تثبيت التطبيق» أو «إضافة للشاشة الرئيسية».': 'Choose “Install app” or “Add to Home screen”.',
  'افتح الرابط في Chrome أو Edge.': 'Open the link in Chrome or Edge.',
  'اضغط علامة التثبيت بجوار شريط العنوان.': 'Click the install icon next to the address bar.',
  'أكد التثبيت ليفتح PathPilot كتطبيق مستقل.': 'Confirm to open PathPilot as a standalone app.',
  'الأنظمة المدعومة': 'Supported platforms',
  'لأي سؤال أو مهمة.': 'for any question or task.',
  'ثلاث مساحات و18 أداة لتنظيم أي طلب: مساعد عام مرن، أدوات دراسة، وأدوات عمل احترافية.': 'Three workspaces and 18 tools for any request: a flexible general assistant, study tools, and professional work tools.',
  'اسأل أي حاجة': 'Ask anything',
  'بدون حساب': 'No account needed',
  'موقع + تطبيق': 'Website + app',
  'الردود الحالية محلية وليست مدعومة بنموذج AI حقيقي حتى الآن.': 'Current responses are local and are not powered by a live AI model yet.',
  'جاهز نبدأ؟': 'Ready to start?',
  'اشرح التعلّم العميق ببساطة': 'Explain deep learning simply',
  'شرح مبسّط': 'Simple explanation',
  'مساحات متخصصة': 'Specialized workspaces',
  'أداة عملية': 'Practical tools',
  'قابل للتثبيت': 'Installable',
  'تجربة عربية أصلية': 'Native Arabic experience',
  'أي طلب له مساحة مناسبة.': 'Every request has the right workspace.',
  'ابدأ بالمساعد العام لأي موضوع، أو استخدم أدوات الدراسة والعمل للمخرجات المتخصصة.': 'Start with the general assistant for any topic, or use Study and Work for specialized outputs.',
  'لأي سؤال أو مشكلة أو نص أو فكرة أو قرار من أي مستخدم.': 'For any question, problem, text, idea, or decision from any user.',
  'فهم تلقائي لنوع الطلب': 'Automatic request understanding',
  'تحسين وتنظيم أي نص': 'Improve and organize any text',
  'توليد أفكار ومقارنة خيارات': 'Generate ideas and compare options',
  'تنظيم اليوم وصناعة المحتوى': 'Plan your day and create content',
  'افتح المساعد العام': 'Open General Assistant',
  'لفهم المحاضرات، ضغط وقت المراجعة، وتحويل الهدف إلى خطة يومية.': 'Understand lessons, shorten review time, and turn goals into a daily plan.',
  'شرح متدرج مع أمثلة': 'Step-by-step explanations with examples',
  'تلخيص وكلمات أساسية': 'Summaries and key terms',
  'خطة مذاكرة قابلة للتنفيذ': 'Actionable study plan',
  'اختبار مراجعة نشط': 'Active review quiz',
  'بطاقات سؤال وجواب': 'Question-and-answer flashcards',
  'خريطة بحث منظمة': 'Structured research map',
  'ابدأ الدراسة': 'Start studying',
  'للكتابة المهنية، تخطيط التنفيذ، توثيق الاجتماعات وعرض الخبرة.': 'For professional writing, execution planning, meeting documentation, and presenting experience.',
  'بريد احترافي واضح': 'Clear professional email',
  'مهام وأولويات ومخرجات': 'Tasks, priorities, and outputs',
  'قرارات وخطوات من الاجتماعات': 'Decisions and next steps from meetings',
  'CV bullets بلا ادعاءات': 'Evidence-based CV bullets',
  'خطاب تقديم مخصص': 'Tailored cover letter',
  'تقارير جودة وBug Reports': 'QA reports and bug reports',
  'ابدأ العمل': 'Start working',
  'نفس التجربة. موقع وتطبيق.': 'The same experience. Web and app.',
  'ثبّت PathPilot على Windows أو Android أو iPhone/iPad وافتحه بسرعة حتى مع اتصال ضعيف.': 'Install PathPilot on Windows, Android, iPhone, or iPad and launch it quickly even on a weak connection.',
  'تثبيت PathPilot': 'Install PathPilot',
  'الأدوات': 'Tools',
  'النتيجة ستظهر هنا': 'Your result will appear here',
  'اكتب تفاصيل حقيقية؛ كلما كان السياق أوضح كانت النتيجة أكثر فائدة.': 'Add real details. The clearer the context, the more useful the result.',
  'نسخ النتيجة': 'Copy result',
  'مشاركة النتيجة': 'Share result',
  'تنزيل النتيجة': 'Download result',
  'قيّم النتيجة': 'Rate this result',
  'آخر النتائج': 'Recent results',
  'مسح': 'Clear',
  'لسه مفيش نتائج محفوظة على الجهاز.': 'No results are saved on this device yet.',
  'خصّص النتيجة': 'Customize result',
  'تُحفظ الإعدادات على جهازك فقط': 'Settings are saved on this device only',
  'اسمك': 'Your name',
  'اختياري': 'optional',
  'يظهر في الرسائل فقط': 'Used only in messages',
  'النتيجة موجهة إلى': 'Target audience',
  'استخدام شخصي': 'Personal use',
  'مدرس أو مشرف': 'Teacher or supervisor',
  'مسؤول توظيف': 'Recruiter',
  'فريق عمل': 'Work team',
  'مستوى التفاصيل': 'Detail level',
  'مختصر': 'Concise',
  'متوازن': 'Balanced',
  'مفصل': 'Detailed',
  'اكتب تفاصيل أكثر قبل الإرسال.': 'Add more details before submitting.',
  'حدث خطأ غير متوقع.': 'An unexpected error occurred.',
  'تم نسخ النتيجة.': 'Result copied.',
  'المشاركة غير متاحة هنا؛ تم نسخ النتيجة بدلًا منها.': 'Sharing is unavailable here, so the result was copied instead.',
  'شكرًا، تم تسجيل تقييمك.': 'Thanks, your rating was recorded.',
  'تعذر تسجيل التقييم حاليًا.': 'Could not record the rating right now.',
  'ملاحظة مهمة': 'Important note',
  'الردود الحالية تُنشأ محليًا وليست مدعومة بنموذج AI حقيقي حتى الآن. لا تعتمد عليها وحدها في قرارات طبية أو قانونية أو مالية.': 'Current responses are generated locally and are not powered by a live AI model yet. Do not rely on them alone for medical, legal, or financial decisions.',
  'اكتب طلبك بالتفصيل': 'Describe your request',
  'جديد': 'New',
  'جاري التجهيز': 'Preparing',
  'أنشئ النتيجة': 'Generate result',
  'مساعد عربي عام للدراسة والعمل والحياة اليومية، صُمم كتجربة Web وPWA متكاملة.': 'A general assistant for study, work, and everyday tasks, built as a complete web and PWA experience.',
  'مسح سجل النتائج المحفوظ على هذا الجهاز؟': 'Clear the result history saved on this device?',
  'تم مسح السجل.': 'History cleared.',
  'تم تسجيل الخروج.': 'Signed out.',
  'تسجيل الدخول': 'Sign in',
  'حساب جديد': 'Create account',
  'أهلًا بعودتك.': 'Welcome back.',
  'أنشئ حساب PathPilot.': 'Create your PathPilot account.',
  'الحساب يحفظ نشاطك في المنصة ويفتح المزايا المتصلة بالخادم.': 'An account saves your platform activity and unlocks server-connected features.',
  'الاسم': 'Name',
  'البريد الإلكتروني': 'Email',
  'كلمة المرور': 'Password',
  'جاري التنفيذ…': 'Please wait…',
  'إنشاء الحساب': 'Create account',
  'لوحة الإدارة جاهزة في الكود، لكنها لن تستقبل بيانات قبل نشر الـBackend وربط VITE_PLATFORM_API_URL.': 'The admin dashboard is ready in code, but it will not receive data until the backend is deployed and VITE_PLATFORM_API_URL is connected.',
  'هذه الصفحة متاحة لحساب المدير فقط.': 'This page is available to admin accounts only.',
  'بيانات حقيقية من المستخدمين والطلبات، من دون أرقام تجريبية.': 'Real user and request data, with no demo numbers.',
  'العودة للتطبيق': 'Back to app',
  'تحديث': 'Refresh',
  'لا يوجد مستخدمون بعد.': 'No users yet.',
  'لا توجد طلبات AI بعد.': 'No AI requests yet.',
  'لا توجد أخطاء مسجلة.': 'No recorded errors.',
  'لا توجد ملاحظات بعد.': 'No feedback yet.',
  'اشرح مفهومًا': 'Explain a concept',
  'شرح مبسّط ومتدرج مع مثال وسؤال مراجعة.': 'A clear step-by-step explanation with an example and review question.',
  'لخّص ملاحظاتي': 'Summarize my notes',
  'حوّل النص الطويل إلى نقاط مركّزة وكلمات أساسية.': 'Turn long text into focused points and key terms.',
  'خطة مذاكرة': 'Study plan',
  'قسّم الهدف إلى جلسات عملية قابلة للتنفيذ.': 'Break a goal into practical, actionable sessions.',
  'اختبر فهمي': 'Quiz me',
  'أسئلة قصيرة للمراجعة النشطة مع إرشاد للإجابة.': 'Short active-recall questions with answer guidance.',
  'بطاقات مراجعة': 'Flashcards',
  'حوّل أي موضوع إلى بطاقات سؤال وجواب سريعة.': 'Turn any topic into quick question-and-answer cards.',
  'خريطة بحث': 'Research map',
  'حوّل موضوعًا واسعًا إلى أسئلة ومحاور وخطة بحث.': 'Turn a broad topic into questions, themes, and a research plan.',
  'بريد احترافي': 'Professional email',
  'صياغة واضحة ومهذبة مع موضوع وخطوة تالية.': 'Clear, professional writing with a subject and next step.',
  'حوّلها إلى مهام': 'Turn it into tasks',
  'حوّل الهدف المبعثر إلى خطوات وأولويات ومخرجات.': 'Turn a scattered goal into steps, priorities, and outputs.',
  'ملخص اجتماع': 'Meeting summary',
  'قرارات، مسؤوليات، مخاطر، وخطوات تالية.': 'Decisions, owners, risks, and next steps.',
  'إنجاز للسيرة': 'CV achievement',
  'حوّل العمل المنفذ إلى bullet قوي بلا ادعاءات.': 'Turn completed work into a strong, evidence-based CV bullet.',
  'خطاب تقديم': 'Cover letter',
  'مسودة مخصصة تربط خبرتك بمتطلبات الوظيفة.': 'A tailored draft connecting your experience to the role.',
  'تقرير جودة': 'QA report',
  'حوّل المشكلة إلى تقرير QA واضح وقابل للتنفيذ.': 'Turn an issue into a clear, actionable QA report.',
  'يفهم نوع الطلب ويعطيك أفضل مسار محلي متاح.': 'Understands the request type and chooses the best available local workflow.',
  'حسّن أي نص': 'Improve any text',
  'ينظّم النص ويجعله أوضح وأسهل في القراءة.': 'Organizes text and makes it clearer and easier to read.',
  'ولّد أفكارًا': 'Generate ideas',
  'أفكار متنوعة مع طريقة سريعة لاختيار الأنسب.': 'Generate varied ideas with a quick way to choose the best one.',
  'ساعدني أقرر': 'Help me decide',
  'قارن الخيارات بمعايير واضحة بدل الاختيار العشوائي.': 'Compare options using clear criteria instead of guessing.',
  'نظّم يومي': 'Plan my day',
  'حوّل الالتزامات إلى جدول واقعي ومرن.': 'Turn commitments into a realistic, flexible schedule.',
  'اصنع محتوى': 'Create content',
  'هيكل منشور أو فيديو أو مقال حسب الهدف والجمهور.': 'Structure a post, video, or article around the goal and audience.'
};

const EN_TO_AR = Object.fromEntries(Object.entries(AR_TO_EN).map(([ar, en]) => [en, ar]));
let currentLanguage = 'ar';
let translating = false;
let scheduled = false;

function translateDynamic(value, language) {
  if (language === 'en') {
    const rating = value.match(/^(\d+) من 5$/);
    if (rating) return `${rating[1]} of 5`;
    const welcome = value.match(/^أهلًا (.+)\.$/);
    if (welcome) return `Welcome, ${welcome[1]}.`;
  } else {
    const rating = value.match(/^(\d+) of 5$/);
    if (rating) return `${rating[1]} من 5`;
    const welcome = value.match(/^Welcome, (.+)\.$/);
    if (welcome) return `أهلًا ${welcome[1]}.`;
  }
  return value;
}

function translated(value, language) {
  if (!value) return value;
  const trimmed = value.trim();
  const table = language === 'en' ? AR_TO_EN : EN_TO_AR;
  const replacement = table[trimmed] || translateDynamic(trimmed, language);
  if (replacement === trimmed) return value;
  const start = value.indexOf(trimmed);
  return `${value.slice(0, start)}${replacement}${value.slice(start + trimmed.length)}`;
}

function translateTree(root, language) {
  if (!root || translating) return;
  translating = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(parent.tagName)) return;
      const next = translated(node.nodeValue, language);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    root.querySelectorAll?.('[aria-label], [title], [placeholder]').forEach((element) => {
      ['aria-label', 'title', 'placeholder'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const value = element.getAttribute(attribute);
        const next = translated(value, language);
        if (next !== value) element.setAttribute(attribute, next);
      });
    });
  } finally {
    translating = false;
  }
}

function ensureSwitch() {
  let button = document.getElementById('pathpilot-language-switch');
  if (!button) {
    button = document.createElement('button');
    button.id = 'pathpilot-language-switch';
    button.type = 'button';
    button.className = 'pathpilot-language-switch';
    button.addEventListener('click', () => applyLanguage(currentLanguage === 'ar' ? 'en' : 'ar'));
    document.body.appendChild(button);
  }
  button.textContent = currentLanguage === 'ar' ? 'English' : 'العربية';
  button.setAttribute('aria-label', currentLanguage === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  button.title = currentLanguage === 'ar' ? 'Switch to English' : 'التبديل إلى العربية';
}

function scheduleTranslation() {
  if (scheduled || translating) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    translateTree(document.getElementById('root'), currentLanguage);
    ensureSwitch();
  });
}

export function applyLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'ar';
  localStorage.setItem(STORAGE_KEY, currentLanguage);
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'en' ? 'ltr' : 'rtl';
  document.body.dataset.language = currentLanguage;
  document.title = currentLanguage === 'en' ? 'PathPilot AI — Study, Work & Everyday Tasks' : 'PathPilot AI — من الجامعة إلى سوق العمل';
  translateTree(document.getElementById('root'), currentLanguage);
  ensureSwitch();
}

export function initLanguageSwitch() {
  const saved = localStorage.getItem(STORAGE_KEY);
  currentLanguage = saved === 'en' ? 'en' : 'ar';
  applyLanguage(currentLanguage);
  const root = document.getElementById('root');
  if (root) {
    const observer = new MutationObserver(scheduleTranslation);
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] });
  }
  window.addEventListener('hashchange', scheduleTranslation);
  window.addEventListener('pageshow', scheduleTranslation);
  scheduleTranslation();
}
