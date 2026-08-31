const ARABIC_RE = /[\u0600-\u06ff]/;
const ARABIZI_RE = /\b(?:ezay|ezayak|3amel|shokran|tmam|yalla|ma3lesh|msh|mhtag|3ayez|3ayza|kwayes|kwayesa|fahm|fahma)\b/i;
const ACTION_RE = /\b(?:explain|debug|fix|write|draft|compare|plan|summari[sz]e|review|analy[sz]e|continue|clarify|help)\b|اشرح|وضح|كمّل|كمل|اكتب|قارن|خطط|لخّص|راجع|حلّل|صحح/i;
const SOCIAL_PATTERNS = [
  ['greeting', /^(?:hi|hello|hey|yo|سلام|اهلا|ازيك|عامل(?:ة)? ايه|ezayak|3amel eh)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['thanks', /^(?:thanks|thank you|thx|شكرا|تسلم|متشكر(?:ة)?|shokran)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['apology', /^(?:sorry|my bad|معليش|معلش|آسف|آسفة|ma3lesh)(?:\s+يا\s+\S+)?$/i],
  ['acknowledgement', /^(?:ok|okay|تمام|حاضر|ماشي|حلو|tmam|yalla)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['farewell', /^(?:bye|goodbye|see you|سلام|تصبح على خير|اشوفك بعدين|يلا سلام)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['confusion', /^(?:i do not understand|i don't get it|مش فاهم(?:ة)?|مش واضح|مش فاهمه|msh fahm|msh fahma|msh fahm(?:a|e)?)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['frustration', /^(?:this is not working|still broken|مش شغال|لسه بايظ|زهقت|متضايق(?:ة)?|msh sh8al)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['encouragement', /^(?:you can do it|keep going|شد حيلك|كمّل|كمل|يلا بينا|go on)(?:\s+(?:يا|ya)\s+\S+)?$/i],
  ['help', /^(?:help|ساعدني|محتاج مساعدة|محتاجة مساعدة|ممكن تساعدني|mhtag msa3da|3ayza msa3da)(?:\s+(?:يا|ya)\s+\S+)?$/i],
];

export function normalizeConversationText(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
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
  for (const [intent, pattern] of SOCIAL_PATTERNS) {
    if (pattern.test(normalized)) return intent;
  }
  if (ACTION_RE.test(normalized)) return 'substantive';
  return normalized.split(' ').length <= 6 ? 'casual' : 'substantive';
}

export function detectSelfReferenceGender(input) {
  const normalized = normalizeConversationText(input);
  const firstPerson = '(?:انا|i am|i m)';
  const end = '(?=\\s|$)';
  if (new RegExp(`${firstPerson}\\s+(?:ولد|ذكر|راجل|male|man|محتاج|قلقان|مضغوط|متضايق|مرهق|مستعد|كويس)${end}`, 'i').test(normalized)) return 'masculine';
  if (new RegExp(`${firstPerson}\\s+(?:بنت|انثي|ست|female|woman|محتاجة|قلقانة|مضغوطة|متضايقة|مرهقة|مستعدة|كويسة)${end}`, 'i').test(normalized)) return 'feminine';
  return 'unknown';
}

export function profileConversationTurn(input) {
  const text = String(input ?? '');
  const intent = detectConversationIntent(text);
  return {
    language: detectConversationLanguage(text),
    intent,
    lightweight: !['substantive', 'empty'].includes(intent),
    actionBearing: intent === 'substantive',
    gender: detectSelfReferenceGender(text),
    normalized: normalizeConversationText(text),
  };
}
