import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPathPilotServer } from './index.js';
import { createAdminExtensions } from './admin-extensions.js';
import { buildProviderRequest, buildSystemPrompt, extractProviderText } from './lib/ai-provider.js';
import { initializeDatabase } from './lib/database.js';
import { applySecurityHeaders, createSecurityGuard } from './lib/security.js';

const SEARCH_TIMEOUT = 12_000;
const NATIVE_AI_TIMEOUT = 24_000;
const COMPAT_AI_TIMEOUT = 16_000;
const REQUEST_BUDGET = 58_000;
const MAX_SOURCES = 8;
const IDEAL_SOURCES = 5;

const TOOL_GOALS = {
  explain: 'شرح واضح من الأساسيات إلى التطبيق', summarize: 'تلخيص دقيق بلا فقدان النقاط المهمة',
  plan: 'خطة عملية مرتبة', quiz: 'اختبار فهم وتطبيق', flashcards: 'بطاقات مراجعة واضحة',
  research: 'بحث وتحليل الأدلة', email: 'بريد مهني جاهز', tasks: 'مهام مرتبة قابلة للتنفيذ',
  meeting: 'قرارات ومسؤوليات ومخاطر', cv: 'صياغة ATS بلا ادعاءات', cover: 'خطاب تقديم مخصص',
  qa: 'تحليل QA عملي', ask: 'إجابة مباشرة تنفذ المطلوب', rewrite: 'تحسين النص دون تغيير الحقائق',
  brainstorm: 'أفكار متنوعة ثم أفضل الاختيارات', decide: 'مقارنة ثم توصية', organize: 'تنظيم واقعي',
  content: 'محتوى مناسب للجمهور والمنصة',
};

const PENALIZED = ['facebook.com','instagram.com','tiktok.com','quora.com','pinterest.com','x.com','twitter.com','medium.com','reddit.com','wordpress.com','blogspot.com'];
const AUTHORITY = ['.gov','.edu','.ac.','docs.','developer.','support.','help.','github.com','mozilla.org','w3.org','microsoft.com','google.com','openai.com','apple.com','coursera.org','edx.org','freecodecamp.org','codecademy.com','theodinproject.com','khanacademy.org','code.org'];

