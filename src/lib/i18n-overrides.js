const EXTRA_AR_TO_EN = {
  'مساعد واحد': 'One assistant',
  'ذاكر بفهم، مش بحفظ.': 'Study to understand, not memorize.',
  'حوّل المحاضرات والأهداف إلى شرح واضح، مراجعة نشطة، وخطة واقعية.': 'Turn lectures and goals into clear explanations, active review, and a realistic plan.',
  'اشتغل بوضوح وسرعة.': 'Work with clarity and speed.',
  'حوّل الأفكار والاجتماعات والخبرات إلى مخرجات مهنية جاهزة للتنفيذ.': 'Turn ideas, meetings, and experience into professional, actionable outputs.',
  'اكتب أي حاجة. وابدأ من هنا.': 'Write anything. Start here.',
  'أسئلة، مشاكل، نصوص، أفكار، قرارات، وتنظيم يومك في مساحة واحدة مرنة.': 'Questions, problems, text, ideas, decisions, and daily planning in one flexible workspace.',
  'مساحة الدراسة': 'Study Workspace',
  'مساحة العمل': 'Work Workspace',
  'Live AI متصل': 'Live AI connected',
  'طبقات ذكاء متعددة': 'Multiple intelligence layers',
  'يستخدم AI حي عند توفره، ومعه موسوعة واستدلال محلي، ويمكن تفعيل Local LLM على الأجهزة الداعمة.': 'Uses live AI when available, backed by a local encyclopedia and reasoning engine, with an optional Local LLM on supported devices.',
  'معاينة PathPilot AI': 'PathPilot AI preview',
  'تجريبي': 'Experimental',
  'متوقف': 'Off',
  'مفعّل على هذا الجهاز': 'Enabled on this device',
  'يشغّل نموذجًا لغويًا محليًا عبر WebGPU عند الحاجة. أول تشغيل قد يحتاج تنزيلًا كبيرًا، ثم يُستخدم Cache المتصفح.': 'Runs a local language model through WebGPU when needed. The first run may require a large download, then the browser cache is reused.',
  'الجهاز أو المتصفح الحالي لا يوفّر WebGPU، وسيستمر استخدام Local Super Reasoner.': 'This device or browser does not provide WebGPU, so Local Super Reasoner will continue to be used.',

  'مثال: اشرح لي مفهوم قواعد البيانات العلائقية كأنني أدرسه لأول مرة…': 'Example: explain relational databases as if I am learning them for the first time…',
  'وضّح الفرق بين HTTP وHTTPS': 'Explain the difference between HTTP and HTTPS',
  'اشرح قانون نيوتن الثاني بمثال': 'Explain Newton’s second law with an example',
  'الصق ملاحظات المحاضرة أو النص المراد تلخيصه…': 'Paste your lecture notes or the text you want summarized…',
  'لخّص هذا الفصل في نقاط': 'Summarize this chapter in bullet points',
  'استخرج أهم المصطلحات': 'Extract the key terms',
  'أنشئ ملخصًا للمراجعة السريعة': 'Create a quick-review summary',
  'مثال: عندي امتحان برمجة بعد 7 أيام، ساعتان متاحتان يوميًا…': 'Example: I have a programming exam in 7 days and two hours available each day…',
  'خطة أسبوع لمراجعة Python': 'One-week Python review plan',
  'قسّم مشروع التخرج على 14 يومًا': 'Split my graduation project across 14 days',
  'خطة مذاكرة قبل الامتحان': 'Study plan before an exam',
  'اكتب الموضوع أو الصق الملخص الذي تريد أسئلة عليه…': 'Enter the topic or paste the summary you want questions about…',
  'اختبار عن أساسيات الشبكات': 'Quiz me on networking basics',
  'أسئلة على OOP': 'Questions about OOP',
  'اختبرني في مبادئ الاقتصاد': 'Quiz me on economics principles',
  'اكتب الموضوع أو الصق النقاط التي تريد تحويلها إلى بطاقات…': 'Enter the topic or paste the points you want turned into flashcards…',
  'بطاقات عن أساسيات الشبكات': 'Flashcards on networking basics',
  'راجع مصطلحات قواعد البيانات': 'Review database terminology',
  'بطاقات سريعة قبل الامتحان': 'Quick flashcards before an exam',
  'اكتب موضوع البحث، المطلوب، والمدة المتاحة…': 'Enter the research topic, requirements, and available time…',
  'خطة بحث عن الأمن السيبراني': 'Cybersecurity research plan',
  'محاور مشروع تخرج': 'Graduation project themes',
  'أسئلة بحث عن الذكاء الاصطناعي': 'AI research questions',

  'مثال: اكتب بريدًا لمديري أطلب فيه موعدًا لمراجعة المشروع…': 'Example: write an email to my manager asking for a project review meeting…',
  'بريد متابعة بعد مقابلة': 'Follow-up email after an interview',
  'طلب موعد مع المدير': 'Request a meeting with my manager',
  'تحديث حالة مشروع للعميل': 'Project status update for a client',
  'صف المشروع أو الهدف والموعد النهائي المتاح…': 'Describe the project or goal and the available deadline…',
  'خطة إطلاق موقع خلال أسبوع': 'Plan a website launch in one week',
  'رتّب مهام اليوم حسب الأولوية': 'Prioritize today’s tasks',
  'قسّم مهمة تحليل البيانات': 'Break down a data-analysis task',
  'الصق ملاحظات الاجتماع حتى لو كانت غير مرتبة…': 'Paste your meeting notes, even if they are unorganized…',
  'رتّب ملاحظات الاجتماع': 'Organize meeting notes',
  'استخرج القرارات والمسؤوليات': 'Extract decisions and owners',
  'أنشئ follow-up واضحًا': 'Create a clear follow-up',
  'مثال: عملت على اختبار ردود نموذج AI واكتشفت أخطاء متكررة…': 'Example: I tested AI model responses and identified recurring errors…',
  'حوّل خبرتي إلى CV bullet': 'Turn my experience into a CV bullet',
  'صغ إنجازًا تقنيًا': 'Write a technical achievement',
  'حسّن وصف المشروع للـHR': 'Improve the project description for HR',
  'الصق وصف الوظيفة واكتب أهم خبرة حقيقية عندك مرتبطة بها…': 'Paste the job description and add your strongest relevant real experience…',
  'خطاب لوظيفة AI Evaluator': 'Cover letter for an AI Evaluator role',
  'تقديم على IT Support': 'Apply for an IT Support role',
  'رسالة تقديم لمطور Junior': 'Application message for a Junior Developer role',
  'صف الخطأ، خطوات ظهوره، المتوقع، والنتيجة الفعلية…': 'Describe the bug, reproduction steps, expected result, and actual result…',
  'اكتب Bug Report احترافي': 'Write a professional bug report',
  'حوّل ملاحظاتي إلى QA report': 'Turn my notes into a QA report',
  'رتّب نتائج اختبار موقع': 'Organize website testing results',

  'اكتب أي سؤال، مشكلة، فكرة، أو شيء تريد تنفيذه…': 'Enter any question, problem, idea, or task you want to work on…',
  'ساعدني أحل مشكلة': 'Help me solve a problem',
  'كيف أبدأ في فكرة جديدة؟': 'How do I start a new idea?',
  'رتّب لي الموضوع ده': 'Help me organize this topic',
  'الصق الرسالة أو الفقرة أو المحتوى الذي تريد تحسينه…': 'Paste the message, paragraph, or content you want improved…',
  'حسّن الرسالة دي': 'Improve this message',
  'خلّي الكلام احترافي': 'Make this more professional',
  'رتّب الفقرة واختصرها': 'Organize and shorten this paragraph',
  'اكتب الموضوع، الجمهور، والهدف من الأفكار…': 'Enter the topic, audience, and goal for the ideas…',
  'أفكار مشروع صغير': 'Small project ideas',
  'أفكار محتوى تقني': 'Technical content ideas',
  'أفكار لتحسين منتج': 'Ideas to improve a product',
  'اكتب الخيارات المتاحة وما الذي يهمك في القرار…': 'Enter your options and what matters most in the decision…',
  'قارن بين خيارين': 'Compare two options',
  'ساعدني أختار جهاز': 'Help me choose a device',
  'هل أبدأ الآن أم أنتظر؟': 'Should I start now or wait?',
  'اكتب المهام، المواعيد، والوقت المتاح اليوم…': 'Enter your tasks, appointments, and available time today…',
  'رتّب مهام يومي': 'Organize my tasks for today',
  'اعمل جدولًا مرنًا': 'Create a flexible schedule',
  'وزّع وقتي بين الدراسة والعمل': 'Split my time between study and work',
  'اكتب نوع المحتوى، موضوعه، الجمهور، والمنصة…': 'Enter the content type, topic, audience, and platform…',
  'بوست LinkedIn تقني': 'Technical LinkedIn post',
  'سكريبت فيديو قصير': 'Short video script',
  'هيكل مقال بسيط': 'Simple article outline',

  'ابعت ملاحظتك': 'Send feedback',
  'الملاحظة بتوصل للوحة الإدارة عشان نعرف إيه اللي محتاج يتحسن.': 'Your feedback goes to the admin dashboard so we can see what needs improvement.',
  'التقييم': 'Rating',
  'اكتب اقتراح، مشكلة، أو أي ملاحظة…': 'Write a suggestion, problem, or any feedback…',
  'إرسال الملاحظة': 'Send feedback',
  'اختار تقييم من 1 إلى 5 نجوم.': 'Choose a rating from 1 to 5 stars.',
  'اكتب ملاحظتك الأول.': 'Write your feedback first.',
  'تم إرسال ملاحظتك للإدارة. شكرًا ✨': 'Your feedback was sent to the admin team. Thank you ✨',
  'تعذر إرسال الملاحظة حاليًا.': 'Could not send feedback right now.',
  'الإعدادات': 'Settings',
  'تسجيل الدخول بحساب Google': 'Sign in with Google',
  'Google Sign-In جاهز على PathPilot.': 'Google Sign-In is ready on PathPilot.',
  'Google Sign-In يحتاج إعداد Google Client ID أولًا.': 'Google Sign-In requires a Google Client ID first.',
  'تبديل / متابعة': 'Switch / Continue',
  'متابعة': 'Continue',
  'نسيت كلمة المرور؟': 'Forgot password?',
  'هنبعت رابط إعادة تعيين على البريد المسجل.': 'We will send a reset link to the registered email.',
  'جاري الإرسال…': 'Sending…',
  'إرسال الرابط': 'Send link',
  'الملاحظات': 'Feedback',
  'اقتراح أو مشكلة تتبعت مباشرة للوحة الإدارة.': 'Send a suggestion or issue directly to the admin dashboard.',
  'إرسال ملاحظة': 'Send feedback',
  'لو الحساب مؤهل، اتبعت رابط إعادة تعيين للبريد. راجع Inbox وSpam.': 'If the account is eligible, a password reset link was sent. Check Inbox and Spam.',
  'تعذر إرسال رابط إعادة التعيين.': 'Could not send the password reset link.',
  'حسابي': 'My account',
  'الحساب وGoogle والأمان': 'Account, Google, and security',
  'تبديل الحساب': 'Switch account',
  'سجّل بحساب مختلف': 'Sign in with a different account',
  'إرسال رابط للبريد': 'Send a link by email',
  'اقتراح أو مشكلة': 'Suggestion or issue',
  'إنهاء الجلسة الحالية': 'End the current session',
  'متابعة باستخدام Google': 'Continue with Google',

  'الحساب اتعمل ومستني التفعيل': 'Account created, awaiting verification',
  'الحساب آمن ومعلّق فقط. اضغط إعادة الإرسال لاحقًا، ولن تحتاج لإنشاء الحساب من جديد.': 'Your account is safe and pending verification. Try resending later; you do not need to create the account again.',
  'الإرسال حاليًا في وضع Resend التجريبي. الحساب لن يُحذف ويمكن إعادة المحاولة.': 'Email delivery is currently using the Resend sandbox. Your account will not be deleted and you can try again.',
  'الحساب آمن ومعلّق فقط، لكن Gmail لم يؤكد تسليم رسالة التفعيل في هذه المحاولة. راجع إعدادات البريد ثم اضغط إعادة الإرسال.': 'Your account is safe and pending, but Gmail did not confirm delivery in this attempt. Check email settings, then resend.',
  'إعادة إرسال رابط التفعيل': 'Resend verification link',
  'العودة لتسجيل الدخول': 'Back to sign in',
  'تم إرسال رابط جديد. راجع Inbox وSpam وPromotions.': 'A new verification link was sent. Check Inbox, Spam, and Promotions.',
  'إعادة تعيين كلمة المرور': 'Reset password',
  'اكتب البريد المرتبط بحسابك. لو الحساب موجود ومؤهل، هنرسل له رابط Reset صالح لمدة 30 دقيقة.': 'Enter the email linked to your account. If the account exists and is eligible, we will send a reset link valid for 30 minutes.',
  'لو البريد مرتبط بحساب، تم إرسال رابط إعادة التعيين. راجع Inbox وSpam وJunk وPromotions وابحث عن PathPilot.': 'If the email is linked to an account, a reset link was sent. Check Inbox, Spam, Junk, and Promotions for PathPilot.',
  'إرسال رابط آخر': 'Send another link',
  'إرسال رابط إعادة التعيين': 'Send reset link',
  'بعد إنشاء الحساب ستحتاج لتأكيد بريدك الإلكتروني قبل أول تسجيل دخول.': 'After creating your account, you will need to verify your email before your first sign-in.',
  'أو بالبريد الإلكتروني': 'or with email',
  'أرسلنا رابط تفعيل إلى': 'We sent a verification link to',
  'افتح الرسالة واضغط Verify email، وبعدها ارجع وسجل دخولك.': 'Open the message and click Verify email, then come back and sign in.',
  'لو الرسالة مش ظاهرة في Inbox، راجع Spam / Junk / Promotions وابحث عن': 'If the message is not in Inbox, check Spam / Junk / Promotions and search for',
  'لو لقيتها في Spam اختار Not spam أو Move to inbox عشان الرسائل الجاية توصل طبيعي.': 'If you find it in Spam, choose Not spam or Move to inbox so future messages arrive normally.',

  'آخر التحديثات': 'What’s new',
  'دليل الاستخدام': 'User guide',
  'متصل ومحمي': 'Connected and protected',
  'جاهز محليًا': 'Ready locally',
  'جاري المعالجة': 'Processing',
  'اكتمل خلال': 'Completed in',
  'النتيجة ستظهر هنا': 'Your result will appear here',
  'اكتب تفاصيل حقيقية؛ كلما كان السياق أوضح كانت النتيجة أكثر فائدة.': 'Add real details; clearer context produces a more useful result.',
  'PathPilot شغال على طلبك': 'PathPilot is working on your request',
  'بيحدد المسار، يراجع السياق، ويجهز أفضل إجابة متاحة.': 'Routing the request, checking context, and preparing the best available answer.',
  'فهم الطلب والقيود': 'Understanding the request and constraints',
  'اختيار AI حي أو بحث أو fallback محلي': 'Choosing live AI, research, or local fallback',
  'تجهيز ومراجعة النتيجة النهائية': 'Preparing and checking the final response',
  'تسجيل صوتي طويل': 'Long voice input',
  'إيقاف التسجيل': 'Stop recording',
  'استكمال تلقائي مفعّل': 'Auto-resume active',
  'يكمل لحد ما توقفه بنفسك': 'Keeps listening until you stop it',
  'اقرأ الرد': 'Read aloud',
  'وقف الصوت': 'Stop audio',
  'لازم تسمح للمتصفح باستخدام الميكروفون عشان التسجيل الصوتي.': 'Microphone permission is required for voice input.',
  'التعرف على الصوت اتوقف لحظة وهيحاول يكمل تلقائيًا.': 'Voice recognition paused and will try to resume automatically.',
  'اكتب Prompt الأول وبعدها ثبّته.': 'Write a prompt first, then pin it.',
  'تم تثبيت الـPrompt.': 'Prompt pinned.',
  'تم إلغاء تثبيت الـPrompt.': 'Prompt unpinned.',
  'ثبّت Prompt': 'Pin prompt',
  'إلغاء التثبيت': 'Unpin',
  'محفوظ': 'saved',
  'Prompts مثبتة': 'Pinned prompts',
  'المصادر': 'Sources',
  'مراجع مختارة': 'selected references',
};

