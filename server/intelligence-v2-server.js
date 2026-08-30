import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { createAdminExtensions } from './admin-extensions.js';
import { buildProviderRequest, buildSystemPrompt, extractProviderText } from './lib/ai-provider.js';
import { initializeDatabase } from './lib/database.js';
import { applySecurityHeaders, createSecurityGuard } from './lib/security.js';

const MAX_RESULTS = 20;
const MAX_SOURCES = 10;
const IDEAL_SOURCES = 6;
const MAX_AI_SOURCES = 8;

const TOOL_GOALS = {
  explain: 'اشرح من المبادئ الأساسية إلى التطبيق مع مثال وخطأ شائع.',
  summarize: 'لخّص مع الحفاظ على الحقائق والأرقام والقيود المهمة.',
  plan: 'ابن خطة عملية بمراحل ومخاطر ونقاط تحقق.',
  quiz: 'أنشئ اختبار فهم وتطبيق.',
  flashcards: 'أنشئ بطاقات مراجعة واضحة وعالية القيمة.',
  research: 'أجب عن سؤال البحث بتحليل الأدلة وجودة المصادر والتعارضات.',
  email: 'اكتب البريد المطلوب نفسه بصورة مهنية ومخصصة.',
  tasks: 'حوّل الهدف إلى مهام مرتبة واعتماديات ومخرجات.',
  meeting: 'استخرج القرارات والمسؤوليات والمواعيد والمخاطر.',
  cv: 'صغ خبرة ATS-friendly بلا ادعاءات مختلقة.',
  cover: 'اربط الخبرة الحقيقية بمتطلبات الوظيفة.',
  qa: 'حلل كمهندس QA بخطوات إعادة الإنتاج والأثر وإعادة الاختبار.',
  ask: 'أجب مباشرة ونفذ المقارنة أو الخطة أو التحليل المطلوب.',
  rewrite: 'حسن النص مع الحفاظ على المعنى والحقائق.',
  brainstorm: 'ولد اتجاهات مختلفة ثم رتب الأقوى حسب الجدوى والتأثير.',
  decide: 'قارن الخيارات الحقيقية ثم قدم ترشيحات حسب حالة الاستخدام.',
  organize: 'نظم الوقت حسب القيود والأولويات والاعتماديات.',
  content: 'أنشئ محتوى مناسبًا للمنصة والجمهور بقيمة عملية.',
};

const PENALIZED = [
  'facebook.com','instagram.com','tiktok.com','quora.com','pinterest.com','x.com','twitter.com',
  'medium.com','reddit.com','wordpress.com','blogspot.com','youtube.com',
];
const AUTHORITY = [
  '.gov','.edu','.ac.','docs.','developer.','support.','help.','github.com','mozilla.org','w3.org',
  'microsoft.com','google.com','openai.com','apple.com','cloudflare.com','amazon.com','coursera.org','edx.org',
  'freecodecamp.org','codecademy.com','theodinproject.com','khanacademy.org','code.org','pluralsight.com',
];

function normalizeOrigins(value) {
  return new Set(String(value || 'http://localhost:5173').split(',').map((v) => v.trim()).filter(Boolean));
}
function cors(origin, allowed) {
  return {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    ...(origin && allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
  };
}
function sendJson(res, status, body, origin, allowed, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...cors(origin, allowed),
    ...extra,
  });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 128_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}