function origins(value) { return new Set(String(value || 'http://localhost:5173').split(',').map((v) => v.trim()).filter(Boolean)); }
function cors(origin, allowed) { return { 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, Authorization', ...(origin && allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), Vary:'Origin' }; }
function sendJson(res, status, body, origin, allowed, extra={}) { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', ...cors(origin, allowed), ...extra }); res.end(JSON.stringify(body)); }
async function readJson(req) { let body=''; for await (const chunk of req) { body += chunk; if (body.length > 128000) throw new Error('REQUEST_TOO_LARGE'); } return JSON.parse(body || '{}'); }
function host(url) { try { return new URL(url).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; } }
function quality(result) {
  const domain = host(result?.url); if (!domain) return -100;
  const provider = Number.isFinite(Number(result?.score)) ? Number(result.score) : 0.3;
  const text = `${result?.title || ''} ${result?.content || ''}`.toLowerCase();
  let score = provider * 5;
  if (AUTHORITY.some((x) => domain.includes(x))) score += 3;
  if (PENALIZED.some((x) => domain === x || domain.endsWith(`.${x}`))) score -= 4;
  if (/official|documentation|docs|research|study|report|manual|رسمي|توثيق|دراسة|جامعة/i.test(text)) score += 0.7;
  if (/(201[0-9]|2020|2021)/.test(text)) score -= 1;
  return score;
}
function selectSources(results) {
  const best = new Map();
  for (const r of Array.isArray(results) ? results : []) {
    const domain = host(r?.url); if (!domain) continue;
    const item = { title:String(r?.title || domain).trim().slice(0,220), url:String(r?.url || '').trim(), domain, snippet:String(r?.content || '').replace(/\s+/g,' ').trim().slice(0,520), quality:quality(r) };
    if (!item.snippet && !item.title) continue;
    const prev = best.get(domain); if (!prev || item.quality > prev.quality) best.set(domain, item);
  }
  const ranked = [...best.values()].sort((a,b) => b.quality - a.quality);
  const strong = ranked.filter((x) => x.quality >= 2);
  return (strong.length >= 3 ? strong : ranked).slice(0, MAX_SOURCES);
}
function query(prompt, tool, round=0) {
  const instruction = round === 0
    ? 'ابدأ بالمصادر الرسمية والأولية المباشرة، ثم مصدر مستقل قوي. تجنب مقالات التجميع إن وجد مصدر رسمي.'
    : 'سد فقط الفجوات المهمة بمصادر رسمية أو أكاديمية أو توثيق مباشر. لا تكرر النتائج ولا تستخدم شبكات اجتماعية.';
  return `طلب المستخدم: ${String(prompt).slice(0,1200)}. الهدف: ${TOOL_GOALS[tool] || TOOL_GOALS.ask}. ${instruction} الجودة أهم من العدد.`;
}
async function tavily(key, q) {
  const res = await fetch('https://api.tavily.com/search', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ api_key:key, query:q, search_depth:'advanced', topic:'general', max_results:16, include_answer:'advanced', include_raw_content:false, include_images:false }), signal:AbortSignal.timeout(SEARCH_TIMEOUT) });
  const payload = await res.json().catch(() => ({})); if (!res.ok) throw new Error(`SEARCH_${res.status}`); return payload;
}
function aiConfig(env) {
  const apiKey = String(env.AI_API_KEY || '').trim(), model = String(env.AI_MODEL || '').trim();
  const baseUrl = String(env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/,'');
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const endpoint = String(env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`);
  return { apiKey, model, baseUrl, apiMode, endpoint, reasoning:String(env.AI_REASONING_EFFORT || '').trim(), configured:Boolean(apiKey && model) };
}
function evidencePrompt({prompt,tool,mode,sources}) {
  const evidence = sources.map((s,i) => `[${i+1}] ${s.title}\n${s.domain}\n${s.url}\n${s.snippet}`).join('\n\n');
  return [`طلب المستخدم: ${prompt}`, `الهدف: ${TOOL_GOALS[tool] || TOOL_GOALS.ask}. المساحة: ${mode}.`, 'حلل الأدلة داخليًا ثم قدم النتيجة فقط.', 'ابدأ بخلاصة مباشرة. استخدم عناوين قصيرة ونقاط. في المقارنات استخدم جدول Markdown صغير ثم مزايا وعيوب ثم توصية حسب الاستخدام.', 'رجح المصدر الرسمي أو الأولي والأحدث والأكثر مباشرة. ضع [رقم] بعد الادعاءات المدعومة. لا تكرر الأفكار.', 'اجعل الرد عمليًا ومنسقًا، لا تشرح عملية البحث.', '', 'الأدلة:', evidence].join('\n');
}
function directPrompt({prompt,tool,mode}) { return `${prompt}\n\nنفذ الطلب مباشرة كـ${TOOL_GOALS[tool] || TOOL_GOALS.ask} في مساحة ${mode}. نسق بعناوين ونقاط أو جدول عند الحاجة. لا تدع أن معلومات حديثة تم التحقق منها إذا لم يوجد بحث.`; }
async function nativeGemini({env,prompt,mode,tool,preferences,grounded}) {
  const c=aiConfig(env); if (!c.configured || !c.baseUrl.includes('generativelanguage.googleapis.com')) return null;
  const system=buildSystemPrompt({mode,tool,preferences,groundedResearch:grounded});
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent`;
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':c.apiKey},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:grounded?0.2:0.4,maxOutputTokens:2500}}),signal:AbortSignal.timeout(NATIVE_AI_TIMEOUT)});
  const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(`GEMINI_${res.status}:${String(payload?.error?.message || '').slice(0,120)}`);
  const answer=payload?.candidates?.[0]?.content?.parts?.map((p)=>p.text||'').join('\n').trim(); if(!answer) throw new Error('GEMINI_EMPTY');
  return {answer,model:c.model,path:'native'};
}
async function compatible({env,prompt,mode,tool,preferences,grounded}) {
  const c=aiConfig(env); if(!c.configured) return null;
  const request=buildProviderRequest({apiMode:c.apiMode,model:c.model,prompt,mode,tool,preferences,reasoningEffort:'low',groundedResearch:grounded});
  const res=await fetch(c.endpoint,{method:'POST',headers:{Authorization:`Bearer ${c.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(COMPAT_AI_TIMEOUT)});
  const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error(`AI_${res.status}`);
  const answer=extractProviderText(payload,c.apiMode); if(!answer) throw new Error('AI_EMPTY'); return {answer,model:c.model,path:'compatible'};
}
async function fastAi(args) {
  try { const native=await nativeGemini(args); if(native) return native; } catch(e) { console.warn('Fast native Gemini failed:',e?.message||e); }
  try { return await compatible(args); } catch(e) { console.warn('Fast compatible AI failed:',e?.message||e); throw e; }
}
function appendix(sources) { return sources.length ? `\n\nالمصادر المختارة (${sources.length})\n${sources.map((s,i)=>`[${i+1}] ${s.title}\n${s.url}`).join('\n\n')}` : ''; }
function bestSearch(rounds) { return rounds.map((r)=>String(r?.answer||'').trim()).find(Boolean) || 'تم جمع مصادر مرتبطة، لكن مزود البحث لم يرجع ملخصًا نصيًا صالحًا.'; }

export function createIntelligenceV3Handler({env=process.env,baseApp,database}) {
  const allowed=origins(env.ALLOWED_ORIGINS), tavilyKey=String(env.TAVILY_API_KEY||'').trim();
  const researchAvailable=Boolean(tavilyKey), synthesisAvailable=aiConfig(env).configured;
  const guard=createSecurityGuard(), admin=database?createAdminExtensions({database,env,sendJson,allowedOrigins:allowed}):null;
  return async function handler(req,res) {
    applySecurityHeaders(req,res); const origin=req.headers.origin||'', url=new URL(req.url||'/','http://localhost'), path=url.pathname;
    const security=guard.check(req); if(!security.allowed) return sendJson(res,security.status,{error:security.error,code:security.code},origin,allowed,security.retryAfterSeconds?{'Retry-After':String(security.retryAfterSeconds)}:{});
    if(admin&&(path.startsWith('/api/admin/')||path.startsWith('/api/security/'))){const handled=await admin(req,res,origin,path);if(handled)return;}
    if(path.startsWith('/api/research')&&req.method==='OPTIONS'){res.writeHead(204,cors(origin,allowed));return res.end();}
    if(req.method==='GET'&&path==='/api/research/status') return sendJson(res,200,{researchAvailable,synthesisAvailable,fallbackAvailable:synthesisAvailable,provider:researchAvailable?'Tavily':null,qualityFirst:true,idealQualitySources:IDEAL_SOURCES,maxDisplayedSources:MAX_SOURCES,nativeGeminiPreferred:aiConfig(env).baseUrl.includes('generativelanguage.googleapis.com'),latencyBudgetMs:REQUEST_BUDGET,beta:true,appliesToAllTools:true},origin,allowed);
    if(req.method!=='POST'||path!=='/api/research') return baseApp.handle(req,res);
    let body; try{body=await readJson(req);}catch(e){return sendJson(res,400,{error:'Invalid request.',code:String(e?.message||'INVALID')},origin,allowed);}
    const prompt=String(body.prompt||body.query||'').trim(),tool=String(body.tool||'ask').slice(0,40),mode=String(body.mode||'general').slice(0,30),preferences=body.preferences&&typeof body.preferences==='object'?body.preferences:{};
    if(prompt.length<3||prompt.length>12000)return sendJson(res,400,{error:'Query length is invalid.'},origin,allowed);
    const started=Date.now();
    if(!researchAvailable){try{if(synthesisAvailable){const ai=await fastAi({env,prompt:directPrompt({prompt,tool,mode}),mode,tool,preferences,grounded:false});return sendJson(res,200,{answer:`🧠 PathPilot AI Beta\n\n${ai.answer}`,sources:[],sourceCount:0,sourceMode:'ai-fallback',synthesisModel:ai.model,synthesisPath:ai.path,researchFailed:false},origin,allowed);}}catch(e){console.warn('AI-only failed:',e?.message||e);}return sendJson(res,503,{error:'Research and AI are unavailable.'},origin,allowed);}
    try{
      const primary=await tavily(tavilyKey,query(prompt,tool,0)); let rounds=[primary],sources=selectSources(primary.results);
      if(sources.length<IDEAL_SOURCES&&Date.now()-started<18000){try{const extra=await tavily(tavilyKey,query(prompt,tool,1));rounds.push(extra);sources=selectSources(rounds.flatMap((r)=>Array.isArray(r?.results)?r.results:[]));}catch(e){console.warn('Supplemental search skipped:',e?.message||e);}}
      let synthesis=null;
      if(synthesisAvailable&&sources.length&&Date.now()-started<30000){try{synthesis=await fastAi({env,prompt:evidencePrompt({prompt,tool,mode,sources}),mode,tool,preferences,grounded:true});}catch(e){console.warn('Fast synthesis failed:',e?.message||e);}}
      const answer=synthesis?.answer||bestSearch(rounds); const note=synthesis?`تم تحليل ${sources.length} مصادر مختارة بواسطة ${synthesis.model}.`:`تم اختيار ${sources.length} مصادر قوية. تعذر إكمال تركيب AI ضمن ميزانية السرعة، فتم استخدام أفضل ملخص بحث متاح.`;
      return sendJson(res,200,{answer:`🌐 PathPilot Research Beta\n${note}\n\n${answer}${appendix(sources)}`,sources,sourceCount:sources.length,targetReached:sources.length>=IDEAL_SOURCES,provider:'Tavily',synthesisProvider:synthesis?'AI':'Tavily',synthesisModel:synthesis?.model||null,synthesisPath:synthesis?.path||null,sourceMode:synthesis?'research-ai':'research-search',researchFailed:false,qualityFirst:true,durationMs:Date.now()-started},origin,allowed);
    }catch(searchError){
      if(synthesisAvailable&&Date.now()-started<35000){try{const ai=await fastAi({env,prompt:directPrompt({prompt,tool,mode}),mode,tool,preferences,grounded:false});return sendJson(res,200,{answer:`🧠 PathPilot AI fallback Beta\nتعذر البحث مؤقتًا، لكن الذكاء أكمل المهمة.\n\n${ai.answer}`,sources:[],sourceCount:0,sourceMode:'ai-fallback',synthesisModel:ai.model,synthesisPath:ai.path,researchFailed:true,durationMs:Date.now()-started},origin,allowed);}catch(e){console.warn('Fallback AI failed:',e?.message||e);}}
      return sendJson(res,502,{error:'Research and AI fallback failed.',code:String(searchError?.message||'FAILED').slice(0,120)},origin,allowed);
    }
  };
}

if(process.argv[1]?.endsWith('server/intelligence-v3-server.js')){
  const databasePath=process.env.DATABASE_PATH||'server/data/pathpilot.sqlite'; if(databasePath!==':memory:')mkdirSync(dirname(databasePath),{recursive:true});
  const database=initializeDatabase(databasePath),baseApp=createPathPilotServer({database}),handler=createIntelligenceV3Handler({baseApp,database}),port=Number(process.env.PORT||8787);
  const server=createServer(handler); server.requestTimeout=65_000; server.headersTimeout=15_000; server.keepAliveTimeout=5_000; server.listen(port,'0.0.0.0',()=>console.log(`PathPilot intelligence v3 beta listening on port ${port}`));
}
