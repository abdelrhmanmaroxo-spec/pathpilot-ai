const INTENT_PATTERNS = [
  ['farewell', /(?:\b(?:bye|goodbye|see you|cya|gn)\b|سلام|مع السلامة|تصبح على خير|اشوفك|باي)/iu],
  ['thanks', /(?:\b(?:thanks|thank you|thx|ty)\b|شكر(?:ا|اً)|متشكر|تسلم|ميرسي)/iu],
  ['apology', /(?:\b(?:sorry|my bad|apologies)\b|آسف(?:ة)?|معلش|حقك عليا|سامحني)/iu],
  ['encouragement', /(?:\b(?:you got this|good luck|wish me luck|cheer me up)\b|شد حيلك|بالتوفيق|شجعني|ادعيلي)/iu],
  ['confusion', /(?:\b(?:confused|i do not get it|what do you mean|huh)\b|\bmsh\s+fah+?m\b|مش فاهم(?:ة)?|مش واضح|مش مستوعب(?:ة)?|يعني ايه|مش فاهم)/iu],
  ['frustration', /(?:\b(?:frustrated|annoyed|this is not working|ugh)\b|زهقت|متضايق(?:ة)?|مستفز|مش شغال|تعبت)/iu],
  ['acknowledgement', /(?:\b(?:ok|okay|got it|noted|sure|alright)\b|تمام|حاضر|ماشي|فاهم|وصلت|أوكي)/iu],
  ['greeting', /(?:\b(?:hi|hello|hey|morning|evening|good morning|good evening)\b|\b(?:h+a+i+|h+e+l+l+o+|h+e+y+)\b|اهلا|أهلاً|هاي|هلو|ازيك|إزيك|عامل ايه|عاملة ايه|مساء الخير|صباح الخير)/iu],
  ['small_talk', /(?:\b(?:how are you|what is up|how is it going|and you)\b|اخبارك|عامل ايه|عاملة ايه|الدنيا ايه|وانت|وانتي)/iu],
];

const ACTION_PATTERNS = [
  /\b(?:explain|debug|fix|write|draft|compare|analy[sz]e|summari[sz]e|plan|research|review|show me|how do i)\b/iu,
  /(?:اشرح|فسر|حل|صلح|اكتب|قارن|لخص|خطط|ابحث|راجع|وريني|ازاي|إزاي|كمل\s+الشرح|وضح\s+أكتر)/u,
  /\b(?:api|oauth|dns|sql|javascript|python|code|bug|error|resume|cv|email)\b/iu,
  /(?:^|\s)(?:ليه|لماذا|كيف|متى|فين|اين|أين)(?:\s|$)/u,
];

const CONTEXT_FOLLOW_UP_PATTERNS = [
  /^(?:طب|طيب|طب\s+وبعدين|طيب\s+وبعدين|وبعدين|كمل|كمّل|ودي|وده|دي\s+كمان|نفس\s+اللي\s+فات)$/u,
  /^(?:tab|tayeb|w\s+ba3den|kml|kmel|w\s+da|w\s+دي|nafs\s+elly\s+fat)$/iu,
  /^(?:what about (?:the )?(?:second|next|other) one|and this one)$/iu,
];

function collapseRepeatedLetters(value) {
  return value.replace(/([A-Za-z\u0600-\u06FF])\1{2,}/gu, '$1$1');
}

