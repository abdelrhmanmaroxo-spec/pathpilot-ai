import { needsFreshResearch } from './smart-router.js';

export const CHAT_AGENT_ORCHESTRATOR_VERSION = 'agent-v1';

export const CHAT_AGENT_TOOLS = Object.freeze([
  { id: 'context_memory', label: 'Context memory', stage: 'understand' },
  { id: 'intent_classifier', label: 'Intent analysis', stage: 'understand' },
  { id: 'constraint_extractor', label: 'Constraint check', stage: 'understand' },
  { id: 'topic_linker', label: 'Topic linking', stage: 'understand' },
  { id: 'language_detector', label: 'Language detection', stage: 'understand' },
  { id: 'safety_guard', label: 'Safety guard', stage: 'understand' },
  { id: 'freshness_detector', label: 'Freshness check', stage: 'research' },
  { id: 'query_expander', label: 'Query expansion', stage: 'research' },
  { id: 'web_search', label: 'Web search', stage: 'research' },
  { id: 'source_ranker', label: 'Source ranking', stage: 'research' },
  { id: 'source_crosscheck', label: 'Source cross-check', stage: 'research' },
  { id: 'citation_guard', label: 'Citation check', stage: 'research' },
  { id: 'rag_retriever', label: 'Expert RAG', stage: 'knowledge' },
  { id: 'rag_reranker', label: 'RAG reranking', stage: 'knowledge' },
  { id: 'knowledge_deduplicator', label: 'Knowledge deduplication', stage: 'knowledge' },
  { id: 'context_budgeter', label: 'Context budget', stage: 'knowledge' },
  { id: 'domain_router', label: 'Domain routing', stage: 'knowledge' },
  { id: 'deep_analyzer', label: 'Deep analysis', stage: 'reason' },
  { id: 'assumption_checker', label: 'Assumption check', stage: 'reason' },
  { id: 'contradiction_checker', label: 'Contradiction check', stage: 'reason' },
  { id: 'tradeoff_analyzer', label: 'Trade-off analysis', stage: 'reason' },
  { id: 'failure_mode_analyzer', label: 'Failure-mode analysis', stage: 'reason' },
  { id: 'claim_verifier', label: 'Claim verification', stage: 'reason' },
  { id: 'risk_analyzer', label: 'Risk analysis', stage: 'reason' },
  { id: 'comparison_engine', label: 'Comparison engine', stage: 'reason' },
  { id: 'planner', label: 'Planning engine', stage: 'reason' },
  { id: 'dependency_mapper', label: 'Dependency mapping', stage: 'reason' },
  { id: 'code_analyzer', label: 'Code analysis', stage: 'specialist' },
  { id: 'security_reviewer', label: 'Security review', stage: 'specialist' },
  { id: 'test_planner', label: 'Test planning', stage: 'specialist' },
  { id: 'qa_reviewer', label: 'QA review', stage: 'specialist' },
  { id: 'numeric_sanity_check', label: 'Numeric sanity check', stage: 'specialist' },
  { id: 'answer_editor', label: 'Answer editor', stage: 'finalize' },
  { id: 'confidence_estimator', label: 'Confidence estimate', stage: 'finalize' },
  { id: 'answer_reviewer', label: 'Answer review', stage: 'finalize' },
  { id: 'final_quality_gate', label: 'Final quality gate', stage: 'finalize' },
  { id: 'model_router', label: 'Model routing', stage: 'runtime' },
  { id: 'local_llm', label: 'Local LLM', stage: 'runtime' },
  { id: 'provider_fallback', label: 'Provider fallback', stage: 'runtime' },
  { id: 'voice_dictation', label: 'Voice dictation', stage: 'input' },
]);

const TOOL_BY_ID = new Map(CHAT_AGENT_TOOLS.map((tool) => [tool.id, tool]));

const CODE_PATTERN = /\b(code|bug|debug|javascript|typescript|react|node|python|api|sql|database|css|html|oauth|jwt|backend|frontend|server|deploy|docker|linux|windows|macos)\b|(?:كود|برمج|باك.?اند|فرونت.?اند|قاعدة بيانات|داتا.?بيس|سيرفر|نشر|لينكس|ويندوز|ماك)/i;
const SECURITY_PATTERN = /\b(security|secure|auth|oauth|jwt|token|password|permission|access control|xss|csrf|sql injection|vulnerability)\b|(?:أمان|امن|تأمين|صلاحيات|تسجيل دخول|كلمة مرور|توكن|ثغرة)/i;
const PLANNING_PATTERN = /\b(plan|roadmap|steps|schedule|milestone|dependency|launch|project)\b|(?:خطة|خطوات|جدول|مراحل|اعتماديات|مشروع|اطلاق|إطلاق)/i;
const COMPARISON_PATTERN = /\b(compare|versus|vs\.?|better|choose|decision|trade.?off)\b|(?:قارن|مقارنة|أفضل|افضل|اختار|أختار|قرار|مفاضلة)/i;
const ANALYSIS_PATTERN = /\b(analyze|analysis|diagnose|reason|why|root cause|investigate|evaluate)\b|(?:حلل|تحليل|شخص|شخّص|سبب|ليه|قيّم|قيم|افحص)/i;
const NUMERIC_PATTERN = /(?:\d+[\d,.]*\s*(?:%|egp|usd|eur|gbp|جنيه|دولار)?)|\b(calculate|calculation|estimate|ratio|percentage|average)\b|(?:احسب|حساب|نسبة|متوسط|تقدير)/i;
const WRITING_PATTERN = /\b(write|rewrite|email|message|cv|resume|cover letter|post|caption|script)\b|(?:اكتب|صياغة|رسالة|ايميل|إيميل|سيرة|بوست|كابشن|سكريبت)/i;

