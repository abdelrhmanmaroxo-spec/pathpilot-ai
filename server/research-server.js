import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { initializeDatabase } from './lib/database.js';

const MAX_SOURCES = 18;
const MIN_TARGET_SOURCES = 16;
const MAX_SEARCH_ROUNDS = 3;

const TOOL_LABELS = {
  explain: 'شرح مفهوم بدقة وبأمثلة',
  summarize: 'تلخيص وتحقيق أهم النقاط',
  plan: 'بناء خطة عملية واقعية',
  quiz: 'إنشاء أسئلة مراجعة دقيقة',
  flashcards: 'إنشاء بطاقات مراجعة صحيحة',
  research: 'بحث وتحليل متعمق',
  email: 'كتابة بريد مهني مع معلومات صحيحة',
  tasks: 'تحويل الطلب إلى مهام عملية',
  meeting: 'تحليل وترتيب معلومات الاجتماع',
  cv: 'صياغة خبرة للسيرة دون ادعاءات غير موثقة',
  cover: 'صياغة خطاب تقديم مخصص',
  qa: 'تحليل مشكلة وكتابة تقرير جودة',
  ask: 'الإجابة الدقيقة على السؤال',
  rewrite: 'تحسين النص مع الحفاظ على الحقائق',
  brainstorm: 'توليد أفكار مدعومة باتجاهات وأمثلة حقيقية',
  decide: 'مقارنة الخيارات بأدلة حديثة',
  organize: 'تنظيم خطة واقعية بناءً على الطلب',
  content: 'إنشاء محتوى عملي ومخصص للمنصة والجمهور',
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
    Vary: 'Origin',
  };
}

function sendJson(response, status, body, origin, allowedOrigins) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...corsHeaders(origin, allowedOrigins),
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error('REQUEST_TOO_LARGE');
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
    seen.add(domain);
    sources.push({
      title: String(result?.title || domain).trim().slice(0, 220),
      url: String(result?.url || '').trim(),
      domain,
      snippet: String(result?.content || '').replace(/\s+/g, ' ').trim().slice(0, 700),
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
  const cleanPrompt = String(prompt || '').replace(/\s+/g, ' ').trim().slice(0, 900);
  const goal = TOOL_LABELS[tool] || 'الإجابة على الطلب بدقة';
  const roundInstruction = [
    'اعتمد على مصادر موثوقة وحديثة ومتنوعة، ووازن بين المصادر الرسمية والمستقلة.',
    'ابحث عن مصادر إضافية مستقلة، بيانات رسمية، دراسات، أدلة عملية، وآراء مخالفة إن وجدت.',
    'راجع الادعاءات الأساسية من زوايا مختلفة وابحث عن مصادر لم تظهر في الجولات السابقة.',
  ][Math.min(round, 2)];

  return `المهمة: ${goal}. مساحة PathPilot: ${mode || 'general'}. طلب المستخدم الأصلي: ${cleanPrompt}. ${roundInstruction} أجب على الطلب نفسه مباشرة وبشكل عملي، ولا تكتفِ بوصف عملية البحث. إذا كان الطلب كتابة أو تخطيطًا، استخدم البحث لتحسين الناتج ثم قدّم الناتج المطلوب نفسه.`;
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
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`SEARCH_PROVIDER_${response.status}`);
  return payload;
}

function sourceAppendix(sources) {
  if (!sources.length) return '';
  const lines = sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.url}`);
  return `\n\nالمصادر التي تم فحصها (${sources.length} موقعًا مختلفًا)\n${lines.join('\n\n')}`;
}

function combineAnswers(rounds) {
  const answers = rounds
    .map((round) => String(round?.answer || '').trim())
    .filter(Boolean);
  if (!answers.length) return 'تم جمع المصادر، لكن مزود البحث لم يُرجع ملخصًا نصيًا.';
  if (answers.length === 1) return answers[0];
  return `${answers[0]}\n\nمراجعة تحقق إضافية\n${answers.slice(1).join('\n\n')}`;
}

export function createResearchHandler({ env = process.env, baseApp }) {
  const allowedOrigins = normalizeOriginList(env.ALLOWED_ORIGINS);
  const tavilyApiKey = String(env.TAVILY_API_KEY || '').trim();
  const researchAvailable = Boolean(tavilyApiKey);

  return async function researchHandler(request, response) {
    const origin = request.headers.origin || '';
    const url = new URL(request.url || '/', 'http://localhost');
    const path = url.pathname;

    if (path.startsWith('/api/research') && request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(origin, allowedOrigins));
      return response.end();
    }

    if (request.method === 'GET' && path === '/api/research/status') {
      return sendJson(response, 200, {
        researchAvailable,
        provider: researchAvailable ? 'Tavily' : null,
        targetSources: MAX_SOURCES,
        minimumTargetSources: MIN_TARGET_SOURCES,
        appliesToAllTools: true,
      }, origin, allowedOrigins);
    }

    if (request.method === 'POST' && path === '/api/research') {
      if (!researchAvailable) {
        return sendJson(response, 503, {
          error: 'Web research is not configured yet.',
          code: 'RESEARCH_NOT_CONFIGURED',
        }, origin, allowedOrigins);
      }

      try {
        const body = await readJson(request);
        const prompt = String(body.prompt || body.query || '').trim();
        const tool = String(body.tool || 'ask').slice(0, 40);
        const mode = String(body.mode || 'general').slice(0, 30);
        if (prompt.length < 3 || prompt.length > 12_000) {
          return sendJson(response, 400, { error: 'Research query length is invalid.' }, origin, allowedOrigins);
        }

        const rounds = [];
        let sources = [];
        for (let round = 0; round < MAX_SEARCH_ROUNDS; round += 1) {
          const result = await tavilySearch(tavilyApiKey, buildResearchQuery({ prompt, tool, mode, round }));
          rounds.push(result);
          sources = mergeUniqueSources(rounds.map((item) => item.results));
          if (sources.length >= MIN_TARGET_SOURCES) break;
        }

        const answer = combineAnswers(rounds);
        const verificationNote = sources.length >= MIN_TARGET_SOURCES
          ? `تمت مراجعة ${sources.length} موقعًا/دومينًا مختلفًا قبل تكوين النتيجة.`
          : `تمت مراجعة ${sources.length} مواقع مختلفة متاحة لهذا الطلب. لم تتوفر 16 مصادر مستقلة مناسبة، لذلك لا يدّعي PathPilot أنه حقق العدد المستهدف.`;

        return sendJson(response, 200, {
          answer: `🌐 نتيجة مدعومة ببحث ويب\n${verificationNote}\n\n${answer}${sourceAppendix(sources)}`,
          sources,
          sourceCount: sources.length,
          targetReached: sources.length >= MIN_TARGET_SOURCES,
          provider: 'Tavily',
        }, origin, allowedOrigins);
      } catch (error) {
        return sendJson(response, 502, {
          error: 'Web research could not be completed right now.',
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
  const baseApp = createPathPilotServer({ database: initializeDatabase(databasePath) });
  const handler = createResearchHandler({ baseApp });
  const port = Number(process.env.PORT || 8787);
  createServer(handler).listen(port, () => console.log(`PathPilot research platform listening on port ${port}`));
}