const EXTRA_EN_TO_AR = Object.fromEntries(Object.entries(EXTRA_AR_TO_EN).map(([ar, en]) => [en, ar]));
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PARTIAL_AR_TO_EN = Object.entries(EXTRA_AR_TO_EN).sort((a, b) => b[0].length - a[0].length);
const PARTIAL_EN_TO_AR = Object.entries(EXTRA_EN_TO_AR).sort((a, b) => b[0].length - a[0].length);
let busy = false;
let queued = false;

function language() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function normalizeEnglishNumerals(value) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/٬/g, ',')
    .replace(/٫/g, '.');
}

function translateDynamic(value, targetLanguage) {
  if (targetLanguage === 'en') {
    return value
      .replace(/(\d+)\s*من\s*5/g, '$1 of 5')
      .replace(/تقييم\s+(\d+)\s*من\s*5/g, 'Rating $1 of 5')
      .replace(/أهلًا\s+([^.!؟]+)\./g, 'Welcome, $1.');
  }
  return value
    .replace(/(\d+)\s*of\s*5/g, '$1 من 5')
    .replace(/Rating\s+(\d+)\s*of\s*5/g, 'تقييم $1 من 5')
    .replace(/Welcome,\s+([^.!?]+)\./g, 'أهلًا $1.');
}