function add(set, ...ids) {
  for (const id of ids) if (TOOL_BY_ID.has(id)) set.add(id);
}

function detectIntent(text) {
  if (COMPARISON_PATTERN.test(text)) return 'compare';
  if (PLANNING_PATTERN.test(text)) return 'plan';
  if (CODE_PATTERN.test(text)) return 'technical';
  if (WRITING_PATTERN.test(text)) return 'write';
  if (ANALYSIS_PATTERN.test(text)) return 'analyze';
  return 'answer';
}

function detectDomain(text) {
  if (SECURITY_PATTERN.test(text)) return 'security';
  if (CODE_PATTERN.test(text)) return 'software';
  if (/\b(ai|llm|rag|model|prompt|embedding|inference)\b|(?:ذكاء اصطناعي|موديل|برومبت|نموذج لغوي)/i.test(text)) return 'ai';
  if (/\b(cv|resume|job|interview|career|recruiter)\b|(?:وظيفة|شغل|سيرة|مقابلة|توظيف)/i.test(text)) return 'career';
  return 'general';
}

function riskLevel(text) {
  if (/\b(medical|diagnosis|legal|tax|investment|financial advice)\b|(?:طبي|تشخيص|قانوني|ضريبة|استثمار|نصيحة مالية)/i.test(text)) return 'high';
  if (SECURITY_PATTERN.test(text) || CODE_PATTERN.test(text)) return 'medium';
  return 'normal';
}

export function planChatAgent({ prompt = '', forceResearch = false, deepThink = false, voiceInput = false } = {}) {
  const text = String(prompt || '').trim();
  const selected = new Set();
  const fresh = forceResearch || needsFreshResearch(text, 'ask');
  const intent = detectIntent(text);
  const domain = detectDomain(text);
  const risk = riskLevel(text);

  add(selected,
    'context_memory', 'intent_classifier', 'constraint_extractor', 'topic_linker',
    'language_detector', 'safety_guard', 'rag_retriever', 'rag_reranker',
    'knowledge_deduplicator', 'context_budgeter', 'domain_router',
    'confidence_estimator', 'final_quality_gate', 'model_router', 'local_llm', 'provider_fallback',
  );

  if (fresh) add(selected, 'freshness_detector', 'query_expander', 'web_search', 'source_ranker', 'source_crosscheck', 'citation_guard', 'claim_verifier');
  if (deepThink || ANALYSIS_PATTERN.test(text)) add(selected, 'deep_analyzer', 'assumption_checker', 'contradiction_checker', 'tradeoff_analyzer', 'failure_mode_analyzer', 'claim_verifier', 'risk_analyzer', 'answer_reviewer');
  if (CODE_PATTERN.test(text)) add(selected, 'code_analyzer', 'test_planner', 'qa_reviewer');
  if (SECURITY_PATTERN.test(text)) add(selected, 'security_reviewer', 'failure_mode_analyzer', 'risk_analyzer');
  if (PLANNING_PATTERN.test(text)) add(selected, 'planner', 'dependency_mapper', 'risk_analyzer');
  if (COMPARISON_PATTERN.test(text)) add(selected, 'comparison_engine', 'tradeoff_analyzer', 'assumption_checker');
  if (NUMERIC_PATTERN.test(text)) add(selected, 'numeric_sanity_check');
  if (WRITING_PATTERN.test(text)) add(selected, 'answer_editor');
  if (voiceInput) add(selected, 'voice_dictation');

  const toolIds = [...selected];
  return {
    version: CHAT_AGENT_ORCHESTRATOR_VERSION,
    intent,
    domain,
    risk,
    forceResearch: fresh,
    deepReview: deepThink || risk === 'high' || ANALYSIS_PATTERN.test(text),
    toolIds,
    tools: toolIds.map((id) => TOOL_BY_ID.get(id)),
  };
}

export function agentPlanGuidance(plan) {
  if (!plan?.toolIds?.length) return '';
  const ids = plan.toolIds.join(', ');
  return [
    `Chat agent orchestration: ${plan.version || CHAT_AGENT_ORCHESTRATOR_VERSION}.`,
    `Detected intent: ${plan.intent || 'answer'}. Domain: ${plan.domain || 'general'}. Risk: ${plan.risk || 'normal'}.`,
    `Active helper capabilities: ${ids}.`,
    'Use deterministic context, routing, retrieval, research, verification, and quality stages when available instead of making the language model imitate unavailable tools.',
    'The language model is one component of the pipeline, not the sole source of truth. Do not claim a helper capability ran if its underlying subsystem did not return evidence.',
  ].join(' ');
}

export function publicAgentToolSummary(plan, limit = 8) {
  if (!plan?.tools?.length) return [];
  const preferred = ['context_memory', 'web_search', 'deep_analyzer', 'rag_retriever', 'source_crosscheck', 'claim_verifier', 'security_reviewer', 'final_quality_gate'];
  const rank = new Map(preferred.map((id, index) => [id, index]));
  return [...plan.tools]
    .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
    .slice(0, Math.max(1, limit))
    .map((tool) => ({ id: tool.id, label: tool.label, stage: tool.stage }));
}
