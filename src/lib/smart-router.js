const DIRECT_TOOLS = new Set(['rewrite', 'summarize', 'email', 'tasks', 'meeting', 'cv', 'cover', 'qa', 'organize', 'content', 'brainstorm', 'quiz', 'flashcards']);

const FRESHNESS_PATTERNS = [
  /\b(today|tonight|now|currently|current|latest|recent|newest|this week|this month|2025|2026|2027)\b/i,
  /\b(price|prices|cost|stock|market|exchange rate|weather|news|election|law|regulation|version|release|available|availability|job|jobs|hiring|salary|score|standings)\b/i,
  /(اليوم|النهارده|دلوقتي|حاليًا|حاليا|الآن|احدث|أحدث|اخر|آخر|جديد|الاسبوع ده|الأسبوع ده|الشهر ده)/i,
  /(سعر|أسعار|تكلفة|بورصة|سوق|عملة|طقس|اخبار|أخبار|انتخابات|قانون|لائحة|إصدار|نسخة|متاح|وظيفة|وظائف|توظيف|مرتب|راتب|نتيجة|ترتيب)/i,
];

const EXPLICIT_RESEARCH_PATTERNS = [
  /\b(search|research|look up|browse|verify online|sources?|citations?|web)\b/i,
  /(ابحث|دور على|دوّر على|تحقق|اتأكد|تأكد من|مصادر|مراجع|على النت|الانترنت|الإنترنت|الويب)/i,
];

const HIGH_STAKES_PATTERNS = [
  /\b(medical|medicine|diagnosis|legal|lawyer|tax|investment|investing|financial advice)\b/i,
  /(طبي|دواء|تشخيص|قانوني|محامي|ضريبة|استثمار|استثماري|نصيحة مالية)/i,
];

export function needsFreshResearch(prompt, tool = 'ask') {
  const text = String(prompt || '').trim();
  if (tool === 'research') return true;
  if (!text) return false;
  return FRESHNESS_PATTERNS.some((pattern) => pattern.test(text))
    || EXPLICIT_RESEARCH_PATTERNS.some((pattern) => pattern.test(text))
    || HIGH_STAKES_PATTERNS.some((pattern) => pattern.test(text));
}

export function routeAssistantRequest({ prompt, tool = 'ask', hasResearch = true, hasDirectAI = true, forceResearch = false } = {}) {
  const fresh = needsFreshResearch(prompt, tool);
  if (forceResearch && hasResearch) return { route: 'research', reason: 'user-enabled-search', freshnessRequired: true };
  if (fresh && hasResearch) return { route: 'research', reason: 'fresh-or-grounded', freshnessRequired: true };
  if (DIRECT_TOOLS.has(tool) && hasDirectAI) return { route: 'direct-ai', reason: 'transformation-or-structured-task', freshnessRequired: false };
  if (hasDirectAI && !fresh) return { route: 'direct-ai', reason: 'stable-general-query', freshnessRequired: false };
  if (hasResearch) return { route: 'research', reason: forceResearch ? 'search-fallback' : 'research-fallback', freshnessRequired: fresh || forceResearch };
  return { route: 'local', reason: forceResearch ? 'search-unavailable' : 'no-live-endpoint', freshnessRequired: fresh || forceResearch };
}

export function shouldBypassAnswerCache(prompt, tool = 'ask', { forceResearch = false } = {}) {
  return forceResearch || needsFreshResearch(prompt, tool);
}