export function normalizeConversationText(input = '') {
  return collapseRepeatedLetters(String(input)
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/gu, '')
    .replace(/[ـ]/gu, '')
    .replace(/[إأآ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/[\u005B\u005D؟?!.,;:،؛(){}\"'`’‘]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLocaleLowerCase('ar-EG'));
}

export function detectConversationLanguage(input = '') {
  const text = String(input);
  const arabic = (text.match(/[\u0600-\u06FF]/gu) || []).length;
  const latin = (text.match(/[A-Za-z]/gu) || []).length;
  const arabiziSignal = /(?:\b(?:ana|enta|enty|ezay\w*|ezzay\w*|3amel|3amla|msh|mesh|mhtag|m7tag|3ayz|3ayza|bnt|wld|shokran|tmam|ma3lesh|3ala|tab|tayeb|kml|kmel|feen|feyn|yalla)\b|[2356798])/iu.test(text);
  if (arabic && latin) return arabic >= latin || arabiziSignal ? 'ar-mixed' : 'en-mixed';
  if (arabic) return 'ar';
  if (latin && arabiziSignal) return 'ar-romanized';
  if (latin) return 'en';
  return 'unknown';
}

export function detectConversationIntent(input = '', { hasRelevantContext = false } = {}) {
  const normalized = normalizeConversationText(input);
  if (!normalized) return { intent: 'empty', normalized, language: 'unknown', lightweight: true };
  const actionBearing = ACTION_PATTERNS.some((pattern) => pattern.test(normalized));
  if (actionBearing) {
    return { intent: 'substantive', normalized, language: detectConversationLanguage(input), lightweight: false };
  }
  if (hasRelevantContext && normalized.split(' ').length <= 7 && CONTEXT_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { intent: 'contextual_follow_up', normalized, language: detectConversationLanguage(input), lightweight: false };
  }
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        intent,
        normalized,
        language: detectConversationLanguage(input),
        lightweight: !hasRelevantContext || ['greeting', 'small_talk', 'thanks', 'apology', 'acknowledgement', 'farewell', 'encouragement'].includes(intent),
      };
    }
  }
  return { intent: hasRelevantContext ? 'contextual_follow_up' : 'open', normalized, language: detectConversationLanguage(input), lightweight: false };
}

const DIRECT_SELF_CUES = [
  ['female', /(?:^|\s)(?:انا|أنا)\s+(?:بنت|ست|محتاجة|عايزة|كويسة|قلقانة|مضغوطة|متضايقة|مرهقة|مستعدة)(?:\s|$)/u],
  ['male', /(?:^|\s)(?:انا|أنا)\s+(?:ولد|راجل|محتاج|عايز|كويس|قلقان|مضغوط|متضايق|مرهق|مستعد)(?:\s|$)/u],
  ['female', /(?:^|\s)(?:im|i am)\s+(?:a\s+)?(?:girl|woman|female)(?:\s|$)/iu],
  ['male', /(?:^|\s)(?:im|i am)\s+(?:a\s+)?(?:boy|man|male)(?:\s|$)/iu],
  ['female', /(?:^|\s)ana\s+(?:bnt|set|m7taga|3ayza|kwyssa|mst3da)(?:\s|$)/iu],
  ['male', /(?:^|\s)ana\s+(?:wld|ragel|m7tag|3ayz|kwayes|mst3d)(?:\s|$)/iu],
];

export function detectSelfReferenceGender(input = '') {
  const normalized = normalizeConversationText(input);
  const hits = DIRECT_SELF_CUES.filter(([, pattern]) => pattern.test(normalized)).map(([gender]) => gender);
  if (hits.includes('female') && hits.includes('male')) return 'unknown';
  return hits.length === 1 ? hits[0] : 'unknown';
}

export function resolveConversationGender(turns = []) {
  let gender = 'unknown';
  for (const turn of turns) {
    const content = turn?.content || turn || '';
    const evidence = detectSelfReferenceGender(content);
    const hasContradictorySelfReference = /(?:^|\s)(?:انا|أنا|ana)\s+[^.!?؟\n]{0,80}(?:\s|و)(?:انا|أنا|ana)\s+/iu.test(normalizeConversationText(content));
    if (hasContradictorySelfReference) {
      gender = 'unknown';
    } else if (evidence !== 'unknown') {
      gender = evidence;
    }
  }
  return gender;
}

function signature(value) {
  return normalizeConversationText(value).replace(/\s+/gu, ' ');
}

export function selectFreshVariant(variants, recentSignatures = []) {
  const pool = Array.isArray(variants) ? variants.filter(Boolean) : [];
  if (!pool.length) return '';
  const recent = new Set((Array.isArray(recentSignatures) ? recentSignatures : []).map(signature));
  const fresh = pool.find((candidate) => !recent.has(signature(candidate)));
  return fresh || pool[0];
}

export function buildConversationQualityHints(input, context = {}) {
  const currentGender = detectSelfReferenceGender(input);
  const gender = currentGender !== 'unknown' ? currentGender : resolveConversationGender(context.turns || []);
  const profile = detectConversationIntent(input, { hasRelevantContext: Boolean(context.hasRelevantContext) });
  const arabicMode = ['ar', 'ar-mixed', 'ar-romanized'].includes(profile.language);
  return {
    ...profile,
    gender,
    useNeutralArabic: gender === 'unknown' && arabicMode,
    preserveLanguage: arabicMode ? 'arabic' : profile.language === 'en' ? 'english' : 'dominant',
  };
}
