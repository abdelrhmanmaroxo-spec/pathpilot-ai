import { needsFreshResearch } from './smart-router.js';

export const CHAT_AGENT_ORCHESTRATOR_VERSION = 'agent-v1';

export const CHAT_AGENT_TOOLS = Object.freeze([
  { id: 'context_memory', label: 'Context memory', stage: 'understand', userToggleable: false },
  { id: 'intent_classifier', label: 'Intent analysis', stage: 'understand', userToggleable: false },
  { id: 'constraint_extractor', label: 'Constraint check', stage: 'understand', userToggleable: false },
  { id: 'topic_linker', label: 'Topic linking', stage: 'understand', userToggleable: false },
  { id: 'language_detector', label: 'Language detection', stage: 'understand', userToggleable: false },
  { id: 'safety_guard', label: 'Safety guard', stage: 'understand', userToggleable: false },
  { id: 'freshness_detector', label: 'Freshness check', stage: 'research', userToggleable: false },
  { id: 'query_expander', label: 'Query expansion', stage: 'research', userToggleable: true },
  { id: 'web_search', label: 'Web search', stage: 'research', userToggleable: true },
  { id: 'source_ranker', label: 'Source ranking', stage: 'research', userToggleable: true },
  { id: 'source_crosscheck', label: 'Source cross-check', stage: 'research', userToggleable: true },
  { id: 'citation_guard', label: 'Citation check', stage: 'research', userToggleable: true },
  { id: 'rag_retriever', label: 'Expert RAG', stage: 'knowledge', userToggleable: true },
  { id: 'rag_reranker', label: 'RAG reranking', stage: 'knowledge', userToggleable: true },
  { id: 'knowledge_deduplicator', label: 'Knowledge deduplication', stage: 'knowledge', userToggleable: true },
  { id: 'context_budgeter', label: 'Context budget', stage: 'knowledge', userToggleable: false },
  { id: 'domain_router', label: 'Domain routing', stage: 'knowledge', userToggleable: false },
  { id: 'deep_analyzer', label: 'Deep analysis', stage: 'reason', userToggleable: true },
  { id: 'assumption_checker', label: 'Assumption check', stage: 'reason', userToggleable: true },
  { id: 'contradiction_checker', label: 'Contradiction check', stage: 'reason', userToggleable: true },
  { id: 'tradeoff_analyzer', label: 'Trade-off analysis', stage: 'reason', userToggleable: true },
  { id: 'failure_mode_analyzer', label: 'Failure-mode analysis', stage: 'reason', userToggleable: true },
  { id: 'claim_verifier', label: 'Claim verification', stage: 'reason', userToggleable: true },
  { id: 'risk_analyzer', label: 'Risk analysis', stage: 'reason', userToggleable: true },
  { id: 'comparison_engine', label: 'Comparison engine', stage: 'reason', userToggleable: true },
  { id: 'planner', label: 'Planning engine', stage: 'reason', userToggleable: true },
  { id: 'dependency_mapper', label: 'Dependency mapping', stage: 'reason', userToggleable: true },
  { id: 'code_analyzer', label: 'Code analysis', stage: 'specialist', userToggleable: true },
  { id: 'security_reviewer', label: 'Security review', stage: 'specialist', userToggleable: false },
  { id: 'test_planner', label: 'Test planning', stage: 'specialist', userToggleable: true },
  { id: 'qa_reviewer', label: 'QA review', stage: 'specialist', userToggleable: true },
  { id: 'numeric_sanity_check', label: 'Numeric sanity check', stage: 'specialist', userToggleable: true },
  { id: 'answer_editor', label: 'Answer editor', stage: 'finalize', userToggleable: true },
  { id: 'confidence_estimator', label: 'Confidence estimate', stage: 'finalize', userToggleable: false },
  { id: 'answer_reviewer', label: 'Answer review', stage: 'finalize', userToggleable: true },
  { id: 'final_quality_gate', label: 'Final quality gate', stage: 'finalize', userToggleable: false },
  { id: 'model_router', label: 'Model routing', stage: 'runtime', userToggleable: false },
  { id: 'local_llm', label: 'Local LLM', stage: 'runtime', userToggleable: false },
  { id: 'provider_fallback', label: 'Provider fallback', stage: 'runtime', userToggleable: false },
  { id: 'voice_dictation', label: 'Voice dictation', stage: 'input', userToggleable: true },
]);

