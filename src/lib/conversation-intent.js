const MAX_SOCIAL_CHARS = 220;
const MAX_SOCIAL_TOKENS = 18;

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;

const ACTION_CUES = /(?:\b(?:continue|explain|why|write|rewrite|translate|compare|search|find|fix|debug|analy[sz]e|summari[sz]e|calculate|solve|show|build|create|edit)\b|(?:^|\s)(?:كمل|كمّل|تابع|وضح|وضّح|ليه|اكتب|اعد|أعد|ترجم|قارن|دور|ابحث|اصلح|أصلح|حلل|لخص|احسب|حل|وريني|اعمل|ابني|عدل|عدّل)(?:\s|$))/i;

const EXACT_PATTERNS = [
  ['morning_greeting', /^(?:good morning|morning|صباح الخير|صباح النور|صباح الفل)$/],
  ['evening_greeting', /^(?:good evening|evening|مساء الخير|مساء النور|مساء الفل)$/],
  ['how_are_you', /^(?:how are you|how r u|hows it going|how is it going|whats up|what is up|you good|ازيك|ازيكم|عامل اي|عامل ايه|عامله اي|عامله ايه|اخبارك|ايه الاخبار|الدنيا ايه|الدنيا عامله ايه)$/],
  ['greeting', /^(?:hi|hello|hey|اهلا|هاي|هلا|يا هلا|يا اهلا|سلام|السلام عليكم|وعليكم السلام)$/],
  ['thanks', /^(?:thanks|thank you|thx|appreciate it|شكرا|شكرا جدا|تسلم|تسلمي|متشكر|متشكره|ميرسي)$/],
  ['acknowledgement', /^(?:ok|okay|got it|cool|perfect|makes sense|all good|تمام|تمام كده|كده تمام|اوكي|اوكي تمام|ماشي|حلو|جميل|فهمت|وصلت|فل|اشطا)$/],
  ['ready', /^(?:ready|im ready|i am ready|lets go|lets start|go ahead|جاهز|جاهزه|يلا|يلا بينا|يلا نبدأ|ابدأ|ابدا)$/],
  ['encouragement', /^(?:encourage me|motivate me|give me a push|شجعني|حفزني|اديني دفعه|عايز تشجيع|محتاج تشجيع)$/],
  ['positive_update', /^(?:im good|i am good|doing good|im fine|i am fine|all good here|انا تمام|انا كويس|انا كويسه|الحمد لله تمام|الدنيا تمام|كله تمام)$/],
  ['goodbye', /^(?:bye|goodbye|see you|see you later|later|good night|باي|يلا سلام|سلام سلام|اشوفك بعدين|نشوفك بعدين|تصبح علي خير|تصبحي علي خير)$/],
  ['apology', /^(?:sorry|my bad|apologies|اسف|معلش|حقك عليا|سامحني)$/],
  ['confusion', /^(?:im confused|i am confused|confused|i dont understand|dont understand|im lost|i am lost|مش فاهم|مش فاهمك|مش واضح|مش واضحه|اتلخبطت|انا تايه|تايه|مش مستوعب)$/],
  ['vague_help', /^(?:help me|can you help me|i need help|need help|ساعدني|محتاج مساعده|عايز مساعده|ممكن تساعدني)$/],
  ['frustration', /^(?:im frustrated|i am frustrated|this is annoying|it doesnt work|not working|زهقت|اتخنقت|الموضوع مستفز|مش شغال|مش نافع)$/],
  ['compliment', /^(?:awesome|great job|nice one|well done|love it|جامد|عاش|برافو|عظمه|حلو اوي|انت جامد)$/],
  ['identity', /^(?:who are you|what are you|انت مين|مين انت)$/],
  ['doing', /^(?:what are you doing|what r u doing|انت بتعمل اي|انت بتعمل ايه|بتعمل اي|بتعمل ايه)$/],
  ['capability', /^(?:what can you do|what can u do|تقدر تعمل اي|تقدر تعمل ايه|بتعرف تعمل اي|بتعرف تعمل ايه)$/],
];

const TOKEN_ARCHETYPES = [
  { intent: 'thanks', any: ['thanks', 'thank', 'thx', 'شكرا', 'تسلم', 'ميرسي', 'متشكر'], socialOnly: true },
  { intent: 'greeting', any: ['hi', 'hello', 'hey', 'اهلا', 'هلا', 'هاي', 'سلام'], socialOnly: true },
  { intent: 'acknowledgement', any: ['ok', 'okay', 'cool', 'تمام', 'ماشي', 'اشطا', 'وصلت', 'فهمت'], socialOnly: true },
  { intent: 'compliment', any: ['awesome', 'great', 'nice', 'جامد', 'عاش', 'برافو', 'عظمه'], socialOnly: true },
  { intent: 'apology', any: ['sorry', 'apologies', 'اسف', 'معلش'], socialOnly: true },
];

export function normalizeConversationText(value) {
  return String(value || '')
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
}

export function detectConversationLanguage(value) {
  const raw = String(value || '');
  const arabic = (raw.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (raw.match(/[a-z]/gi) || []).length;
  return latin > arabic ? 'en' : 'ar';
}

function isLaughter(value) {
  const raw = String(value || '').trim().replace(/[.!؟?،,\s]+/g, '');
  return /^(?:[😂🤣😄😁😅]+|ههه+|خخخ+|ha(?:ha)+|lol+|lmao)$/iu.test(raw);
}

function tokenSet(text) {
  return new Set(text.split(' ').filter(Boolean));
}

function hasActionBearingContent(text, intent) {
  if (!ACTION_CUES.test(text)) return false;
  return !['ready'].includes(intent);
}

function tokenIntent(text) {
  const tokens = tokenSet(text);
  for (const archetype of TOKEN_ARCHETYPES) {
    if (!archetype.any.some((token) => tokens.has(token))) continue;
    const matchedSocialTokens = archetype.any.filter((token) => tokens.has(token)).length;
    const fillerBudget = tokens.size - matchedSocialTokens;
    if (!archetype.socialOnly || fillerBudget <= 4) return archetype.intent;
  }
  return null;
}

export function detectConversationalArchetype(prompt, { hasPriorContext = false } = {}) {
  const raw = String(prompt || '').trim();
  if (!raw || raw.length > MAX_SOCIAL_CHARS) return null;
  if (isLaughter(raw)) return { intent: 'laughter', language: detectConversationLanguage(raw), confidence: 1 };

  const text = normalizeConversationText(raw);
  if (!text) return null;
  const tokenCount = text.split(' ').filter(Boolean).length;
  if (tokenCount > MAX_SOCIAL_TOKENS) return null;

  let intent = null;
  for (const [candidate, pattern] of EXACT_PATTERNS) {
    if (pattern.test(text)) {
      intent = candidate;
      break;
    }
  }
  if (!intent) intent = tokenIntent(text);
  if (!intent) return null;

  if (hasActionBearingContent(text, intent)) return null;
  if (hasPriorContext && (intent === 'confusion' || intent === 'frustration')) return null;

  return {
    intent,
    language: detectConversationLanguage(raw),
    confidence: EXACT_PATTERNS.some(([candidate, pattern]) => candidate === intent && pattern.test(text)) ? 1 : 0.78,
  };
}
