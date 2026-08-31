const ARABIC_RE = /[\u0600-\u06ff]/;
const LATIN_RE = /[a-z]/i;
const ACTION_RE = /\b(explain|debug|fix|write|draft|compare|plan|summari[sz]e|review|analy[sz]e|continue|clarify)\b|اشرح|وضح|كمّل|كمل|اكتب|قارن|خطط|لخّص|راجع|حلّل|صحح/i;
const ARABIZI_RE = /\b(?:ezayak|3amel|shokran|tmam|yalla|ma3lesh|msh|mhtag|3ayza|3ayez|kwayes|kwayesa)\b/i;

const INTENT_PATTERNS = [
  ['greeting', /^(?:hi|hello|hey|yo|سلام|اهلا|أهلا|ازيك|إزيك|عامل(?:ة)? ايه|عامل(?:ة)? إيه|ezayak|3amel eh)$/i],
  ['thanks', /^(?:thanks|thank you|thx|شكرا|شكرًا|تسلم|متشكر|متشكرة|shokran)$/i],
  ['apology', /^(?:sorry|my bad|معليش|معلش|آسف|آسفة|ma3lesh)$/i],
  ['acknowledgement', /^(?:ok|okay|تمام|تماما|حاضر|ماشي|حلو|tmam|yalla)$/i],
  ['farewell', /^(?:bye|goodbye|see you|سلام|تصبح على خير|اشوفك بعدين|يلا سلام)$/i],
  ['confusion', /^(?:i do not understand|i don't get it|مش فاهم|مش فاهمة|مش واضح|مش فاهمه|msh fahm)$/i],
  ['frustration', /(?:this is not working|still broken|مش شغال|لسه بايظ|زهقت|متضايق|متضايقة|msh sh8al)/i],
  ['encouragement', /(?:you can do it|keep going|شد حيلك|كمّل|كمل|يلا بينا|go on)/i],
  ['help', /^(?:help|ساعدني|محتاج مساعدة|محتاجة مساعدة|ممكن تساعدني|mhtag msa3da|3ayza msa3da)$/i],
];

function foldRepeatedLetters(value) {
  return value.replace(/(.)\1{2,}/gu, '$1$1');
}

export function normalizeConversationText(input) {
  return foldRepeatedLetters(String(input ?? ''))
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[؟?!.,،؛:()[\]{}"'`~*_+=|\\/<>-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function detectConversationLanguage(input) {
  const text = String(input ?? '');
  const arabic = (text.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (text.match(/[a-z]/gi) || []).length;
  if (arabic > latin) return 'ar';
  if (latin > arabic) return ARABIZI_RE.test(text) ? 'ar-latin' : 'en';
  return arabic ? 'ar' : 'unknown';
}

export function detectConversationIntent(input) {
  const normalized = normalizeConversationText(input);
  if (!normalized) return 'empty';
  if (ACTION_RE.test(normalized)) return 'substantive';
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(normalized)) return intent;
  }
  return normalized.split(' ').length <= 6 ? 'casual' : 'substantive';
}

export function profileConversationTurn(input) {
  const text = String(input ?? '');
  const language = detectConversationLanguage(text);
  const intent = detectConversationIntent(text);
  const lightweight = !['substantive', 'empty'].includes(intent);
  return {
    language,
    intent,
    lightweight,
    actionBearing: intent === 'substantive',
    normalized: normalizeConversationText(text),
  };
}

export function buildConversationQualityGuidance({ language = 'unknown', intent = 'casual' } = {}) {
  const languageRule = language === 'ar' || language === 'ar-latin'
    ? 'Match Arabic/Egyptian Arabic naturally; keep familiar technical terms in their common Latin form when useful.'
    : language === 'en'
      ? 'Answer in natural English; do not inject Arabic wording unless the user asks for it.'
      : 'Follow the clearest language signal in the current turn.';
  const intentRule = intent === 'substantive'
    ? 'Treat this as a real task. Do not answer with a social filler or lightweight acknowledgement.'
    : intent === 'empty'
      ? 'Ask for the missing request briefly and naturally.'
      : 'Keep the turn light, warm, and concise; offer the next useful step without launching heavy retrieval or reasoning.';
  return [
    'Conversation-quality contract:',
    languageRule,
    intentRule,
    'Use semantic intent, normalized meaning, and the latest relevant context rather than brittle exact-phrase matching.',
    'For repeated or near-duplicate social turns, vary the opening, rhythm, and closing while preserving meaning, tone, and language consistency.',
    'If the user clearly changes topic, stop carrying over stale pronouns, assumptions, or constraints from the previous topic.',
    'Use masculine or feminine Arabic agreement only when the user explicitly self-identifies or gives clear first-person grammatical evidence; otherwise prefer neutral wording without asking unnecessarily.',
  ].join(' ');
}