const TOOL_BY_ID = new Map(CHAT_AGENT_TOOLS.map((tool) => [tool.id, tool]));
const USER_TOGGLEABLE_IDS = new Set(CHAT_AGENT_TOOLS.filter((tool) => tool.userToggleable).map((tool) => tool.id));

export const CHAT_AGENT_OPTION_GROUPS = Object.freeze([
  { id: 'search', label: 'Web research', toolIds: ['query_expander', 'web_search', 'source_ranker', 'source_crosscheck', 'citation_guard'] },
  { id: 'rag', label: 'Expert RAG', toolIds: ['rag_retriever', 'rag_reranker', 'knowledge_deduplicator'] },
  { id: 'deep', label: 'Deep analysis', toolIds: ['deep_analyzer', 'assumption_checker', 'contradiction_checker', 'tradeoff_analyzer', 'failure_mode_analyzer', 'claim_verifier', 'risk_analyzer', 'answer_reviewer'] },
  { id: 'planning', label: 'Planning', toolIds: ['planner', 'dependency_mapper'] },
  { id: 'comparison', label: 'Comparison', toolIds: ['comparison_engine'] },
  { id: 'code', label: 'Code & QA', toolIds: ['code_analyzer', 'test_planner', 'qa_reviewer'] },
  { id: 'numbers', label: 'Numeric checks', toolIds: ['numeric_sanity_check'] },
  { id: 'writing', label: 'Answer editing', toolIds: ['answer_editor'] },
  { id: 'voice', label: 'Voice dictation', toolIds: ['voice_dictation'] },
]);

const CASUAL_PATTERN = /^(?:اهلا|أهلا|هاي|هلا|سلام|ازيك|عامل ايه|عامل إيه|اخبارك|أخبارك|انت مين|إنت مين|انت بتعمل اي|انت بتعمل إيه|إنت بتعمل اي|إنت بتعمل إيه|بتعمل اي|بتعمل إيه|تقدر تعمل ايه|تقدر تعمل إيه|شكرا|شكرًا|thanks|thank you|hi|hello|hey|how are you|who are you|what are you doing|what can you do)[؟?!.,\s]*$/i;
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
  if (CASUAL_PATTERN.test(text.trim())) return 'conversation';
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

export function sanitizeDisabledChatTools(ids = []) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => String(id || '')).filter((id) => USER_TOGGLEABLE_IDS.has(id)))];
}

function removeDisabled(selected, disabledToolIds) {
  for (const id of sanitizeDisabledChatTools(disabledToolIds)) selected.delete(id);
}

export function disabledToolsForGroups(groupIds = []) {
  const requested = new Set(Array.isArray(groupIds) ? groupIds.map(String) : []);
  return sanitizeDisabledChatTools(
    CHAT_AGENT_OPTION_GROUPS
      .filter((group) => requested.has(group.id))
      .flatMap((group) => group.toolIds),
  );
}