function translate(value, targetLanguage) {
  if (!value) return value;
  const trimmed = value.trim();
  const table = targetLanguage === 'en' ? EXTRA_AR_TO_EN : EXTRA_EN_TO_AR;
  const exact = table[trimmed];
  let result = value;
  if (exact) {
    const start = value.indexOf(trimmed);
    result = `${value.slice(0, start)}${exact}${value.slice(start + trimmed.length)}`;
  } else {
    const replacements = targetLanguage === 'en' ? PARTIAL_AR_TO_EN : PARTIAL_EN_TO_AR;
    for (const [from, to] of replacements) {
      if (result.includes(from)) result = result.split(from).join(to);
    }
    result = translateDynamic(result, targetLanguage);
  }
  return targetLanguage === 'en' ? normalizeEnglishNumerals(result) : result;
}

function shouldSkip(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest('#pathpilot-language-switch')) return true;
  return ['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(parent.tagName);
}

function polishLanguageSpecificUi(targetLanguage) {
  const proof = document.querySelector('.proof-grid > div:last-child');
  if (proof) {
    const metric = proof.querySelector('strong');
    const label = proof.querySelector('span');
    if (metric) metric.textContent = targetLanguage === 'en' ? 'LTR' : 'RTL';
    if (label) label.textContent = targetLanguage === 'en' ? 'English experience' : 'تجربة عربية أصلية';
  }
}

function translateUi() {
  const scope = document.body;
  if (!scope || busy) return;
  busy = true;
  try {
    const targetLanguage = language();
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (shouldSkip(node)) return;
      const next = translate(node.nodeValue, targetLanguage);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    scope.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
      if (element.id === 'pathpilot-language-switch' || element.closest('#pathpilot-language-switch')) return;
      ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute);
        const next = translate(current, targetLanguage);
        if (next !== current) element.setAttribute(attribute, next);
      });
    });
    polishLanguageSpecificUi(targetLanguage);
  } finally {
    busy = false;
  }
}

function schedule() {
  if (queued || busy) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    translateUi();
  });
}

export function initI18nOverrides() {
  translateUi();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-language', 'placeholder', 'title', 'aria-label'],
  });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
}