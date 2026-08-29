import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { createAdminExtensions } from './admin-extensions.js';
import { buildProviderRequest, extractProviderText } from './lib/ai-provider.js';
import { initializeDatabase } from './lib/database.js';
import { applySecurityHeaders, createSecurityGuard } from './lib/security.js';

const MAX_SEARCH_RESULTS = 20;
const MAX_DISPLAY_SOURCES = 12;
const IDEAL_QUALITY_SOURCES = 8;
const MAX_AI_SOURCES = 10;

const TOOL_GOALS = {
  explain: 'اشرح من المبادئ الأساسية إلى التطبيق مع مثال وخطأ شائع.',
  summarize: 'استخرج الحقائق والقرارات والأرقام والقيود دون حشو.',
  plan: 'ابن خطة عملية بمراحل ومخاطر ونقاط تحقق ومخرجات قابلة للقياس.',
  quiz: 'أنشئ اختبار فهم وتطبيق مع تنويع مستوى الأسئلة.',
  flashcards: 'أنشئ بطاقات مراجعة ذرية وواضحة وعالية القيمة.',
  research: 'أجب عن سؤال البحث نفسه بتحليل الأدلة وجودة المصادر والتعارضات.',
  email: 'اكتب البريد المطلوب نفسه بصورة مهنية ومخصصة.',
  tasks: 'حوّل الهدف إلى مهام مرتبة واعتماديات ومخرجات وتعريف إنجاز.',
  meeting: 'استخرج القرارات والمسؤوليات والمواعيد والمخاطر والأسئلة المفتوحة.',
  cv: 'صغ خبرة ATS-friendly بلا أرقام أو ادعاءات مختلقة.',
  cover: 'اربط الخبرة الحقيقية بمتطلبات الوظيفة بلا كلام عام.',
  qa: 'حلل كمهندس QA: إعادة إنتاج، متوقع/فعلي، أثر، نطاق، أدلة وإعادة اختبار.',
  ask: 'أجب مباشرة على السؤال الحقيقي ونفذ المقارنة أو الخطة أو التحليل المطلوب.',
  rewrite: 'حسن النص مع الحفاظ على المعنى والحقائق.',
  brainstorm: 'ولد اتجاهات مختلفة فعليًا ثم رتب الأقوى حسب الجدوى والتأثير والمخاطر.',
  decide: 'قارن الخيارات الحقيقية بمعايير مفيدة ثم قدم ترشيحات حسب حالة الاستخدام.',
  organize: 'نظم الوقت حسب القيود والأولويات والطاقة والاعتماديات.',
  content: 'أنشئ محتوى مناسبًا للمنصة والجمهور مع أمثلة وقيمة عملية.',
};

const LOW_QUALITY_DOMAINS = [
  'facebook.com', 'instagram.com', 'tiktok.com', 'quora.com', 'pinterest.com',
  'x.com', 'twitter.com', 'medium.com', 'reddit.com',
];

const AUTHORITY_HINTS = [
  '.gov', '.edu', '.ac.', 'docs.', 'developer.', 'support.', 'help.',
  'github.com', 'mozilla.org', 'w3.org', 'microsoft.com', 'google.com',
  'openai.com', 'apple.com', 'cloudflare.com', 'aws.amazon.com',
];

function normalizeOriginList(value) {
  return new Set(String(value || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean));
}

function corsHeaders(origin, allowedOrigins) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
    Vary: 'Origin',
  };
}