export function planChatAgent({ prompt = '', forceResearch = false, deepThink = false, voiceInput = false, disabledToolIds = [] } = {}) {
  const text = String(prompt || '').trim();
  const selected = new Set();
  const freshnessNeeded = forceResearch || needsFreshResearch(text, 'ask');
  const intent = detectIntent(text);
  const domain = detectDomain(text);
  const risk = riskLevel(text);

  add(selected,
    'context_memory', 'intent_classifier', 'constraint_extractor', 'topic_linker',
    'language_detector', 'safety_guard', 'freshness_detector',
    'context_budgeter', 'domain_router',
    'confidence_estimator', 'final_quality_gate', 'model_router', 'local_llm', 'provider_fallback',
  );

  if (intent !== 'conversation') add(selected, 'rag_retriever', 'rag_reranker', 'knowledge_deduplicator');
  if (freshnessNeeded) add(selected, 'query_expander', 'web_search', 'source_ranker', 'source_crosscheck', 'citation_guard', 'claim_verifier');
  if (deepThink || ANALYSIS_PATTERN.test(text) || risk === 'high' || text.length >= 450) {
    add(selected, 'deep_analyzer', 'assumption_checker', 'contradiction_checker', 'tradeoff_analyzer', 'failure_mode_analyzer', 'claim_verifier', 'risk_analyzer', 'answer_reviewer');
  }
  if (CODE_PATTERN.test(text)) add(selected, 'code_analyzer', 'test_planner', 'qa_reviewer');
  if (SECURITY_PATTERN.test(text)) add(selected, 'security_reviewer', 'failure_mode_analyzer', 'risk_analyzer');
  if (PLANNING_PATTERN.test(text)) add(selected, 'planner', 'dependency_mapper', 'risk_analyzer', 'deep_analyzer', 'answer_reviewer');
  if (COMPARISON_PATTERN.test(text)) add(selected, 'comparison_engine', 'tradeoff_analyzer', 'assumption_checker', 'deep_analyzer', 'answer_reviewer');
  if (NUMERIC_PATTERN.test(text)) add(selected, 'numeric_sanity_check');
  if (WRITING_PATTERN.test(text)) add(selected, 'answer_editor');
  if (voiceInput) add(selected, 'voice_dictation');

  removeDisabled(selected, disabledToolIds);

  const toolIds = [...selected];
  const allowResearch = toolIds.includes('web_search');
  const deepReview = toolIds.includes('deep_analyzer') && (
    deepThink || risk === 'high' || ['analyze', 'compare', 'plan', 'technical'].includes(intent) || text.length >= 450
  );

  return {
    version: CHAT_AGENT_ORCHESTRATOR_VERSION,
    mode: 'auto',
    intent,
    domain,
    risk,
    freshnessNeeded,
    forceResearch: forceResearch && allowResearch,
    allowResearch,
    deepReview,
    disabledToolIds: sanitizeDisabledChatTools(disabledToolIds),
    toolIds,
    tools: toolIds.map((id) => TOOL_BY_ID.get(id)),
  };
}

export function agentPlanGuidance(plan) {
  if (!plan?.toolIds?.length) return '';
  const ids = plan.toolIds.join(', ');
  return [
    `Chat agent orchestration: ${plan.version || CHAT_AGENT_ORCHESTRATOR_VERSION}; selection mode: auto.`,
    `Detected intent: ${plan.intent || 'answer'}. Domain: ${plan.domain || 'general'}. Risk: ${plan.risk || 'normal'}.`,
    `Selected helper capabilities: ${ids}.`,
    plan.intent === 'conversation'
      ? 'This is casual conversation. Answer naturally and directly; do not force a report, RAG summary, or step-by-step framework.'
      : '',
    plan.freshnessNeeded && !plan.allowResearch
      ? 'Fresh information appears relevant, but web research is disabled by the user. Do not guess current facts; clearly mark what needs live verification.'
      : '',
    'Use deterministic context, routing, retrieval, research, verification, and quality stages when available instead of making the language model imitate unavailable tools.',
    'The language model is one component of the pipeline, not the sole source of truth. Never claim a helper capability executed unless its underlying subsystem actually supplied evidence or state.',
    'Write the final response naturally and directly. Do not narrate the internal orchestration, tool selection, hidden review, or private reasoning.',
  ].filter(Boolean).join(' ');
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
