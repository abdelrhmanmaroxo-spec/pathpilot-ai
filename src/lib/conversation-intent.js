const MAX_SOCIAL_CHARS = 220;
const MAX_SOCIAL_TOKENS = 18;

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const ROMANIZED_ARABIC_CUES = /(?:\b(?:ezayak|ezayek|ezzayak|ezzayek|akhbarak|shokran|shukran|tmam|tamam|mashy|mashi|eshta|yalla|yala|ma3lesh|malesh|asif|salam|msh|mesh|mosh|fahem|fahm|fhm|fahma|fehm|sh8al|shghal|shaghal|3ayz|3ayez|3ayza|3ayzah|kwayes|kways|kwys|kwayesa|kwysa|mhtag|mehtag|mohtag|msa3da|mosa3da|mmkn|momken|3arfa|3aref|ta3ban|ta3bana|za3lan|za3lana|sa7by|sa7bi)\b|\b(?:3amel|amel)\s+(?:eh|eih)\b)/i;

const ARABIZI_TOKEN_MAP = new Map([
  ['msh', 'مش'], ['mesh', 'مش'], ['mosh', 'مش'],
  ['fahem', 'فاهم'], ['fahm', 'فاهم'], ['fhm', 'فاهم'], ['fehm', 'فاهم'],
  ['fahma', 'فاهمه'], ['fahmah', 'فاهمه'],
  ['sh8al', 'شغال'], ['shghal', 'شغال'], ['shaghal', 'شغال'],
  ['naf3', 'نافع'], ['nafe3', 'نافع'],
  ['mhtag', 'محتاج'], ['mehtag', 'محتاج'], ['mohtag', 'محتاج'],
  ['msa3da', 'مساعده'], ['mosa3da', 'مساعده'],
  ['mmkn', 'ممكن'], ['momken', 'ممكن'],
  ['3ayz', 'عايز'], ['3ayez', 'عايز'], ['3ayza', 'عايزه'], ['3ayzah', 'عايزه'],
  ['3arfa', 'عارفه'], ['3aref', 'عارف'],
  ['kwayes', 'كويس'], ['kways', 'كويس'], ['kwys', 'كويس'],
  ['kwayesa', 'كويسه'], ['kwysa', 'كويسه'],
  ['ta3ban', 'تعبان'], ['ta3bana', 'تعبانه'],
  ['za3lan', 'زعلان'], ['za3lana', 'زعلانه'],
  ['asf', 'اسف'],
]);

// This matcher runs after normalization, so Arabic cues intentionally use normalized
// Alef/Ya/Taa-Marbuta forms. Common Egyptian attached pronouns are accepted to keep
// real work requests out of the lightweight social fast path.
const ACTION_CUES = /(?:\b(?:continue|explain|why|write|rewrite|translate|compare|search|find|fix|debug|analy[sz]e|analysis|summari[sz]e|summary|calculate|solve|show|build|create|edit|draft|email|code|review)\b|(?:^|\s)(?:كمل(?:لي|ه|ها|لنا)?|تابع(?:لي|ه|ها)?|وضح(?:لي|ه|ها|لنا)?|ليه|اكتب(?:لي|ه|ها|لنا)?|اعد(?:لي|ه|ها)?|ترجم(?:لي|ه|ها|لنا)?|قارن(?:لي|ه|ها)?|دور(?:لي)?|ابحث(?:لي)?|اصلح(?:لي|ه|ها)?|حلل(?:لي|ه|ها)?|لخص(?:لي|ه|ها)?|احسب(?:لي|ه|ها)?|حل(?:لي|ه|ها)?|وريني|اعمل(?:لي|ه|ها|لنا)?|ابني(?:لي|ه|ها)?|عدل(?:لي|ه|ها)?|راجع(?:لي|ه|ها)?|ابعت(?:لي|ه|ها)?|تحليل|شرح|ترجمه|مقارنه|تلخيص|كود|ايميل)(?:\s|$))/i;