function sendJson(response, status, body, origin, allowedOrigins, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...corsHeaders(origin, allowedOrigins),
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 128_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

function hostname(value) {
  try { return new URL(value).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function sourceQuality(result) {
  const domain = hostname(result?.url);
  if (!domain) return -100;
  const providerScore = Number.isFinite(Number(result?.score)) ? Number(result.score) : 0.35;
  const text = `${result?.title || ''} ${result?.content || ''}`.toLowerCase();
  let quality = providerScore * 5;
  if (AUTHORITY_HINTS.some((hint) => domain.includes(hint))) quality += 2.4;
  if (LOW_QUALITY_DOMAINS.some((item) => domain === item || domain.endsWith(`.${item}`))) quality -= 2.8;
  if (/official|documentation|docs|research|study|report|manual|دليل|توثيق|رسمي|دراسة/i.test(text)) quality += 0.6;
  if (String(result?.content || '').trim().length < 120) quality -= 0.7;
  return quality;
}

function qualitySources(results, limit = MAX_DISPLAY_SOURCES) {
  const bestByDomain = new Map();
  for (const result of Array.isArray(results) ? results : []) {
    const domain = hostname(result?.url);
    if (!domain) continue;
    const title = String(result?.title || domain).trim().slice(0, 220);
    const snippet = String(result?.content || '').replace(/\s+/g, ' ').trim().slice(0, 700);
    if (!title && !snippet) continue;
    const item = {
      title,
      url: String(result?.url || '').trim(),
      domain,
      snippet,
      providerScore: Number.isFinite(Number(result?.score)) ? Number(result.score) : null,
      quality: sourceQuality(result),
    };
    const previous = bestByDomain.get(domain);
    if (!previous || item.quality > previous.quality) bestByDomain.set(domain, item);
  }
  const ranked = [...bestByDomain.values()].sort((a, b) => b.quality - a.quality);
  const strong = ranked.filter((item) => item.quality >= 1.2);
  return (strong.length >= 4 ? strong : ranked).slice(0, limit);
}

function buildResearchQuery({ prompt, tool, mode, round }) {
  const cleanPrompt = String(prompt || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const goal = TOOL_GOALS[tool] || TOOL_GOALS.ask;
  const instruction = [
    'ابحث أولا عن المصادر الرسمية أو الأولية التي تخص الكيانات المذكورة في السؤال، ثم مصادر مستقلة قوية للتحقق.',
    'ابحث عن مصادر مستقلة عالية السلطة وتوثيق ودراسات وبيانات، وحاول التحقق من الادعاءات الأساسية من زاوية مختلفة.',
    'ابحث فقط لسد الفجوات أو التحقق من نقاط متعارضة أو متغيرة زمنيًا. تجنب الشبكات الاجتماعية وصفحات التجميع الضعيفة إن وجد بديل أقوى.',
  ][Math.min(round, 2)];
  return `طلب المستخدم: ${cleanPrompt}. الهدف: ${goal}. مساحة العمل: ${mode}. ${instruction} الجودة أهم من عدد الروابط. أرجع نتائج مرتبطة مباشرة بالطلب.`;
}

async function tavilySearch(apiKey, query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      topic: 'general',
      max_results: MAX_SEARCH_RESULTS,
      include_answer: 'advanced',
      include_raw_content: false,
      include_images: false,
    }),
    signal: AbortSignal.timeout(18_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`SEARCH_PROVIDER_${response.status}`);
  return payload;
}

function aiConfiguration(env) {
  const apiKey = String(env.AI_API_KEY || '').trim();
  const model = String(env.AI_MODEL || '').trim();
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const baseUrl = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const endpoint = String(env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`);
  const reasoningEffort = String(env.AI_REASONING_EFFORT || '').trim();
  return { apiKey, model, apiMode, endpoint, reasoningEffort, configured: Boolean(apiKey && model) };
}

function evidencePrompt({ prompt, mode, tool, sources }) {
  const evidence = sources.slice(0, MAX_AI_SOURCES).map((source, index) => [
    `[${index + 1}] ${source.title}`,
    `domain: ${source.domain}`,
    `url: ${source.url}`,
    `evidence: ${source.snippet}`,
  ].join('\n')).join('\n\n');

  return [
    'كوّن الإجابة النهائية من الأدلة التالية.',
    `طلب المستخدم: ${prompt}`,
    `الأداة: ${tool}. المساحة: ${mode}. الهدف: ${TOOL_GOALS[tool] || TOOL_GOALS.ask}`,
    '',
    'نفّذ داخليًا قبل الكتابة: حدّد المطلوب الحقيقي، افصل الحقائق عن الاستنتاجات، افحص التعارضات، اختر أقوى الأدلة، ثم راجع الناتج مرة أخيرة. لا تعرض سلسلة التفكير الداخلية.',
    'قواعد الإخراج:',
    '• ابدأ بخلاصة مباشرة من 2 إلى 4 أسطر.',
    '• استخدم عناوين قصيرة واضحة ومسافات بين الأقسام. لا تكتب جدار نص واحد.',
    '• في المقارنات استخدم جدولًا نصيًا/Markdown صغيرًا إذا كان مفيدًا، ثم وضح مزايا وعيوب أهم الخيارات، ثم أفضل اختيار حسب أكثر من حالة استخدام.',
    '• في القرارات أعط توصية مشروطة واضحة بدل الاكتفاء بقائمة معايير.',
    '• في العصف الذهني اعرض اتجاهات مختلفة فعلًا، ثم Top picks وخطوة اختبار لكل اختيار قوي.',
    '• في الشرح ابدأ من الأساسيات ثم مثال ثم خطأ شائع ثم تطبيق.',
    '• في الخطط استخدم مراحل + مخرجات + مخاطر + نقاط مراجعة.',
    '• لا تكرر نفس الفكرة بصيغ مختلفة.',
    '• كل ادعاء حديث أو قابل للتحقق من الأدلة ضع بعده [رقم المصدر].',
    '• لا تستشهد بمصدر لا يدعم الجملة. عند التعارض رجح المصدر الأولي/الرسمي والأحدث والأكثر مباشرة واذكر عدم اليقين المهم.',
    '• لا تحاول ملء عدد مصادر مصطنع. ثمانية مصادر قوية أفضل من ثمانية عشر ضعيفة.',
    '• اجعل النتيجة مفيدة وقابلة للتنفيذ، لا تقريرًا عن عملية البحث.',
    '',
    'الأدلة:',
    evidence,
  ].join('\n');
}

function directPrompt({ prompt, mode, tool, researchFailed }) {
  return [
    `طلب المستخدم: ${prompt}`,
    `الأداة: ${tool}. المساحة: ${mode}. الهدف: ${TOOL_GOALS[tool] || TOOL_GOALS.ask}`,
    researchFailed
      ? 'تعذر البحث الخارجي مؤقتًا. استخدم المعرفة العامة المستقرة فقط ولا تدّع أن معلومة حديثة تم التحقق منها.'
      : 'لا توجد أدلة ويب مرفقة. استخدم المعرفة العامة المستقرة وعلّم أي تفاصيل متغيرة تحتاج تحققًا حديثًا.',
    'فكك المهمة داخليًا، افحص الافتراضات والتناقضات، ثم قدم النتيجة فقط دون سلسلة التفكير.',
    'نسّق الرد بعناوين قصيرة ونقاط أو جدول عند المقارنة. نفذ الطلب نفسه بدل تقديم قالب فارغ.',
  ].join('\n');
}

async function rawAiCall({ env, prompt, mode, tool, preferences, groundedResearch, reasoningEffort }) {
  const config = aiConfiguration(env);
  if (!config.configured) return null;
  const request = buildProviderRequest({
    apiMode: config.apiMode,
    model: config.model,
    prompt,
    mode,
    tool,
    preferences,
    reasoningEffort,
    groundedResearch,
  });
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(50_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = String(payload?.error?.message || payload?.message || '').slice(0, 180);
    throw new Error(`AI_PROVIDER_${response.status}${providerMessage ? `:${providerMessage}` : ''}`);
  }
  const answer = extractProviderText(payload, config.apiMode);
  if (!answer) throw new Error('AI_EMPTY_RESPONSE');
  return { answer, model: config.model };
}

async function resilientAiCall(args) {
  const config = aiConfiguration(args.env);
  const efforts = [config.reasoningEffort || 'medium', 'low', ''];
  let lastError = null;
  for (const effort of [...new Set(efforts)]) {
    try {
      return await rawAiCall({ ...args, reasoningEffort: effort });
    } catch (error) {
      lastError = error;
      console.warn(`PathPilot AI attempt (${effort || 'default'}) failed:`, error?.message || error);
      if (!/AI_PROVIDER_(400|408|429|5\d\d)|AI_EMPTY_RESPONSE/.test(String(error?.message || ''))) break;
    }
  }
  throw lastError || new Error('AI_FAILED');
}

function sourceAppendix(sources) {
  if (!sources.length) return '';
  return `\n\nالمصادر المختارة (${sources.length})\n${sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.url}`).join('\n\n')}`;
}

function bestSearchAnswer(rounds) {
  const answers = rounds.map((round) => String(round?.answer || '').trim()).filter(Boolean);
  return answers[0] || 'تم جمع مصادر مفيدة، لكن مزود البحث لم يُرجع ملخصًا نصيًا صالحًا.';
}

export function createIntelligenceHandler({ env = process.env, baseApp, database }) {
  const allowedOrigins = normalizeOriginList(env.ALLOWED_ORIGINS);
  const tavilyKey = String(env.TAVILY_API_KEY || '').trim();
  const researchAvailable = Boolean(tavilyKey);
  const synthesisAvailable = aiConfiguration(env).configured;
  const securityGuard = createSecurityGuard();
  const handleAdminExtension = database ? createAdminExtensions({ database, env, sendJson, allowedOrigins }) : null;

  return async function intelligenceHandler(request, response) {
    applySecurityHeaders(request, response);
    const origin = request.headers.origin || '';
    const url = new URL(request.url || '/', 'http://localhost');
    const path = url.pathname;

    const security = securityGuard.check(request);
    if (!security.allowed) {
      const headers = security.retryAfterSeconds ? { 'Retry-After': String(security.retryAfterSeconds) } : {};
      return sendJson(response, security.status, { error: security.error, code: security.code }, origin, allowedOrigins, headers);
    }

    if (handleAdminExtension && (path.startsWith('/api/admin/') || path.startsWith('/api/security/'))) {
      const handled = await handleAdminExtension(request, response, origin, path);
      if (handled) return;
    }

    if (path.startsWith('/api/research') && request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(origin, allowedOrigins));
      return response.end();
    }

    if (request.method === 'GET' && path === '/api/research/status') {
      return sendJson(response, 200, {
        researchAvailable,
        synthesisAvailable,
        fallbackAvailable: synthesisAvailable,
        provider: researchAvailable ? 'Tavily' : null,
        qualityFirst: true,
        idealQualitySources: IDEAL_QUALITY_SOURCES,
        maxDisplayedSources: MAX_DISPLAY_SOURCES,
        reasoningRetries: true,
        beta: true,
        appliesToAllTools: true,
      }, origin, allowedOrigins);
    }

    if (request.method === 'POST' && path === '/api/research') {
      let body;
      try { body = await readJson(request); } catch (error) {
        return sendJson(response, 400, { error: 'Invalid request body.', code: String(error?.message || 'INVALID_BODY') }, origin, allowedOrigins);
      }
      const prompt = String(body.prompt || body.query || '').trim();
      const tool = String(body.tool || 'ask').slice(0, 40);
      const mode = String(body.mode || 'general').slice(0, 30);
      const preferences = body.preferences && typeof body.preferences === 'object' ? body.preferences : {};
      if (prompt.length < 3 || prompt.length > 12_000) {
        return sendJson(response, 400, { error: 'Query length is invalid.' }, origin, allowedOrigins);
      }

      if (!researchAvailable) {
        if (synthesisAvailable) {
          try {
            const direct = await resilientAiCall({ env, prompt: directPrompt({ prompt, mode, tool, researchFailed: false }), mode, tool, preferences, groundedResearch: false });
            return sendJson(response, 200, {
              answer: `🧠 AI مباشر\nالبحث الخارجي غير متاح في هذه المحاولة، لذلك المعلومات المتغيرة زمنيًا لم يتم التحقق منها.\n\n${direct.answer}`,
              sources: [], sourceCount: 0, provider: null, synthesisProvider: 'AI', synthesisModel: direct.model,
              sourceMode: 'ai-fallback', researchFailed: false, qualityFirst: true,
            }, origin, allowedOrigins);
          } catch (error) {
            console.warn('Direct AI fallback failed:', error?.message || error);
          }
        }
        return sendJson(response, 503, { error: 'Research and AI are unavailable.', code: 'INTELLIGENCE_UNAVAILABLE' }, origin, allowedOrigins);
      }

      let primary;
      try {
        primary = await tavilySearch(tavilyKey, buildResearchQuery({ prompt, tool, mode, round: 0 }));
      } catch (searchError) {
        if (synthesisAvailable) {
          try {
            const direct = await resilientAiCall({ env, prompt: directPrompt({ prompt, mode, tool, researchFailed: true }), mode, tool, preferences, groundedResearch: false });
            return sendJson(response, 200, {
              answer: `🧠 AI احتياطي\nتعذر البحث على الويب مؤقتًا، لكن PathPilot أكمل المهمة بالذكاء الاصطناعي. أي معلومة حديثة تحتاج تحققًا لاحقًا.\n\n${direct.answer}`,
              sources: [], sourceCount: 0, provider: 'Tavily', synthesisProvider: 'AI', synthesisModel: direct.model,
              sourceMode: 'ai-fallback', researchFailed: true, qualityFirst: true,
            }, origin, allowedOrigins);
          } catch (aiError) {
            console.warn('AI fallback after research failure failed:', aiError?.message || aiError);
          }
        }
        return sendJson(response, 502, { error: 'Research failed and AI fallback could not complete.', code: String(searchError?.message || 'SEARCH_FAILED') }, origin, allowedOrigins);
      }

      let rounds = [primary];
      let sources = qualitySources(primary.results);
      if (sources.length < IDEAL_QUALITY_SOURCES) {
        const extra = await Promise.allSettled([
          tavilySearch(tavilyKey, buildResearchQuery({ prompt, tool, mode, round: 1 })),
          tavilySearch(tavilyKey, buildResearchQuery({ prompt, tool, mode, round: 2 })),
        ]);
        const successful = extra.filter((item) => item.status === 'fulfilled').map((item) => item.value);
        rounds = [primary, ...successful];
        sources = qualitySources(rounds.flatMap((round) => Array.isArray(round?.results) ? round.results : []));
      }

      let synthesis = null;
      if (synthesisAvailable && sources.length) {
        try {
          synthesis = await resilientAiCall({
            env,
            prompt: evidencePrompt({ prompt, mode, tool, sources }),
            mode,
            tool,
            preferences,
            groundedResearch: true,
          });
        } catch (error) {
          console.warn('Grounded synthesis exhausted retries:', error?.message || error);
        }
      }

      const answer = synthesis?.answer || bestSearchAnswer(rounds);
      const qualityNote = sources.length >= IDEAL_QUALITY_SOURCES
        ? `تم اختيار ${sources.length} مصادر قوية ومرتبطة من نتائج البحث بعد فلترة الجودة.`
        : `تم استخدام ${sources.length} مصادر مرتبطة متاحة. PathPilot لم يملأ العدد بمصادر ضعيفة لمجرد الوصول لرقم ثابت.`;
      const intelligenceNote = synthesis
        ? `تم تركيب الإجابة بواسطة ${synthesis.model} مع إعادة فحص الأدلة والتعارضات.`
        : 'تعذر تركيب Gemini بعد المحاولات الاحتياطية، لذلك تم استخدام أفضل ملخص بحث متاح دون الادعاء بأنه تحليل AI كامل.';

      return sendJson(response, 200, {
        answer: `🌐 PathPilot Research Beta\n${qualityNote}\n${intelligenceNote}\n\n${answer}${sourceAppendix(sources)}`,
        sources,
        sourceCount: sources.length,
        targetReached: sources.length >= IDEAL_QUALITY_SOURCES,
        provider: 'Tavily',
        synthesisProvider: synthesis ? 'AI' : 'Tavily',
        synthesisModel: synthesis?.model || null,
        sourceMode: synthesis ? 'research-ai' : 'research-search',
        researchFailed: false,
        qualityFirst: true,
      }, origin, allowedOrigins);
    }

    return baseApp.handle(request, response);
  };
}

if (process.argv[1]?.endsWith('server/intelligence-server.js')) {
  const databasePath = process.env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const database = initializeDatabase(databasePath);
  const baseApp = createPathPilotServer({ database });
  const handler = createIntelligenceHandler({ baseApp, database });
  const port = Number(process.env.PORT || 8787);
  const server = createServer(handler);
  server.requestTimeout = 110_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 5_000;
  server.listen(port, '0.0.0.0', () => console.log(`PathPilot intelligence beta listening on port ${port}`));
}
