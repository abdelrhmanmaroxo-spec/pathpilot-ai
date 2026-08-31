const ARABIC_RE = /[\u0600-\u06ff]/;
const LATIN_RE = /[a-z]/i;
const ARABIZI_RE = /\b(?:ezay|ezayak|3amel|shokran|tmam|yalla|ma3lesh|msh|mhtag|3ayez|3ayza|kwayes|kwayesa)\b/i;
const ACTION_RE = /\b(?:explain|debug|fix|write|draft|compare|plan|summari[sz]e|review|analy[sz]e|continue|clarify|help)\b|اشرح|وضح|كمّل|كمل|اكتب|قارن|خطط|لخّص|راجع|حلّل|صحح|ساعد/i;
const INTENTS = [
  ['greeting', /^(?:hi|hello|hey|yo|سلام|اهلا|ازيك|عامل(?:ة)? ايه|ezayak|3amel eh)$/i],
  ['thanks', /^(?:thanks|thank you|thx|شكرا|شكرًا|تسلم|متشكر(?:ة)?|shokran)$/i],
  ['apology', /^(?:sorry|my bad|معليش|معلش|آسف|آسفة|ma3lesh)$/i],
  ['acknowledgement', /^(?:ok|okay|تمام|حاضر|ماشي|حلو|tmam|yalla)$/i],
  ['farewell', /^(?:bye|goodbye|see you|سلام|تصبح على خير|اشوفك بعدين|يلا سلام)$/i],
  ['confusion', /^(?:i do not understand|i don't get it|مش فاهم(?:ة)?|مش واضح|msh fahm|msh fahma)$/i],
  ['frustration', /(?:this is not working|still broken|مش شغال|لسه بايظ|زهقت|متضايق(?:ة)?|msh sh8al)/i],
  ['encouragement', /(?:you can do it|keep going|شد حيلك|كمّل|كمل|يلا بينا|go on)/i],
  ['help', /^(?:help|ساعدني|محتاج مساعدة|محتاجة مساعدة|ممكن تساعدني|mhtag msa3da|3ayza msa3da)$/i],
];

export function normalizeConversationText(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/(.)\1{2,}/gu, '$1$1')
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
  for (const [intent, pattern] of INTENTS) if (pattern.test(normalized)) return intent;
  return normalized.split(' ').length <= 6 ? 'casual' : 'substantive';
}

export function detectSelfReferenceGender(input) {
  const normalized = normalizeConversationText(input);
  if (/(?:انا|i am|i'm)\s+(?:ولد|ذكر|راجل|male|man|محتاج|قلقان|مضغوط|متضايق|مرهق|مستعد|كويس)\b/i.test(normalized)) return 'masculine';
  if (/(?:انا|i am|i'm)\s+(?:بنت|انثي|ست|female|woman|محتاجة|قلقانة|مضغوطة|متضايقة|مرهقة|مستعدة|كويسة)\b/i.test(normalized)) return 'feminine';
  return 'unknown';
}

export function profileConversationTurn(input) {
  const text = String(input ?? '');
  const intent = detectConversationIntent(text);
  return { language: detectConversationLanguage(text), intent, lightweight: !['substantive', 'empty'].includes(intent), actionBearing: intent === 'substantive', gender: detectSelfReferenceGender(text), normalized: normalizeConversationText(text) };
}