function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
function quality(result) {
  const domain = host(result?.url);
  if (!domain) return -100;
  const provider = Number.isFinite(Number(result?.score)) ? Number(result.score) : 0.3;
  const text = `${result?.title || ''} ${result?.content || ''}`.toLowerCase();
  let score = provider * 5;
  if (AUTHORITY.some((item) => domain.includes(item))) score += 3;
  if (PENALIZED.some((item) => domain === item || domain.endsWith(`.${item}`))) score -= 3.5;
  if (/official|documentation|docs|research|study|report|manual|رسمي|توثيق|دراسة|جامعة/i.test(text)) score += 0.8;
  if (/(201[0-9]|2020|2021)/.test(text)) score -= 0.8;
  if (String(result?.content || '').trim().length < 140) score -= 0.8;
  return score;
}
function selectSources(results) {
  const byDomain = new Map();
  for (const result of Array.isArray(results) ? results : []) {
    const domain = host(result?.url);
    if (!domain) continue;
    const item = {
      title: String(result?.title || domain).trim().slice(0, 220),
      url: String(result?.url || '').trim(),
      domain,
      snippet: String(result?.content || '').replace(/\s+/g, ' ').trim().slice(0, 600),
      quality: quality(result),
    };
    const previous = byDomain.get(domain);
    if (!previous || item.quality > previous.quality) byDomain.set(domain, item);
  }
  const ranked = [...byDomain.values()].sort((a, b) => b.quality - a.quality);
  const strong = ranked.filter((x) => x.quality >= 2.2);
  return (strong.length >= 4 ? strong : ranked).slice(0, MAX_SOURCES);
}
function searchQuery(prompt, tool, mode, round) {
  const goal = TOOL_GOALS[tool] || TOOL_GOALS.ask;
  const instructions = [
    'ابدأ بالمواقع الرسمية للمنتجات أو المؤسسات المذكورة أو المرشحة، ثم مصدر مستقل موثوق للتحقق. لا تبدأ من مقالات التجميع.',
    'ابحث عن صفحات رسمية وتوثيق ومؤسسات تعليمية أو تقارير مستقلة عالية الجودة لسد الفجوات والتحقق من الادعاءات.',
    'نفذ جولة تحقق أخيرة فقط للنقاط المتعارضة أو المتغيرة. تجنب الشبكات الاجتماعية والمدونات الشخصية إذا وجد مصدر أولي.',
  ];
  return `طلب المستخدم: ${String(prompt).slice(0, 1200)}. الهدف: ${goal}. المساحة: ${mode}. ${instructions[Math.min(round, 2)]} الجودة أهم من العدد.`;
}
async function tavily(key, query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query, search_depth: 'advanced', topic: 'general', max_results: MAX_RESULTS, include_answer: 'advanced', include_raw_content: false, include_images: false }),
    signal: AbortSignal.timeout(18_000),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`SEARCH_${res.status}`);
  return payload;
}
function aiConfig(env) {
  const apiKey = String(env.AI_API_KEY || '').trim();
  const model = String(env.AI_MODEL || '').trim();
  const baseUrl = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const endpoint = String(env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`);
  return { apiKey, model, baseUrl, apiMode, endpoint, reasoning: String(env.AI_REASONING_EFFORT || '').trim(), configured: Boolean(apiKey && model) };
}
function evidencePrompt({ prompt, tool, mode, sources }) {
  const evidence = sources.slice(0, MAX_AI_SOURCES).map((s, i) => `[${i + 1}] ${s.title}\n${s.domain}\n${s.url}\n${s.snippet}`).join('\n\n');
  return [
    `طلب المستخدم: ${prompt}`,
    `الهدف: ${TOOL_GOALS[tool] || TOOL_GOALS.ask}. المساحة: ${mode}.`,
    'حلل الأدلة داخليًا ثم اعرض النتيجة فقط. لا تعرض سلسلة التفكير.',
    'ابدأ بخلاصة مباشرة. استخدم عناوين قصيرة ومسافات. في المقارنات استخدم جدول Markdown صغير ثم مزايا وعيوب ثم ترشيحات حسب حالة الاستخدام.',
    'ميّز الحقيقة عن الاستنتاج. حل التعارضات بترجيح المصدر الرسمي أو الأولي والأحدث والأكثر مباشرة. لا تستخدم ادعاء حديثًا بلا دليل.',
    'ضع [رقم] بعد الادعاء المدعوم. لا تكرر الأفكار ولا تحول الرد إلى تقرير عن عملية البحث.',
    'اختم بتوصية عملية أو خطوة تالية عندما يكون ذلك مفيدًا.',
    '',
    'الأدلة:', evidence,
  ].join('\n');
}
function directPrompt({ prompt, tool, mode, failed }) {
  return `${prompt}\n\nنفذ الطلب مباشرة كـ${TOOL_GOALS[tool] || TOOL_GOALS.ask} في مساحة ${mode}. ${failed ? 'البحث فشل مؤقتًا، فلا تدع أن المعلومات الحديثة متحققة.' : ''} نسق بعناوين ونقاط أو جدول عند الحاجة. فكر داخليًا ثم قدم النتيجة فقط.`;
}
async function nativeGeminiCall({ env, prompt, mode, tool, preferences, grounded }) {
  const c = aiConfig(env);
  if (!c.configured || !c.baseUrl.includes('generativelanguage.googleapis.com')) return null;
  const system = buildSystemPrompt({ mode, tool, preferences, groundedResearch: grounded });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': c.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: grounded ? 0.25 : 0.45, maxOutputTokens: 4096 },
    }),
    signal: AbortSignal.timeout(55_000),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GEMINI_NATIVE_${res.status}:${String(payload?.error?.message || '').slice(0, 140)}`);
  const answer = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n').trim();
  if (!answer) throw new Error('GEMINI_NATIVE_EMPTY');
  return { answer, model: c.model, path: 'native' };
}
async function compatibleAiCall({ env, prompt, mode, tool, preferences, grounded, reasoning }) {
  const c = aiConfig(env);
  if (!c.configured) return null;
  const request = buildProviderRequest({ apiMode: c.apiMode, model: c.model, prompt, mode, tool, preferences, reasoningEffort: reasoning, groundedResearch: grounded });
  const res = await fetch(c.endpoint, {
    method: 'POST', headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(50_000),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`AI_COMPAT_${res.status}:${String(payload?.error?.message || '').slice(0, 140)}`);
  const answer = extractProviderText(payload, c.apiMode);
  if (!answer) throw new Error('AI_COMPAT_EMPTY');
  return { answer, model: c.model, path: 'compatible' };
}
async function resilientAi(args) {
  let last;
  try {
    const native = await nativeGeminiCall(args);
    if (native) return native;
  } catch (error) { last = error; console.warn('Native Gemini failed:', error?.message || error); }
  const c = aiConfig(args.env);
  for (const effort of [...new Set([c.reasoning || 'medium', 'low', ''])]) {
    try { return await compatibleAiCall({ ...args, reasoning: effort }); }
    catch (error) { last = error; console.warn(`Compatible AI (${effort || 'default'}) failed:`, error?.message || error); }
  }
  throw last || new Error('AI_FAILED');
}
function appendix(sources) {
  if (!sources.length) return '';
  return `\n\nالمصادر المختارة (${sources.length})\n${sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}`).join('\n\n')}`;
}
function bestSearch(rounds) {
  return rounds.map((r) => String(r?.answer || '').trim()).find(Boolean) || 'تم جمع مصادر، لكن مزود البحث لم يرجع ملخصًا صالحًا.';
}

export function createIntelligenceV2Handler({ env = process.env, baseApp, database }) {
  const allowed = normalizeOrigins(env.ALLOWED_ORIGINS);
  const tavilyKey = String(env.TAVILY_API_KEY || '').trim();
  const researchAvailable = Boolean(tavilyKey);
  const synthesisAvailable = aiConfig(env).configured;
  const guard = createSecurityGuard();
  const admin = database ? createAdminExtensions({ database, env, sendJson, allowedOrigins: allowed }) : null;

  return async function handler(req, res) {
    applySecurityHeaders(req, res);
    const origin = req.headers.origin || '';
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname;
    const security = guard.check(req);
    if (!security.allowed) return sendJson(res, security.status, { error: security.error, code: security.code }, origin, allowed, security.retryAfterSeconds ? { 'Retry-After': String(security.retryAfterSeconds) } : {});
    if (admin && (path.startsWith('/api/admin/') || path.startsWith('/api/security/'))) {
      const handled = await admin(req, res, origin, path); if (handled) return;
    }
    if (path.startsWith('/api/research') && req.method === 'OPTIONS') { res.writeHead(204, cors(origin, allowed)); return res.end(); }
    if (req.method === 'GET' && path === '/api/research/status') {
      return sendJson(res, 200, { researchAvailable, synthesisAvailable, fallbackAvailable: synthesisAvailable, provider: researchAvailable ? 'Tavily' : null, qualityFirst: true, idealQualitySources: IDEAL_SOURCES, maxDisplayedSources: MAX_SOURCES, nativeGeminiPreferred: aiConfig(env).baseUrl.includes('generativelanguage.googleapis.com'), beta: true, appliesToAllTools: true }, origin, allowed);
    }
    if (req.method !== 'POST' || path !== '/api/research') return baseApp.handle(req, res);

    let body;
    try { body = await readJson(req); } catch (error) { return sendJson(res, 400, { error: 'Invalid request.', code: String(error?.message || 'INVALID') }, origin, allowed); }
    const prompt = String(body.prompt || body.query || '').trim();
    const tool = String(body.tool || 'ask').slice(0, 40);
    const mode = String(body.mode || 'general').slice(0, 30);
    const preferences = body.preferences && typeof body.preferences === 'object' ? body.preferences : {};
    if (prompt.length < 3 || prompt.length > 12_000) return sendJson(res, 400, { error: 'Query length is invalid.' }, origin, allowed);

    if (!researchAvailable) {
      if (synthesisAvailable) {
        try {
          const ai = await resilientAi({ env, prompt: directPrompt({ prompt, tool, mode, failed: false }), mode, tool, preferences, grounded: false });
          return sendJson(res, 200, { answer: `🧠 PathPilot AI Beta\nالبحث غير متاح في هذه المحاولة.\n\n${ai.answer}`, sources: [], sourceCount: 0, sourceMode: 'ai-fallback', synthesisModel: ai.model, synthesisPath: ai.path, researchFailed: false }, origin, allowed);
        } catch (error) { console.warn('AI-only fallback failed:', error?.message || error); }
      }
      return sendJson(res, 503, { error: 'Research and AI are unavailable.' }, origin, allowed);
    }

    let rounds = [];
    try {
      const primary = await tavily(tavilyKey, searchQuery(prompt, tool, mode, 0));
      rounds = [primary];
      let sources = selectSources(primary.results);
      if (sources.length < IDEAL_SOURCES) {
        const extra = await Promise.allSettled([tavily(tavilyKey, searchQuery(prompt, tool, mode, 1)), tavily(tavilyKey, searchQuery(prompt, tool, mode, 2))]);
        rounds.push(...extra.filter((x) => x.status === 'fulfilled').map((x) => x.value));
        sources = selectSources(rounds.flatMap((r) => Array.isArray(r?.results) ? r.results : []));
      }
      let synthesis = null;
      if (synthesisAvailable && sources.length) {
        try { synthesis = await resilientAi({ env, prompt: evidencePrompt({ prompt, tool, mode, sources }), mode, tool, preferences, grounded: true }); }
        catch (error) { console.warn('Synthesis failed after native+compatible attempts:', error?.message || error); }
      }
      const answer = synthesis?.answer || bestSearch(rounds);
      const note = synthesis
        ? `تم تحليل ${sources.length} مصادر مختارة بواسطة ${synthesis.model} عبر ${synthesis.path === 'native' ? 'Gemini Native API' : 'واجهة AI المتوافقة'}.`
        : `تم اختيار ${sources.length} مصادر مرتبطة. تعذر تركيب AI في هذه المحاولة، لذلك استُخدم أفضل ملخص بحث متاح.`;
      return sendJson(res, 200, { answer: `🌐 PathPilot Research Beta\n${note}\n\n${answer}${appendix(sources)}`, sources, sourceCount: sources.length, targetReached: sources.length >= IDEAL_SOURCES, provider: 'Tavily', synthesisProvider: synthesis ? 'AI' : 'Tavily', synthesisModel: synthesis?.model || null, synthesisPath: synthesis?.path || null, sourceMode: synthesis ? 'research-ai' : 'research-search', researchFailed: false, qualityFirst: true }, origin, allowed);
    } catch (searchError) {
      if (synthesisAvailable) {
        try {
          const ai = await resilientAi({ env, prompt: directPrompt({ prompt, tool, mode, failed: true }), mode, tool, preferences, grounded: false });
          return sendJson(res, 200, { answer: `🧠 PathPilot AI fallback Beta\nتعذر البحث مؤقتًا، لكن الذكاء الاصطناعي أكمل المهمة.\n\n${ai.answer}`, sources: [], sourceCount: 0, sourceMode: 'ai-fallback', synthesisModel: ai.model, synthesisPath: ai.path, researchFailed: true }, origin, allowed);
        } catch (error) { console.warn('Fallback after search failed:', error?.message || error); }
      }
      return sendJson(res, 502, { error: 'Research and AI fallback failed.', code: String(searchError?.message || 'FAILED').slice(0, 120) }, origin, allowed);
    }
  };
}

if (process.argv[1]?.endsWith('server/intelligence-v2-server.js')) {
  const databasePath = process.env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const database = initializeDatabase(databasePath);
  const baseApp = createPathPilotServer({ database });
  const handler = createIntelligenceV2Handler({ baseApp, database });
  const port = Number(process.env.PORT || 8787);
  const server = createServer(handler);
  server.requestTimeout = 120_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 5_000;
  server.listen(port, '0.0.0.0', () => console.log(`PathPilot intelligence v2 beta listening on port ${port}`));
}