const EMBEDDED_PATTERNS = [
  ['morning_greeting', /(?:^|\s)(?:good morning|صباح الخير|صباح النور|صباح الفل)(?:\s|$)/],
  ['evening_greeting', /(?:^|\s)(?:good evening|مساء الخير|مساء النور|مساء الفل)(?:\s|$)/],
  ['how_are_you', /(?:\bhow are you\b|\bhow r u\b|\bhows it going\b|\bwhats up\b|\b(?:ezayak|ezayek|ezzayak|ezzayek|akhbarak)\b|\b(?:3amel|amel)\s+(?:eh|eih)\b|(?:^|\s)(?:ازيك|ازيكم|عامل اي|عامل ايه|عامله اي|عامله ايه|اخبارك|الدنيا عامله ايه)(?:\s|$))/],
  ['encouragement', /(?:\bencourage me\b|\bmotivate me\b|\bgive me a push\b|(?:^|\s)(?:شجعني|حفزني|اديني دفعه)(?:\s|$))/],
  ['vague_help', /(?:\bhelp me\b|\bcan you help me\b|\bi need help\b|(?:^|\s)(?:ساعدني|ممكن تساعدني|عايز مساعده|محتاج مساعده)(?:\s|$))/],
  ['confusion', /(?:\bstill confused\b|\bstill dont understand\b|(?:^|\s)(?:لسه مش فاهم|مش فاهم خالص|مش مستوعب خالص)(?:\s|$))/],
  ['frustration', /(?:\bstill not working\b|\bthis still isnt working\b|(?:^|\s)(?:لسه مش شغال|مش شغال خالص|مش نافع خالص)(?:\s|$))/],
  ['positive_update', /(?:\b(?:im|i am) (?:good|fine|okay)\b|(?:^|\s)انا (?:تمام|كويس|كويسه|بخير)(?:\s|$))/],
];

const EXACT_PATTERNS = [
  ['morning_greeting', /^(?:good morning|morning|صباح الخير|صباح النور|صباح الفل)$/],
  ['evening_greeting', /^(?:good evening|evening|مساء الخير|مساء النور|مساء الفل)$/],
  ['how_are_you', /^(?:how are you|how r u|hows it going|how is it going|whats up|what is up|you good|and you|what about you|ezayak|ezayek|ezzayak|ezzayek|akhbarak|3amel eh|3amel eih|amel eh|amel eih|ازيك|ازيكم|عامل اي|عامل ايه|عامله اي|عامله ايه|اخبارك|ايه الاخبار|الدنيا ايه|الدنيا عامله ايه|وانت|وانتي|وانتو|وانت عامل ايه|وانتي عامله ايه)$/],
  ['greeting', /^(?:hi|hello|hey|hiya|ahlan|اهلا|هاي|هلا|يا هلا|يا اهلا|سلام|السلام عليكم|وعليكم السلام)$/],
  ['thanks', /^(?:thanks|thank you|thanks a lot|thank you so much|thx|appreciate it|shokran|shukran|merci|شكرا|شكرا جدا|شكرا اوي|تسلم|تسلمي|متشكر|متشكره|ميرسي)$/],
  ['acknowledgement', /^(?:ok|okay|okey|got it|cool|perfect|makes sense|all good|yeah|yep|alright|tmam|tamam|mashy|mashi|eshta|تمام|تمام كده|كده تمام|اوكي|اوكي تمام|ماشي|حلو|جميل|فهمت|فاهم|وصلت|فل|اشطا|ايوه|ايوه تمام|اها|طيب تمام|طب تمام|ولا يهمك|براحتك)$/],
  ['ready', /^(?:ready|im ready|i am ready|lets go|lets start|go ahead|yalla|yala|yalla bina|yala bina|جاهز|جاهزه|يلا|يلا بينا|يلا نبدا|ابدا)$/],
  ['encouragement', /^(?:encourage me|motivate me|give me a push|شجعني|حفزني|اديني دفعه|عايز تشجيع|محتاج تشجيع)$/],
  ['positive_update', /^(?:im good|i am good|doing good|im fine|i am fine|im okay|i am okay|all good here|ana tamam|ana tmam|انا تمام|انا كويس|انا كويسه|انا بخير|الحمد لله تمام|الدنيا تمام|كله تمام)$/],
  ['goodbye', /^(?:bye|goodbye|see you|see you later|later|good night|take care|salam|salam ya bro|باي|يلا سلام|سلام سلام|اشوفك بعدين|نشوفك بعدين|تصبح علي خير|تصبحي علي خير|في امان الله)$/],
  ['apology', /^(?:sorry|my bad|apologies|sorry about that|ma3lesh|malesh|asif|اسف|معلش|حقك عليا|سامحني)$/],
  ['confusion', /^(?:im confused|i am confused|confused|i dont understand|dont understand|im lost|i am lost|مش فاهم|مش فاهمك|مش واضح|مش واضحه|اتلخبطت|انا تايه|تايه|مش مستوعب)$/],
  ['vague_help', /^(?:help me|can you help me|i need help|need help|ساعدني|محتاج مساعده|عايز مساعده|ممكن تساعدني)$/],
  ['frustration', /^(?:im frustrated|i am frustrated|this is annoying|it doesnt work|not working|زهقت|اتخنقت|الموضوع مستفز|مش شغال|مش نافع)$/],
  ['compliment', /^(?:awesome|great job|nice one|well done|love it|جامد|عاش|برافو|عظمه|حلو اوي|انت جامد)$/],
  ['identity', /^(?:who are you|what are you|are you a bot|are you ai|انت مين|مين انت|انت بوت|انت ذكاء اصطناعي)$/],
  ['doing', /^(?:what are you doing|what r u doing|whatre you doing|are you there|you there|still there|انت بتعمل اي|انت بتعمل ايه|بتعمل اي|بتعمل ايه|انت موجود|موجود|لسه معايا|معايا)$/],
  ['capability', /^(?:what can you do|what can u do|what do you do|تقدر تعمل اي|تقدر تعمل ايه|بتعرف تعمل اي|بتعرف تعمل ايه)$/],
];

