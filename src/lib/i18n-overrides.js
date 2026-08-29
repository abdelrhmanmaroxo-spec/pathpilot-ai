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
};

const EXTRA_EN_TO_AR = Object.fromEntries(Object.entries(EXTRA_AR_TO_EN).map(([ar, en]) => [en, ar]));
let busy = false;
let queued = false;

function language() {
  return document.body?.dataset?.language === 'en' ? 'en' : 'ar';
}

function translate(value, targetLanguage) {
  if (!value) return value;
  const trimmed = value.trim();
  const table = targetLanguage === 'en' ? EXTRA_AR_TO_EN : EXTRA_EN_TO_AR;
  const replacement = table[trimmed];
  if (!replacement) return value;
  const start = value.indexOf(trimmed);
  return `${value.slice(0, start)}${replacement}${value.slice(start + trimmed.length)}`;
}

function translateRoot() {
  const root = document.getElementById('root');
  if (!root || busy) return;
  busy = true;
  try {
    const targetLanguage = language();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(parent.tagName)) return;
      const next = translate(node.nodeValue, targetLanguage);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    root.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
      ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const current = element.getAttribute(attribute);
        const next = translate(current, targetLanguage);
        if (next !== current) element.setAttribute(attribute, next);
      });
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
    translateRoot();
  });
}

export function initI18nOverrides() {
  translateRoot();
  const root = document.getElementById('root');
  if (root) {
    const rootObserver = new MutationObserver(schedule);
    rootObserver.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });
  }
  const bodyObserver = new MutationObserver(schedule);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['data-language'] });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
}
