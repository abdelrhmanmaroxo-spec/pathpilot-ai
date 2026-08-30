const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const TASKS = Object.freeze([
  {
    id: 'conversation',
    label: 'Natural conversation',
    patterns: [/^(?:اهلا|هاي|هلا|سلام|ازيك(?: يا \S+)?|عامل ايه|اخبارك|شكرا|انت مين|انت بتعمل ايه?|بتعمل ايه?|تقدر تعمل ايه|hi|hello|hey|thanks|thank you|how are you|who are you|what are you doing|what can you do)$/i],
    keywords: ['اهلا', 'ازيك', 'شكرا', 'hello', 'thanks', 'chat'],
    examples: ['ازيك يا صاحبي', 'انت بتعمل ايه', 'hello how are you', 'شكرا'],
    stages: ['understand', 'respond'],
  },
  {
    id: 'diagnose',
    label: 'Diagnose a problem',
    patterns: [/(?:ليه|لماذا|سبب|root cause|diagnos|debug|مش شغال|لا يعمل|بيفشل|بيقع|بيهنج|خطا|error|bug|issue)/i],
    keywords: ['ليه', 'سبب', 'مشكله', 'عطل', 'يفشل', 'debug', 'diagnose', 'error', 'bug', 'issue'],
    examples: ['ليه السيرفر بيقع', 'شخص سبب المشكله', 'debug this error', 'why does the app fail'],
    stages: ['understand', 'decompose', 'retrieve', 'analyze', 'verify', 'respond'],
  },
  {
    id: 'decide',
    label: 'Choose and decide',
    patterns: [/(?:اختارلي|اختار لي|اختار|أختار|انهي احسن|انهي افضل|ايهما|which should|help me choose|recommend one|decision)/i],
    keywords: ['اختار', 'انهي', 'ايهما', 'قرار', 'choose', 'decide', 'recommend'],
    examples: ['اختارلي انهي واحد احسن', 'ايهما انسب ليا', 'which option should I choose'],
    stages: ['understand', 'match', 'compare', 'rank', 'decide', 'verify', 'respond'],
  },
  {
    id: 'compare',
    label: 'Compare options',
    patterns: [/(?:قارن|مقارنه|مقارنة|الفرق بين|افضل من|أفضل من|versus|\bvs\.?\b|compare|trade.?off)/i],
    keywords: ['قارن', 'مقارنه', 'فرق', 'افضل', 'compare', 'versus', 'tradeoff'],
    examples: ['قارن بين الخيارين', 'ايه الفرق بينهم', 'compare react versus vue'],
    stages: ['understand', 'retrieve', 'compare', 'verify', 'respond'],
  },
  {
    id: 'plan',
    label: 'Build a plan',
    patterns: [/(?:اعمل خطه|اعملي خطه|create (?:a )?(?:project |launch )?plan|build (?:a )?roadmap)/i, /(?:خطه|خطة|خطوات|مراحل|جدول|roadmap|milestone|step by step|project plan|launch plan)/i],
    keywords: ['خطه', 'خطوات', 'مراحل', 'جدول', 'roadmap', 'steps', 'milestone', 'launch'],
    examples: ['اعمل خطه تنفيذ', 'رتبلي الخطوات', 'create a project roadmap'],
    stages: ['understand', 'decompose', 'retrieve', 'plan', 'check_dependencies', 'verify', 'respond'],
  },
  {
    id: 'analyze',
    label: 'Analyze deeply',
    patterns: [/(?:حلل|تحليل|قيم|قيّم|افحص|راجع بعمق|analy[sz]e|evaluate|investigate|reason about)/i],
    keywords: ['حلل', 'تحليل', 'قيم', 'افحص', 'analyze', 'analysis', 'evaluate', 'investigate'],
    examples: ['حلل الموضوع بعمق', 'قيم المخاطر', 'analyze the situation'],
    stages: ['understand', 'decompose', 'retrieve', 'analyze', 'verify', 'respond'],
  },
  {
    id: 'explain',
    label: 'Explain and teach',
    patterns: [/(?:اشرح|فهمني|وضحلي|وضّحلي|يعني ايه|ما هو|كيف يعمل|explain|teach me|how does|what is)/i],
    keywords: ['اشرح', 'فهمني', 'وضح', 'يعني', 'explain', 'teach', 'learn'],
    examples: ['اشرحلي ببساطه', 'فهمني الفكره', 'explain how this works'],
    stages: ['understand', 'retrieve', 'explain', 'check_understanding', 'respond'],
  },
  {
    id: 'research',
    label: 'Research and verify',
    patterns: [/(?:ابحث|دور على|دورلي|تحقق|اتأكد|مصادر|مراجع|search|research|look up|verify|sources?)/i, /(?:احدث|أحدث|latest|newest)/i, /(?:دلوقتي|حاليا|الان|currently|right now)/i],
    keywords: ['ابحث', 'تحقق', 'مصادر', 'احدث', 'حاليا', 'search', 'research', 'verify', 'latest'],
    examples: ['ابحث عن احدث معلومه', 'اتأكد من مصادر', 'research and verify this'],
    stages: ['understand', 'expand_query', 'research', 'rank_sources', 'crosscheck', 'respond'],
  },
  {
    id: 'code',
    label: 'Build or fix code',
    patterns: [/(?:اكتب كود|صلح الكود|برمج|تطبيق|موقع|باك.?اند|فرونت.?اند|code|implement|refactor|javascript|typescript|react|node|python|api|database|server)/i],
    keywords: ['كود', 'برمج', 'تطبيق', 'موقع', 'سيرفر', 'code', 'implement', 'react', 'node', 'python', 'api'],
    examples: ['اكتب كود للبرنامج', 'صلح الباج', 'implement this feature', 'fix the react app'],
    stages: ['understand', 'decompose', 'inspect', 'implement', 'test', 'review', 'respond'],
  },
  {
    id: 'write',
    label: 'Write or rewrite',
    patterns: [/(?:اكتب|صيغ|صياغه|اعد كتابه|إعادة كتابة|رساله|ايميل|سيره ذاتيه|بوست|write|rewrite|email|message|resume|cv|cover letter|post|caption)/i],
    keywords: ['اكتب', 'صيغ', 'رساله', 'ايميل', 'سيره', 'write', 'rewrite', 'email', 'resume'],
    examples: ['اكتبلي رساله احترافيه', 'صيغ الكلام', 'rewrite this email'],
    stages: ['understand', 'extract_constraints', 'draft', 'edit', 'respond'],
  },
  {
    id: 'summarize',
    label: 'Summarize content',
    patterns: [/(?:لخص|اختصر|ملخص|summari[sz]e|shorten|key points)/i],
    keywords: ['لخص', 'اختصر', 'ملخص', 'summarize', 'shorten'],
    examples: ['لخص الكلام ده', 'طلع اهم النقط', 'summarize this document'],
    stages: ['understand', 'extract', 'compress', 'verify', 'respond'],
  },
  {
    id: 'translate',
    label: 'Translate language',
    patterns: [/(?:ترجم|ترجمه|بالانجليزي|بالعربي|translate|translation|in english|in arabic)/i],
    keywords: ['ترجم', 'ترجمه', 'انجليزي', 'عربي', 'translate', 'translation'],
    examples: ['ترجم ده للانجليزي', 'اكتبها بالعربي', 'translate to English'],
    stages: ['understand', 'translate', 'language_review', 'respond'],
  },
  {
    id: 'calculate',
    label: 'Calculate and check numbers',
    patterns: [/(?:احسب|حساب|نسبه|نسبة|متوسط|تقدير|calculate|calculation|percentage|average|estimate)/i],
    keywords: ['احسب', 'حساب', 'نسبه', 'متوسط', 'calculate', 'percentage', 'average', 'estimate'],
    examples: ['احسبلي النسبه', 'اعمل تقدير للتكلفه', 'calculate the average'],
    stages: ['understand', 'extract_numbers', 'calculate', 'sanity_check', 'respond'],
  },
  {
    id: 'brainstorm',
    label: 'Create ideas',
    patterns: [/(?:اديني افكار|اقترح افكار|فكر معايا|عصف ذهني|brainstorm|generate ideas|creative ideas)/i],
    keywords: ['افكار', 'اقترح', 'ابداع', 'brainstorm', 'ideas', 'creative'],
    examples: ['اديني افكار جديده', 'فكر معايا في حلول', 'brainstorm product ideas'],
    stages: ['understand', 'expand', 'generate', 'rank', 'respond'],
  },
  {
    id: 'answer',
    label: 'Answer a question',
    patterns: [/(?:ايه|ما هي|هل|امتى|فين|مين|what|when|where|who|can you|could you)/i],
    keywords: ['ايه', 'هل', 'what', 'when', 'where', 'answer'],
    examples: ['جاوبني على السؤال', 'ايه الحل', 'answer this question'],
    stages: ['understand', 'retrieve', 'respond'],
  },
]);