const SOCIAL_FILLERS = new Set([
  'يا', 'معلم', 'صاحبي', 'صديقي', 'حبيبي', 'باشا', 'ريس', 'برنس', 'عم', 'برو', 'bro', 'man', 'mate', 'friend',
  'جدا', 'اوي', 'قوي', 'بجد', 'خالص', 'شويه', 'شوي', 'really', 'very', 'so', 'much', 'a', 'lot', 'just', 'here',
  'ya', 'enta', 'enty', 'wenta', 'wenty', 'gedan', 'awyy', 'awy', 'bgd', 'khalas', 'm3lm', 'sa7by', 'sa7bi',
]);

const TOKEN_ARCHETYPES = [
  { intent: 'thanks', any: ['thanks', 'thank', 'thx', 'shokran', 'shukran', 'merci', 'شكرا', 'تسلم', 'ميرسي', 'متشكر', 'متشكره'], maxMeaningfulFillers: 2 },
  { intent: 'greeting', any: ['hi', 'hello', 'hey', 'hiya', 'ahlan', 'hala', 'اهلا', 'هلا', 'هاي', 'سلام'], maxMeaningfulFillers: 2 },
  { intent: 'acknowledgement', any: ['ok', 'okay', 'okey', 'cool', 'perfect', 'yeah', 'yep', 'alright', 'tmam', 'tamam', 'mashy', 'mashi', 'eshta', 'تمام', 'ماشي', 'اشطا', 'وصلت', 'فهمت', 'فاهم', 'ايوه', 'اها', 'براحتك'], maxMeaningfulFillers: 2 },
  { intent: 'ready', any: ['ready', 'yalla', 'yala', 'جاهز', 'جاهزه', 'يلا'], maxMeaningfulFillers: 2 },
  { intent: 'compliment', any: ['awesome', 'great', 'nice', 'جامد', 'عاش', 'برافو', 'عظمه'], maxMeaningfulFillers: 2 },
  { intent: 'apology', any: ['sorry', 'apologies', 'ma3lesh', 'malesh', 'asif', 'اسف', 'معلش'], maxMeaningfulFillers: 2 },
  { intent: 'goodbye', any: ['bye', 'goodbye', 'later', 'salam', 'باي', 'سلام'], maxMeaningfulFillers: 2 },
];

