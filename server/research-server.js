import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { createAdminExtensions } from './admin-extensions.js';
import { buildProviderRequest, extractProviderText } from './lib/ai-provider.js';
import { initializeDatabase } from './lib/database.js';
import { applySecurityHeaders, createSecurityGuard } from './lib/security.js';

const MAX_SOURCES = 18;
const MIN_TARGET_SOURCES = 16;

const TOOL_LABELS = {
  explain: 'شرح مفهوم بدقة من الأساسيات إلى التطبيق مع أمثلة وتصحيح المفاهيم الخاطئة',
  summarize: 'تلخيص المحتوى مع الحفاظ على الحقائق والأرقام والقرارات والقيود المهمة',
  plan: 'بناء خطة عملية واقعية مع مراحل واعتماديات ومخاطر ونقاط مراجعة',
  quiz: 'إنشاء اختبار يقيس الفهم والتطبيق وليس الحفظ فقط',
  flashcards: 'إنشاء بطاقات مراجعة دقيقة ومختصرة وعالية القيمة',
  research: 'بحث وتحليل متعمق مع تقييم جودة المصادر وحل التعارضات',
  email: 'كتابة بريد مهني دقيق ومخصص مع خطوة تالية واضحة',
  tasks: 'تحويل الهدف إلى مهام قابلة للتنفيذ بترتيب واعتماديات ومخرجات',
  meeting: 'تحليل الاجتماع واستخراج القرارات والمسؤوليات والمخاطر والأسئلة المفتوحة',
  cv: 'صياغة خبرة للسيرة بشكل ATS-friendly دون ادعاءات أو أرقام مختلقة',
  cover: 'صياغة خطاب تقديم يربط الخبرة الحقيقية بمتطلبات الوظيفة',
  qa: 'تحليل المشكلة كمهندس QA مع خطوات إعادة الإنتاج والأثر ونطاق الخطأ وخطة إعادة الاختبار',
  ask: 'الإجابة الدقيقة على السؤال مع حل المشكلة الحقيقية وراءه',
  rewrite: 'تحسين النص مع الحفاظ على المعنى والحقائق وعدم إضافة ادعاءات',
  brainstorm: 'توليد أفكار مختلفة فعليًا وترتيبها حسب الجدوى والتأثير والمخاطر',
  decide: 'مقارنة الخيارات بمعايير صريحة وأدلة حديثة وتوضيح المفاضلات',
  organize: 'تنظيم الوقت والمهام وفق القيود والأولويات والاعتماديات',
  content: 'إنشاء محتوى عملي ومخصص للمنصة والجمهور ومدعوم بالمعلومات الصحيحة',
};

function normalizeOriginList(value) {
  return new Set(String(value || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean));
}

function corsHeaders(origin, allowedOrigins) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
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
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function uniqueSources(results, limit = MAX_SOURCES) {
  const seen = new Set();
  const sources = [];
  for (const result of Array.isArray(results) ? results : []) {
    const domain = hostname(result?.url);
    if (!domain || seen.has(domain)) continue;
    const title = String(result?.title || domain).trim().slice(0, 220);
    const snippet = String(result?.content || '').replace(/\s+/g, ' ').trim().slice(0, 900);
    if (!title && !snippet) continue;
    seen.add(domain);
    sources.push({
      title,
      url: String(result?.url || '').trim(),
      domain,
      snippet,
      score: Number.isFinite(Number(result?.score)) ? Number(result.score) : null,
    });
    if (sources.length >= limit) break;
  }
  return sources;
}

function mergeUniqueSources(groups, limit = MAX_SOURCES) {
  return uniqueSources(groups.flatMap((group) => Array.isArray(group) ? group : []), limit);
}

function buildResearchQuery({ prompt, tool, mode, round }) {
  const cleanPrompt = String(prompt || '').replace(/\s+/g, ' ').trim().slice(0, 1100);
  const goal = TOOL_LABELS[tool] || TOOL_LABELS.ask;
  const roundInstruction = [
    'ابدأ بالمصادر الرسمية أو الأولية كلما أمكن، ثم أضف مصادر مستقلة موثوقة للتحقق.',
    'ابحث عن أدلة إضافية مستقلة ودراسات أو توثيق تقني أو بيانات رسمية، وتعمّد البحث عن معلومات قد تناقض النتيجة الأولى.',
    'نفّذ جولة تحقق نهائية من زوايا مختلفة وركز على مصادر لم تظهر سابقًا وعلى التفاصيل التي قد تكون قديمة أو محل خلاف.',
  ][Math.min(round, 2)];

  return `المهمة: ${goal}. مساحة PathPilot: ${mode || 'general'}. طلب المستخدم الأصلي: ${cleanPrompt}. ${roundInstruction} ابحث عن أدلة مرتبطة مباشرة بالطلب، ولا تهدر النتائج على صفحات مكررة أو ضعيفة الصلة.`;
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
      max_results: 20,
      include_answer: 'advanced',
      include_raw_content: false,
      include_images: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`SEARCH_PROVIDER_${response.status}`);
  return payload;
}