export const COGNITIVE_TASKS = TASKS.map(({ patterns: _patterns, keywords: _keywords, examples: _examples, ...task }) => task);

export function normalizeCognitiveText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}+#.\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return new Set(normalizeCognitiveText(value).split(' ').filter((token) => token.length >= 2));
}

function overlap(left, right) {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const token of left) if (right.has(token)) matches += 1;
  return matches / Math.sqrt(left.size * right.size);
}

function ngrams(value, size = 3) {
  const text = normalizeCognitiveText(value).replace(/\s+/g, ' ');
  const result = new Set();
  for (let index = 0; index <= text.length - size; index += 1) result.add(text.slice(index, index + size));
  return result;
}

function dice(left, right) {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const gram of left) if (right.has(gram)) matches += 1;
  return (2 * matches) / (left.size + right.size);
}

function taskScore(task, text, textTokens, textNgrams) {
  const patternHits = task.patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const keywordScore = overlap(textTokens, new Set(task.keywords.map(normalizeCognitiveText)));
  const exampleScore = Math.max(...task.examples.map((example) => (
    overlap(textTokens, tokens(example)) * 0.62 + dice(textNgrams, ngrams(example)) * 0.38
  )));
  const patternScore = patternHits ? Math.min(1, 0.78 + (patternHits - 1) * 0.12) : 0;
  return Math.min(1, patternScore * 0.56 + keywordScore * 0.27 + exampleScore * 0.17);
}

