const STOP_WORDS = new Set([
  'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'الذين', 'على', 'إلى', 'الى', 'من', 'في', 'عن', 'مع', 'أو', 'او',
  'هو', 'هي', 'هم', 'تم', 'كان', 'كانت', 'يكون', 'تكون', 'كل', 'بعض', 'أي', 'اي', 'لا', 'لم', 'لن', 'ما', 'هل',
  'بين', 'بعد', 'قبل', 'عند', 'حيث', 'كما', 'لذلك', 'لكن', 'بل', 'ثم', 'إن', 'ان', 'أن', 'قد', 'جدا', 'فقط',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were', 'have', 'has', 'had', 'will',
  'into', 'about', 'than', 'then', 'also', 'only', 'can', 'could', 'should', 'would', 'their', 'there', 'which',
]);

const ARABIC_NORM_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06EDـ]/g;

function normalizeToken(word) {
  return String(word || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(ARABIC_NORM_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^ال(?=\p{L}{3,})/u, '')
    .trim();
}

function cleanText(value, maxLength = 40_000) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function extractSentences(value) {
  return String(value || '')
    .split(/(?<=[.!؟؛\n])\s+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((line) => line.length >= 16);
}

export function extractMaterialKeywords(value, limit = 10) {
  const counts = new Map();
  const displayForms = new Map();
  const rawTokens = String(value || '').match(/[\p{L}\p{N}#+-]{3,}/gu) || [];

  for (const raw of rawTokens) {
    const norm = normalizeToken(raw);
    if (norm.length < 3 || STOP_WORDS.has(norm) || /^\d+$/.test(norm)) continue;
    counts.set(norm, (counts.get(norm) || 0) + 1);
    if (!displayForms.has(norm)) displayForms.set(norm, raw);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, Math.max(1, limit))
    .map(([norm]) => displayForms.get(norm) || norm);
}

function scoreSentence(sentence, keywordSet, index, total) {
  const words = String(sentence || '').match(/[\p{L}\p{N}#+-]{3,}/gu) || [];
  if (!words.length) return 0;
  let hits = 0;
  for (const word of words) {
    if (keywordSet.has(normalizeToken(word))) hits += 1;
  }
  const density = hits / Math.sqrt(words.length);
  const positionBonus = index === 0 ? 0.35 : index < Math.ceil(total * 0.25) ? 0.18 : 0;
  const definitionBonus = /(?:يعني|هو عبارة|تُعرّف|يمثل|يتكون من|الفرق بين|أهم|أساسي|قاعدة|is defined as|refers to|consists of|key|important)/i.test(sentence) ? 0.28 : 0;
  const numericBonus = /\d+/.test(sentence) ? 0.12 : 0;
  return density + positionBonus + definitionBonus + numericBonus;
}

function topSentences(text, limit = 5) {
  const list = extractSentences(text);
  if (!list.length) {
    const fallback = cleanText(text, 320);
    return fallback ? [fallback] : [];
  }
  const keywords = new Set(extractMaterialKeywords(text, 14).map(normalizeToken));
  return list
    .map((sentence, index) => ({ sentence, index, score: scoreSentence(sentence, keywords, index, list.length) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

export function parseMaterialSources(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, idx) => {
      const content = cleanText(typeof item === 'string' ? item : item?.content || item?.text || '');
      if (!content) return null;
      const words = content.split(/\s+/).filter(Boolean);
      const title = cleanText(
        typeof item === 'object' && item?.title ? item.title : `المادة ${idx + 1}`,
        100,
      ) || `المادة ${idx + 1}`;
      return {
        id: (typeof item === 'object' && item?.id) || `mat-${idx + 1}`,
        title,
        content,
        wordCount: words.length,
        readingMinutes: Math.max(1, Math.ceil(words.length / 170)),
        keywords: extractMaterialKeywords(content, 8),
        highlights: topSentences(content, 5),
      };
    })
    .filter(Boolean);
}

function sentenceSignature(sentence) {
  return new Set(
    (String(sentence || '').match(/[\p{L}\p{N}]{3,}/gu) || [])
      .map(normalizeToken)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function jaccardSimilarity(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) return 0;
  let shared = 0;
  for (const item of leftSet) if (rightSet.has(item)) shared += 1;
  return shared / (leftSet.size + rightSet.size - shared);
}

export function summarizeMaterials(rawItems = [], { depth = 'balanced', language = 'ar', focus = '' } = {}) {
  const en = language === 'en';
  const materials = parseMaterialSources(rawItems);
  if (!materials.length) return '';

  const pointsPerSource = depth === 'concise' ? 3 : depth === 'detailed' ? 7 : 5;
  const combinedText = materials.map((item) => item.content).join('\n\n');
  const globalKeywords = extractMaterialKeywords(combinedText, depth === 'concise' ? 6 : 12);
  const totalWords = materials.reduce((sum, item) => sum + item.wordCount, 0);
  const totalMinutes = Math.max(1, Math.ceil(totalWords / 170));

  const lines = [
    en
      ? `### Smart Material Summary (${materials.length} ${materials.length === 1 ? 'source' : 'sources'} · ${totalWords} words · ~${totalMinutes} min read)`
      : `### ملخص ذكي للمواد (${materials.length} ${materials.length === 1 ? 'مادة' : 'مواد'} · ${totalWords} كلمة · قراءة ~${totalMinutes} دقائق)`,
  ];

  if (focus.trim()) {
    lines.push(en ? `- **Requested focus:** ${focus.trim()}` : `- **زاوية التركيز المطلوبة:** ${focus.trim()}`);
  }

  for (const material of materials) {
    const selected = topSentences(material.content, pointsPerSource);
    lines.push('', `#### ${material.title}`);
    selected.forEach((point, idx) => {
      lines.push(`${idx + 1}. ${point}`);
    });
  }

  if (globalKeywords.length) {
    lines.push(
      '',
      en ? '### Key Concepts & Terms' : '### أهم المصطلحات والمفاهيم المحورية',
      `- ${globalKeywords.join(' • ')}`,
    );
  }

  lines.push(
    '',
    en ? '### Active Recall Check' : '### مراجعة نشطة لتثبيت الفهم',
    en
      ? `1. Explain the relationship between **${globalKeywords[0] || 'the core idea'}** and **${globalKeywords[1] || 'its application'}** in your own words.`
      : `1. اشرح بكلماتك العلاقة بين **${globalKeywords[0] || 'الفكرة الأساسية'}** و**${globalKeywords[1] || 'تطبيقها العملي'}** بدون الرجوع للنص.`,
    en
      ? '2. Which point in this summary would change the outcome if its main condition changed?'
      : '2. ما أهم شرط أو قاعدة في هذا الملخص لو تغيرت ستتغير النتيجة؟',
  );

  return lines.join('\n').trim();
}

export function mergeMaterials(rawItems = [], { language = 'ar', goal = '' } = {}) {
  const en = language === 'en';
  const materials = parseMaterialSources(rawItems);
  if (!materials.length) return '';
  if (materials.length === 1) return summarizeMaterials(rawItems, { depth: 'detailed', language, focus: goal });

  const keywordSourceCount = new Map();
  const keywordDisplay = new Map();
  for (const material of materials) {
    const seenInMaterial = new Set();
    for (const kw of extractMaterialKeywords(material.content, 14)) {
      const norm = normalizeToken(kw);
      if (!norm || seenInMaterial.has(norm)) continue;
      seenInMaterial.add(norm);
      keywordSourceCount.set(norm, (keywordSourceCount.get(norm) || 0) + 1);
      if (!keywordDisplay.has(norm)) keywordDisplay.set(norm, kw);
    }
  }

  const sharedTerms = [...keywordSourceCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([norm]) => keywordDisplay.get(norm) || norm);

  const acceptedSignatures = [];
  const unifiedTimeline = [];
  const uniqueBySource = [];

  for (const material of materials) {
    const candidates = topSentences(material.content, 6);
    const uniquePoints = [];
    for (const sentence of candidates) {
      const sig = sentenceSignature(sentence);
      const duplicate = acceptedSignatures.some((existing) => jaccardSimilarity(sig, existing) >= 0.56);
      if (!duplicate) {
        acceptedSignatures.push(sig);
        unifiedTimeline.push({ source: material.title, sentence });
        uniquePoints.push(sentence);
      }
    }
    uniqueBySource.push({ title: material.title, points: uniquePoints.slice(0, 3) });
  }

  const lines = [
    en
      ? `### Unified Synthesis of ${materials.length} Materials`
      : `### الدمج المنهجي الموحد لـ ${materials.length} مواد دراسية / معرفية`,
  ];

  if (goal.trim()) {
    lines.push(en ? `- **Synthesis objective:** ${goal.trim()}` : `- **هدف الدمج والتركيب:** ${goal.trim()}`);
  }

  lines.push(
    '',
    en ? '### 1. Shared Concepts Across Sources' : '### ١. القواسم والمفاهيم المشتركة بين المواد',
    sharedTerms.length
      ? `- ${sharedTerms.join(' • ')}`
      : (en
        ? '- The provided materials cover complementary angles with minimal direct lexical overlap; they have been linked sequentially below.'
        : '- تغطي المواد المرفقة زوايا متكاملة بتداخل لفظي محدود؛ تم ربطها في تسلسل منطقي موحد بالأسفل.'),
  );

  lines.push('', en ? '### 2. Deduplicated Master Synthesis' : '### ٢. الملخص المدمج بدون تكرار');
  unifiedTimeline.slice(0, 12).forEach((entry, index) => {
    lines.push(`${index + 1}. **[${entry.source}]** ${entry.sentence}`);
  });

  lines.push('', en ? '### 3. Distinct Angle of Each Source' : '### ٣. ما تنفرد به كل مادة عن الأخرى');
  for (const item of uniqueBySource) {
    const summaryPoint = item.points[0] || (en ? 'Reinforces the shared core concepts.' : 'تدعم المفاهيم المشتركة بأمثلة مكملة.');
    lines.push(`- **${item.title}:** ${summaryPoint}`);
  }

  lines.push(
    '',
    en ? '### 4. Synthesis & Exam Connections' : '### ٤. خلاصة الربط والاستنتاج للتطبيق والامتحان',
    en
      ? '- Study the unified sequence first to grasp the big picture, then review each source’s unique angle for detailed examples and edge cases.'
      : '- ذاكر «الملخص المدمج» أولًا لتكوين الصورة الكلية المترابطة، ثم راجع «ما تنفرد به كل مادة» لضمان تغطية التفاصيل الدقيقة ومواضع الأسئلة المقالية.',
  );

  return lines.join('\n').trim();
}

export function buildDeepThinkingTrace(prompt, { materials = [], language = 'ar', intent = 'analyze' } = {}) {
  const en = language === 'en';
  const parsed = parseMaterialSources(materials);
  const keywords = extractMaterialKeywords(
    [prompt, ...parsed.map((item) => item.content)].join('\n'),
    7,
  );

  const steps = [
    {
      id: 'decompose',
      title: en ? '1. Decompose Goal & Scope' : '١. تفكيك الهدف وحدود المطلوب',
      detail: parsed.length
        ? (en
          ? `Detected ${parsed.length} attached source(s) (${parsed.reduce((acc, m) => acc + m.wordCount, 0)} words) with primary task "${intent}".`
          : `تحليل ${parsed.length} ${parsed.length === 1 ? 'مادة مرفقة' : 'مواد مرفقة'} (${parsed.reduce((acc, m) => acc + m.wordCount, 0)} كلمة) وتحديد نمط المعالجة الأنسب (${intent}).`)
        : (en
          ? `Identified primary task "${intent}" and separated explicit requirements from assumptions.`
          : `تحديد الهدف الأساسي للطلب (${intent}) وفصل المعطيات الصريحة عن الافتراضات.`),
    },
    {
      id: 'concepts',
      title: en ? '2. Extract Core Pillars' : '٢. استخراج الركائز والمفاهيم الحاكمة',
      detail: keywords.length
        ? (en ? `Key anchors: ${keywords.join(', ')}.` : `المفاهيم المفتاحية المستخرجة: ${keywords.join('، ')}.`)
        : (en ? 'Focused on structural relationships and cause-effect links.' : 'التركيز على العلاقات السببية والروابط البنيوية للموضوع.'),
    },
    {
      id: 'merge',
      title: en ? '3. Cross-Link & Synthesize' : '٣. الربط والدمج ومنع التكرار',
      detail: parsed.length > 1
        ? (en
          ? 'Aligned overlapping ideas across materials, eliminated duplicate points, and preserved source-specific nuances.'
          : 'مطابقة النقاط المشتركة بين المواد، حذف الحشو المكرر، والاحتفاظ بالفروق الدقيقة لكل مصدر.')
        : (en
          ? 'Connected principles to concrete applications, examples, and counterexamples.'
          : 'ربط الفكرة النظرية بالأمثلة التطبيقية والحالات الحدية لتعميق الفهم.'),
    },
    {
      id: 'verify',
      title: en ? '4. Critical Verification Pass' : '٤. المراجعة النقدية وفحص نقاط اللبس',
      detail: en
        ? 'Checked for overgeneralizations, missing conditions, and common exam/practical pitfalls.'
        : 'مراجعة الاستنتاجات ضد التعميم الزائد، التحقق من الشروط الحاكمة، وتوضيح الأخطاء الشائعة.',
    },
  ];

  return {
    intent,
    keywords,
    materialCount: parsed.length,
    steps,
  };
}

export function buildMaterialPromptEnvelope({
  action = 'summarize',
  materials = [],
  userPrompt = '',
  deepThink = false,
  language = 'ar',
} = {}) {
  const en = language === 'en';
  const parsed = parseMaterialSources(materials);
  if (!parsed.length) return String(userPrompt || '').trim();

  const perSourceBudget = Math.max(1200, Math.floor(9600 / parsed.length));
  const actionInstruction = action === 'merge'
    ? (en
      ? 'Synthesize and merge all attached materials into ONE cohesive, deduplicated study/work guide. Highlight: (1) Shared core concepts, (2) Unified structured explanation, (3) Unique points per source, (4) Any contrasts/differences, and (5) Active review questions.'
      : 'ادمج واربط جميع المواد المرفقة في مخرج واحد متكامل ومنظم بدون تكرار، مع توضيح: (١) القواسم والمفاهيم المشتركة، (٢) الشرح المدمج المترابط، (٣) ما تنفرد به كل مادة، (٤) الفروق أو التعارضات إن وجدت، (٥) أسئلة مراجعة ذكية.')
    : action === 'think'
      ? (en
        ? 'Analyze the attached materials deeply from first principles: uncover underlying relationships, hidden assumptions, cause-and-effect chains, practical implications, and critical exam/decision questions.'
        : 'فكّر بعمق وحلل المواد المرفقة تحليلًا نقديًا ومنطقيًا: استخرج الروابط العميقة، الشروط الحاكمة، الأسباب والنتائج، نقاط اللبس الشائعة، وأهم الاستنتاجات العملية.')
      : (en
        ? 'Summarize the attached materials clearly and comprehensively: extract executive takeaways, structured bullet points, key terminology, and active recall questions without losing vital details.'
        : 'لخّص المواد المرفقة بوضوح وتركيز عالٍ دون إخلال بالتفاصيل المهمة: قدّم خلاصة مركزة، نقاطًا منظمة، أهم المصطلحات والتعريفات، وأسئلة مراجعة سريعة.');

  const blocks = [
    actionInstruction,
    deepThink
      ? (en
        ? 'Deep Thinking Mode: verify cross-source consistency and highlight subtle distinctions.'
        : 'وضع التفكير العميق مفعّل: افحص اتساق المعلومات بين المصادر ووضّح الفروق الدقيقة والروابط المنطقية.')
      : '',
    userPrompt.trim()
      ? (en ? `Additional user instruction: ${userPrompt.trim()}` : `توجيه إضافي من المستخدم: ${userPrompt.trim()}`)
      : '',
    '',
    ...parsed.map((item, idx) => (
      `=== [${idx + 1}] ${item.title} (${item.wordCount} words) ===\n${item.content.slice(0, perSourceBudget)}`
    )),
  ];

  return blocks.filter((line) => line !== '').join('\n\n').slice(0, 11_800);
}