function normalizeArabiziTokens(text) {
  const tokens = String(text || '').split(/\s+/).filter(Boolean);
  const mapped = tokens.map((token) => ARABIZI_TOKEN_MAP.get(token) || token);
  const joined = mapped.join(' ');
  return joined
    .replace(/(^|\s)ana\s+(تمام|كويس|كويسه|تعبان|تعبانه|زعلان|زعلانه)(?=\s|$)/gi, '$1انا $2')
    .replace(/(^|\s)(?:momken|mmkn)\s+(مساعده)(?=\s|$)/gi, '$1ممكن $2');
}

export function normalizeConversationText(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ـ]/g, '')
    .replace(/[’']/g, '')
    .replace(/([a-z\u0621-\u064a])\1{2,}/gi, '$1')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeArabiziTokens(normalized);
}

export function detectConversationLanguage(value) {
  const raw = String(value || '');
  const arabic = (raw.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (raw.match(/[a-z]/gi) || []).length;
  if (!arabic) {
    const normalized = normalizeConversationText(raw);
    return ROMANIZED_ARABIC_CUES.test(raw) || /[\u0600-\u06ff]/.test(normalized) ? 'ar' : 'en';
  }
  if (!latin) return 'ar';
  return arabic >= latin * 0.45 ? 'ar' : 'en';
}

function isLaughter(value) {
  const raw = String(value || '').trim().replace(/[.!؟?،,\s]+/g, '');
  return /^(?:[😂🤣😄😁😅]+|ههه+|خخخ+|ha(?:ha)+|lol+|lmao)$/iu.test(raw);
}

function tokenList(text) {
  return text.split(' ').filter(Boolean);
}

function hasActionBearingContent(text, intent) {
  if (!ACTION_CUES.test(text)) return false;
  return intent !== 'ready';
}

function firstMatchingIntent(text, patterns) {
  for (const [intent, pattern] of patterns) {
    if (pattern.test(text)) return intent;
  }
  return null;
}

function tokenIntent(text) {
  const tokens = tokenList(text);
  const tokenSet = new Set(tokens);
  for (const archetype of TOKEN_ARCHETYPES) {
    const cueCount = archetype.any.filter((token) => tokenSet.has(token)).length;
    if (!cueCount) continue;
    const meaningfulOtherTokens = tokens.filter((token) => !archetype.any.includes(token) && !SOCIAL_FILLERS.has(token));
    if (meaningfulOtherTokens.length <= archetype.maxMeaningfulFillers) return archetype.intent;
  }
  return null;
}

export function detectConversationalArchetype(prompt, { hasPriorContext = false } = {}) {
  const raw = String(prompt || '').trim();
  if (!raw || raw.length > MAX_SOCIAL_CHARS) return null;
  if (isLaughter(raw)) return { intent: 'laughter', language: detectConversationLanguage(raw), confidence: 1 };

  const text = normalizeConversationText(raw);
  if (!text) return null;
  const tokenCount = tokenList(text).length;
  if (tokenCount > MAX_SOCIAL_TOKENS) return null;

  const exactIntent = firstMatchingIntent(text, EXACT_PATTERNS);
  const embeddedIntent = firstMatchingIntent(text, EMBEDDED_PATTERNS);
  const tokenMatchedIntent = tokenIntent(text);
  const intent = exactIntent || embeddedIntent || tokenMatchedIntent;
  if (!intent) return null;

  if (hasActionBearingContent(text, intent)) return null;
  if (hasPriorContext && (intent === 'confusion' || intent === 'frustration')) return null;

  return {
    intent,
    language: detectConversationLanguage(raw),
    confidence: exactIntent ? 1 : embeddedIntent ? 0.9 : 0.78,
  };
}