function complexityFor(text, matches) {
  const constraints = (text.match(/(?:لازم|بدون|من غير|فقط|ويكون|كمان|also|must|without|only|and then|as well)/gi) || []).length;
  const deepTasks = new Set(['diagnose', 'decide', 'compare', 'plan', 'analyze', 'research', 'code']);
  if (text.length >= 420 || constraints >= 3 || matches.filter((item) => item.score >= 0.55).length >= 3) return 'deep';
  if (text.length >= 120 || constraints >= 1 || deepTasks.has(matches[0]?.id)) return 'standard';
  return 'light';
}

export function matchCognitiveRequest(value) {
  const text = normalizeCognitiveText(value);
  if (!text) {
    return { intent: 'answer', matchedTask: { id: 'answer', label: 'Answer a question', confidence: 0 }, alternatives: [], complexity: 'light', stages: ['understand', 'respond'] };
  }

  const textTokens = tokens(text);
  const textNgrams = ngrams(text);
  const ranked = TASKS
    .map((task) => ({ id: task.id, label: task.label, stages: task.stages, score: taskScore(task, text, textTokens, textNgrams) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0]?.score >= 0.18 ? ranked[0] : ranked.find((item) => item.id === 'answer');
  const alternatives = ranked
    .filter((item) => item.id !== best.id && item.score >= Math.max(0.2, best.score - 0.22))
    .slice(0, 3)
    .map((item) => ({ id: item.id, label: item.label, confidence: Number(item.score.toFixed(3)) }));
  const relatedStages = ranked
    .filter((item) => item.score >= Math.max(0.32, best.score - 0.14))
    .slice(0, 3)
    .flatMap((item) => item.stages);
  const stages = [...new Set(['understand', 'match', ...best.stages, ...relatedStages, 'review', 'stream'])];

  return {
    intent: best.id,
    matchedTask: { id: best.id, label: best.label, confidence: Number(best.score.toFixed(3)) },
    alternatives,
    complexity: complexityFor(text, ranked),
    stages,
  };
}