function sourceAppendix(sources) {
  if (!sources.length) return '';
  const lines = sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.url}`);
  return `\n\nالمصادر (${sources.length} مواقع مختلفة)\n${lines.join('\n\n')}`;
}

function fallbackSearchAnswer(rounds) {
  const answers = rounds.map((round) => String(round?.answer || '').trim()).filter(Boolean);
  if (!answers.length) return 'تم جمع المصادر، لكن مزود البحث لم يُرجع ملخصًا نصيًا قابلًا للاستخدام.';
  return answers[0];
}

function evidencePrompt({ prompt, mode, tool, sources }) {
  const evidence = sources.map((source, index) => [
    `[${index + 1}] ${source.title}`,
    `Domain: ${source.domain}`,
    `URL: ${source.url}`,
    `Evidence: ${source.snippet || 'No snippet available.'}`,
  ].join('\n')).join('\n\n');

  return [
    'أنت في مرحلة تركيب الإجابة النهائية بعد بحث ويب متعدد المصادر.',
    `طلب المستخدم الأصلي:\n${prompt}`,
    `المساحة: ${mode}. الأداة: ${tool}. الهدف: ${TOOL_LABELS[tool] || TOOL_LABELS.ask}.`,
    'قواعد التركيب:',
    '1) أجب على الطلب نفسه مباشرة وبأفضل صيغة عملية، ولا تستبدل المطلوب بقالب عام.',
    '2) في المقارنات: اختر الخيارات الجادة المرتبطة فعلا بالطلب، قارن المزايا والعيوب والمعايير، ثم رشّح الأنسب حسب أكثر من حالة استخدام.',
    '3) في العصف الذهني: قدّم نطاقًا واسعًا من الأفكار المختلفة فعليًا، ثم رتّب الأقوى واذكر طريقة اختبارها.',
    '4) استخرج الادعاءات المهمة من الأدلة، قارن بينها، وحل التعارضات بترجيح المصادر الأولية والرسمية والأحدث والأكثر مباشرة.',
    '5) لا تستخدم معلومة حديثة غير مدعومة بالأدلة أدناه. إذا كانت الأدلة غير كافية فاذكر ذلك بوضوح.',
    '6) ضع [رقم] بعد الادعاءات المهمة للإشارة للمصدر المناسب، ولا تستخدم مرجعًا لا يدعم الجملة.',
    '7) إذا كان الطلب كتابة أو CV أو Email أو خطة، قدّم الناتج المطلوب نفسه، واستخدم البحث لتحسين الدقة بدل تحويل الإجابة كلها إلى تقرير بحثي.',
    '8) راجع الإجابة قبل الإخراج بحثًا عن التناقضات، الادعاءات غير المدعومة، الأرقام غير المؤكدة، والتعميمات الزائدة.',
    '9) لا تعرض سلسلة التفكير الداخلية. اعرض فقط النتيجة، أهم أسبابها، والقيود أو نقاط عدم اليقين المفيدة.',
    '',
    'الأدلة المتاحة:',
    evidence,
  ].join('\n');
}

function directPrompt({ prompt, mode, tool, researchFailure }) {
  return [
    'أجب عن طلب المستخدم مباشرة حتى لو تعذر البحث على الويب مؤقتًا.',
    `طلب المستخدم: ${prompt}`,
    `المساحة: ${mode}. الأداة: ${tool}. الهدف: ${TOOL_LABELS[tool] || TOOL_LABELS.ask}.`,
    researchFailure
      ? 'تعذر البحث الخارجي في هذه المحاولة. استخدم معرفتك العامة فقط، ولا تدّع أن المعلومات حديثة أو متحققة من الويب.'
      : 'البحث الخارجي غير مفعّل في هذه المحاولة. استخدم معرفتك العامة فقط، وافصل أي معلومة قد تحتاج تحققًا حديثًا.',
    'لا تعطِ قالبًا فارغًا إذا كان بإمكانك تقديم محتوى مفيد فعليًا.',
    'إذا طلب المستخدم مقارنة، أعطِ مقارنة فعلية بخيارات معروفة من معرفتك، مع المزايا والعيوب ومعايير الاختيار، ووضّح أن التفاصيل المتغيرة تحتاج تحققًا حديثًا.',
    'إذا طلب أفكارًا، وسّع النطاق إلى أفكار محافظة، عملية، مبتكرة وتجريبية، ثم رتّب أفضل الخيارات.',
    'إذا طلب قرارًا، استنتج معايير افتراضية معقولة بدل إجباره على إدخالها كلها، ثم قدم توصية مشروطة واضحة.',
    'إذا طلب خطة، حوّلها إلى خطوات وترتيب ومخاطر ونقاط تحقق.',
    'لا تعرض سلسلة التفكير الداخلية. قدم النتيجة والمبررات العملية فقط.',
  ].join('\n');
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

async function callAi({ env, prompt, mode, tool, preferences, groundedResearch }) {
  const config = aiConfiguration(env);
  if (!config.configured) return null;
  const providerRequest = buildProviderRequest({
    apiMode: config.apiMode,
    model: config.model,
    prompt,
    mode,
    tool,
    preferences,
    reasoningEffort: config.reasoningEffort,
    groundedResearch,
  });
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(providerRequest),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`AI_PROVIDER_${response.status}`);
  const answer = extractProviderText(payload, config.apiMode);
  if (!answer) throw new Error('AI_EMPTY_RESPONSE');
  return { answer, model: config.model };
}

async function synthesizeAnswer({ env, prompt, mode, tool, preferences, sources }) {
  if (!sources.length) return null;
  return callAi({ env, prompt: evidencePrompt({ prompt, mode, tool, sources }), mode, tool, preferences, groundedResearch: true });
}

async function directAiAnswer({ env, prompt, mode, tool, preferences, researchFailure = false }) {
  return callAi({ env, prompt: directPrompt({ prompt, mode, tool, researchFailure }), mode, tool, preferences, groundedResearch: false });
}

export function createResearchHandler({ env = process.env, baseApp, database }) {
  const allowedOrigins = normalizeOriginList(env.ALLOWED_ORIGINS);
  const tavilyApiKey = String(env.TAVILY_API_KEY || '').trim();
  const researchAvailable = Boolean(tavilyApiKey);
  const synthesisAvailable = aiConfiguration(env).configured;
  const securityGuard = createSecurityGuard();
  const handleAdminExtension = database ? createAdminExtensions({ database, env, sendJson, allowedOrigins }) : null;

  return async function researchHandler(request, response) {
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
        targetSources: MAX_SOURCES,
        minimumTargetSources: MIN_TARGET_SOURCES,
        appliesToAllTools: true,
      }, origin, allowedOrigins);
    }

    if (request.method === 'POST' && path === '/api/research') {
      let body;
      try {
        body = await readJson(request);
      } catch (error) {
        return sendJson(response, 400, { error: 'Invalid request body.', code: String(error?.message || 'INVALID_BODY') }, origin, allowedOrigins);
      }

      const prompt = String(body.prompt || body.query || '').trim();
      const tool = String(body.tool || 'ask').slice(0, 40);
      const mode = String(body.mode || 'general').slice(0, 30);
      const preferences = body.preferences && typeof body.preferences === 'object' ? body.preferences : {};
      if (prompt.length < 3 || prompt.length > 12_000) {
        return sendJson(response, 400, { error: 'Research query length is invalid.' }, origin, allowedOrigins);
      }

      if (!researchAvailable) {
        if (synthesisAvailable) {
          try {
            const direct = await directAiAnswer({ env, prompt, mode, tool, preferences, researchFailure: false });
            return sendJson(response, 200, {
              answer: `🧠 رد AI بدون بحث ويب\nتعذر استخدام البحث الخارجي في هذه المحاولة، لذلك لم يتم التحقق من حداثة المعلومات.\n\n${direct.answer}`,
              sources: [], sourceCount: 0, targetReached: false, provider: null,
              synthesisProvider: 'AI', synthesisModel: direct.model,
              sourceMode: 'ai-fallback', researchFailed: false,
            }, origin, allowedOrigins);
          } catch (error) {
            console.warn('PathPilot direct AI fallback failed:', error?.message || error);
          }
        }
        return sendJson(response, 503, { error: 'Web research is not configured and the AI fallback is unavailable.', code: 'RESEARCH_NOT_CONFIGURED' }, origin, allowedOrigins);
      }

      try {
        let primary;
        try {
          primary = await tavilySearch(tavilyApiKey, buildResearchQuery({ prompt, tool, mode, round: 0 }));
        } catch (searchError) {
          console.warn('PathPilot primary research failed:', searchError?.message || searchError);
          if (synthesisAvailable) {
            try {
              const direct = await directAiAnswer({ env, prompt, mode, tool, preferences, researchFailure: true });
              return sendJson(response, 200, {
                answer: `🧠 رد AI احتياطي\nتعذر البحث على الويب مؤقتًا، لكن PathPilot أكمل الإجابة باستخدام نموذج AI. المعلومات المتغيرة زمنيًا تحتاج تحققًا لاحقًا.\n\n${direct.answer}`,
                sources: [], sourceCount: 0, targetReached: false, provider: 'Tavily',
                synthesisProvider: 'AI', synthesisModel: direct.model,
                sourceMode: 'ai-fallback', researchFailed: true,
              }, origin, allowedOrigins);
            } catch (aiError) {
              console.warn('PathPilot AI fallback after search failure failed:', aiError?.message || aiError);
            }
          }
          throw searchError;
        }

        let rounds = [primary];
        let sources = uniqueSources(primary.results);
        if (sources.length < MIN_TARGET_SOURCES) {
          const supplemental = await Promise.allSettled([
            tavilySearch(tavilyApiKey, buildResearchQuery({ prompt, tool, mode, round: 1 })),
            tavilySearch(tavilyApiKey, buildResearchQuery({ prompt, tool, mode, round: 2 })),
          ]);
          const successful = supplemental.filter((item) => item.status === 'fulfilled').map((item) => item.value);
          rounds = [primary, ...successful];
          sources = mergeUniqueSources(rounds.map((item) => item.results));
        }

        let synthesis = null;
        try {
          synthesis = await synthesizeAnswer({ env, prompt, mode, tool, preferences, sources });
        } catch (error) {
          console.warn('PathPilot research synthesis fallback:', error?.message || error);
        }

        const baseAnswer = synthesis?.answer || fallbackSearchAnswer(rounds);
        const verificationNote = sources.length >= MIN_TARGET_SOURCES
          ? `تمت مراجعة ${sources.length} موقعًا/دومينًا مختلفًا قبل تكوين النتيجة.`
          : `تمت مراجعة ${sources.length} مواقع مختلفة مناسبة ومتاحة لهذا الطلب. لم تتوفر ${MIN_TARGET_SOURCES} مصادر مستقلة مناسبة، لذلك لا يدّعي PathPilot أنه حقق العدد المستهدف.`;
        const intelligenceNote = synthesis
          ? `تم تحليل الأدلة وتركيب الإجابة بواسطة نموذج AI (${synthesis.model}) بعد البحث.`
          : 'تم استخدام ملخص البحث مباشرة لأن طبقة AI synthesis لم تُكمل هذه المحاولة.';

        return sendJson(response, 200, {
          answer: `🌐 نتيجة مدعومة ببحث ويب\n${verificationNote}\n${intelligenceNote}\n\n${baseAnswer}${sourceAppendix(sources)}`,
          sources,
          sourceCount: sources.length,
          targetReached: sources.length >= MIN_TARGET_SOURCES,
          provider: 'Tavily',
          synthesisProvider: synthesis ? 'AI' : 'Tavily',
          synthesisModel: synthesis?.model || null,
          sourceMode: synthesis ? 'research-ai' : 'research-search',
          researchFailed: false,
        }, origin, allowedOrigins);
      } catch (error) {
        return sendJson(response, 502, {
          error: 'Live research and AI fallback could not be completed right now.',
          code: String(error?.message || 'SEARCH_FAILED').slice(0, 100),
        }, origin, allowedOrigins);
      }
    }

    return baseApp.handle(request, response);
  };
}

if (process.argv[1]?.endsWith('server/research-server.js')) {
  const databasePath = process.env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const database = initializeDatabase(databasePath);
  const baseApp = createPathPilotServer({ database });
  const handler = createResearchHandler({ baseApp, database });
  const port = Number(process.env.PORT || 8787);
  const server = createServer(handler);
  server.requestTimeout = 90_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.listen(port, '0.0.0.0', () => console.log(`PathPilot research platform listening on port ${port}`));
}
