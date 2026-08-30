import { detectLocalIntent } from './local-reasoner.js';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function requestedReasonCount(text, fallback = 2) {
  const match = text.match(/(?:^|\s)([1-5١-٥])\s*(?:اسباب|سبب|reasons?)|(?:اسباب|reasons?)\s*([1-5١-٥])/i);
  const raw = match?.[1] || match?.[2] || '';
  const arabicDigits = { '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5 };
  return Math.max(1, Math.min(5, Number(raw) || arabicDigits[raw] || fallback));
}

function numberedReasons(reasons, count) {
  return reasons.slice(0, count).map((reason, index) => `${index + 1}. ${reason}`).join('\n');
}

function reactVueDecision(text) {
  if (!/\breact\b/i.test(text) || !/\bvue(?:\.js)?\b/i.test(text)) return '';
  const careerPriority = /(شغل|وظيف|portfolio|بورتفوليو|recruit|job|career|سوق العمل|hr)/i.test(text);
  const deliveryPriority = /(اسابيع|اسبوع|deadline|موعد|سرعه|سريع|بسيط|مشروع تخرج|وقت قليل|وقت قصير)/i.test(text);
  const count = requestedReasonCount(text, 2);

  if (careerPriority && !deliveryPriority) {
    const reasons = [
      'React يديك مرونة أكبر في اختيار الأدوات وبناء معماريات مختلفة، وده مفيد في مشروع Portfolio قابل للتوسع.',
      'النظام البيئي واسع جدًا، فهتلاقي مكتبات وأمثلة وحلول جاهزة لمعظم احتياجات المشروع.',
      'المهارات الناتجة عنه تنتقل بسهولة لمشاريع React Native وNext.js لو وسّعت المشروع بعدين.',
    ];
    return `القرار: **React**.\n\n${numberedReasons(reasons, count)}\n\nلو الأولوية القصوى هي التسليم الأسرع بفريق قليل الخبرة، Vue ممكن يقلب القرار.`;
  }

  const reasons = [
    'Vue أسرع في الالتقاط لفريق يعرف JavaScript وHTML/CSS، وده يقلل وقت التعلم داخل مدة قصيرة.',
    'Router وإدارة الحالة لهما خيارات رسمية واضحة، فتقل قرارات الدمج ويزيد تركيز الفريق على تسليم خصائص المشروع.',
    'Single File Components تجمع القالب والمنطق والتنسيق بشكل منظم ومريح لمشروع جامعي صغير أو متوسط.',
  ];
  const condition = deliveryPriority
    ? ''
    : '\n\nلو المشروع هدفه الأساسي Portfolio للتوظيف أو هيتوسع بقوة بعدين، React ممكن يكون أنسب.';
  return `القرار: **Vue**.\n\n${numberedReasons(reasons, count)}${condition}`;
}

function typedJavaScriptDecision(text) {
  if (!/\bjavascript\b/i.test(text) || !/\btypescript\b/i.test(text)) return '';
  const tinyPrototype = /(تجربه صغيره|prototype|سكريبت صغير|سريع جدا|مره واحده)/i.test(text);
  const count = requestedReasonCount(text, 2);
  if (tinyPrototype) {
    return `القرار: **JavaScript** للتجربة الصغيرة فقط.\n\n${numberedReasons([
      'تبدأ فورًا من غير إعداد أنواع أو تعريفات إضافية.',
      'لو الفكرة ثبتت وبدأ الكود يكبر، انقلها إلى TypeScript قبل توسيع الفريق.',
    ], count)}`;
  }
  return `القرار: **TypeScript**.\n\n${numberedReasons([
    'يكشف أخطاء كثيرة أثناء التطوير بدل ظهورها للمستخدم وقت التشغيل.',
    'يوضح عقود البيانات والدوال، فيسهل الصيانة والتعاون داخل الفريق.',
    'يعمل فوق JavaScript ويمكن إدخاله تدريجيًا بدون إعادة كتابة المشروع كله.',
  ], count)}`;
}

function extractNamedOptions(prompt) {
  const match = String(prompt || '').match(/([A-Za-z][A-Za-z0-9.+#-]{1,24})\s*(?:ولا|او|أو|or|vs\.?|versus)\s*([A-Za-z][A-Za-z0-9.+#-]{1,24})/i);
  return match ? [match[1], match[2]] : [];
}

export function naturalLocalResponse({ prompt = '', tool = 'ask' } = {}) {
  const text = normalize(prompt);
  const intent = detectLocalIntent(prompt, tool);
  if (!['comparison', 'decision'].includes(intent)) return '';

  const known = reactVueDecision(text) || typedJavaScriptDecision(text);
  if (known) return known;

  const options = extractNamedOptions(prompt);
  if (options.length === 2) {
    return `أقدر أقارن **${options[0]}** و**${options[1]}**، لكن اختيار واحد من غير معرفة الهدف الأساسي هيبقى تخمين. قلّي أهم معيار واحد عندك: سرعة التسليم، سهولة التعلم، فرص الشغل، الأداء، ولا قابلية التوسع؟`;
  }
  return '';
}
