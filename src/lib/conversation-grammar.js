const EXPLICIT_MALE = /(?:\b(?:i am|i'm)\s+(?:a\s+)?(?:man|boy|male)\b|(?:^|\s)(?:انا|اني)\s+(?:ولد|راجل|رجل|شاب|ذكر)(?:\s|$))/i;
const EXPLICIT_FEMALE = /(?:\b(?:i am|i'm)\s+(?:a\s+)?(?:woman|girl|female)\b|(?:^|\s)(?:انا|اني)\s+(?:بنت|ست|سيده|سيدة|امراه|امرأة|فتاه|فتاة|شابه|شابة)(?:\s|$))/i;

const MALE_SELF_FORMS = [
  'محتاج', 'جاهز', 'تعبان', 'مبسوط', 'زعلان', 'متوتر', 'محتار', 'زهقان', 'فرحان', 'مشغول', 'متاكد', 'متأكد',
];
const FEMALE_SELF_FORMS = [
  'محتاجه', 'محتاجة', 'جاهزه', 'جاهزة', 'تعبانه', 'تعبانة', 'مبسوطه', 'مبسوطة', 'زعلانه', 'زعلانة',
  'متوتره', 'متوترة', 'محتاره', 'محتارة', 'زهقانه', 'زهقانة', 'فرحانه', 'فرحانة', 'مشغوله', 'مشغولة',
  'متاكده', 'متاكدة', 'متأكده', 'متأكدة',
];
const SELF_ADVERBS = '(?:فعلا|بجد|دلوقتي|جدا|اوي|قوي|شويه|شوية|really|very|currently|today)';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ـ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasSelfForm(text, forms) {
  return forms.some((form) => new RegExp(
    `(?:^|\\s)(?:انا|اني)(?:\\s+${SELF_ADVERBS})?\\s+${form}(?:\\s|$)`,
  ).test(text));
}

export function detectStrongUserGrammaticalGender(value) {
  const text = normalize(value);
  if (!text) return null;

  const explicitMale = EXPLICIT_MALE.test(text);
  const explicitFemale = EXPLICIT_FEMALE.test(text);
  if (explicitMale && explicitFemale) return null;
  if (explicitFemale) return 'female';
  if (explicitMale) return 'male';

  const selfFemale = hasSelfForm(text, FEMALE_SELF_FORMS);
  const selfMale = hasSelfForm(text, MALE_SELF_FORMS);
  if (selfFemale && selfMale) return null;
  if (selfFemale) return 'female';
  if (selfMale) return 'male';
  return null;
}

export function inferUserGrammaticalGender({ latestPrompt = '', priorUserPrompts = [] } = {}) {
  const latest = detectStrongUserGrammaticalGender(latestPrompt);
  if (latest) return latest;

  const prior = Array.isArray(priorUserPrompts) ? priorUserPrompts : [];
  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const signal = detectStrongUserGrammaticalGender(prior[index]);
    if (signal) return signal;
  }
  return null;
}

export function grammarHintLabel(gender) {
  if (gender === 'female') return 'feminine';
  if (gender === 'male') return 'masculine';
  return 'unknown';
}

export function parseGrammarGenderHint(contextPrompt) {
  const match = String(contextPrompt || '').match(/User grammatical form for Arabic address:\s*(feminine|masculine|unknown)/i);
  if (!match || match[1].toLowerCase() === 'unknown') return null;
  return match[1].toLowerCase() === 'feminine' ? 'female' : 'male';
}

const FEMALE_REPLACEMENTS = [
  ['يا معلم', 'يا بطلة'],
  ['منور', 'منورة'],
  ['وإنت أخبارك', 'وإنتِ أخبارك'],
  ['عامل إيه إنت؟', 'عاملة إيه إنتِ؟'],
  ['إنت عامل إيه؟', 'إنتِ عاملة إيه؟'],
  ['حبيبي،', 'حبيبتي،'],
  ['تسلم إنت', 'تسلمي إنتِ'],
  ['تسلملي', 'تسلميلي'],
  ['تسلم 😄', 'تسلمي 😄'],
  ['وقت ما تحب', 'وقت ما تحبي'],
  ['إنت محتاج', 'إنتِ محتاجة'],
  ['إنت مش محتاج', 'إنتِ مش محتاجة'],
  ['متستناش', 'متستنيش'],
  ['اعمل أول', 'اعملي أول'],
  ['شد حيلك', 'شدي حيلك'],
  ['ركّز', 'ركّزي'],
  ['تقدر تعمله', 'تقدري تعمليه'],
  ['خلّص الخطوة', 'خلّصي الخطوة'],
  ['ماشية معاك', 'ماشية معاكي'],
  ['أنا معاك', 'أنا معاكي'],
  ['موجود معاك', 'موجود معاكي'],
  ['الدنيا معاك', 'الدنيا معاكي'],
  ['ظبط معاك', 'ظبط معاكي'],
  ['لما ترجع', 'لما ترجعي'],
  ['تصبح على خير لو هتقفلها', 'تصبحي على خير لو هتقفليها'],
  ['متقلقش', 'متقلقيش'],
  ['محتاج توصل لإيه', 'محتاجة توصلي لإيه'],
  ['اللي عايز توصله', 'اللي عايزة توصليله'],
];

const NEUTRAL_REPLACEMENTS = [
  ['يا معلم، ', ''],
  [' يا معلم', ''],
  ['منور.', 'أهلًا بيك.'],
  ['حبيبي، تحت أمرك', 'العفو، تحت أمرك'],
  ['تسلم إنت 😄', 'العفو 😄'],
  ['عامل إيه إنت؟', 'إيه أخبارك؟'],
  ['إنت عامل إيه؟', 'إيه الأخبار عندك؟'],
  ['الدنيا معاك عاملة إيه؟', 'الدنيا عندك عاملة إيه؟'],
  ['موجود معاك', 'موجود هنا'],
  ['أنا معاك', 'أنا موجود'],
  ['المهم إن الموضوع ظبط معاك', 'المهم إن الموضوع ظبط'],
  ['إنت محتاج حركة واحدة بس دلوقتي:', 'خلينا نبدأ بحركة واحدة بس دلوقتي:'],
  ['إنت مش محتاج تخلص كل حاجة مرة واحدة.', 'مش لازم تخلص كل حاجة مرة واحدة.'],
  ['شد حيلك 🔥', 'يلا نتحرك 🔥'],
  ['متستناش المزاج المثالي.', 'بلاش نستنى المزاج المثالي.'],
  ['محتاج توصل لإيه', 'إيه الهدف المطلوب'],
  ['متقلقش،', 'ولا تشغل بالك،'],
  ['تصبح على خير لو هتقفلها النهارده 🌙', 'ليلة هادية 🌙'],
];

function applyReplacements(value, replacements) {
  let result = String(value || '');
  for (const [from, to] of replacements) result = result.split(from).join(to);
  return result.replace(/\s{2,}/g, ' ').trim();
}

export function adaptArabicConversationalReply(answer, gender) {
  if (!answer) return answer;
  if (gender === 'female') return applyReplacements(answer, FEMALE_REPLACEMENTS);
  if (gender === 'male') return String(answer);
  return applyReplacements(answer, NEUTRAL_REPLACEMENTS);
}
