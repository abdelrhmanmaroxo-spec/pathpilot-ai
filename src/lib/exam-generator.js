import { extractMaterialKeywords } from './material-intelligence.js';
import { detectDominantLanguage } from './live-content-translator.js';

// ============================================================================
// PathPilot AI v6.0 — Interactive Exam & Past Online Exam Intelligence Engine
// Parses real past online exams + generates adaptive MCQ, True/False & Short Qs
// ============================================================================

const ONLINE_EXAM_SIGNAL_RE = /(?:امتحانات?\s*(?:اونلاين|أونلاين|سابقة|سابقه|السنين|فاينل|ميدتيرم)|اسئله?\s*امتحان|أسئلة\s*امتحان|online\s*(?:exam|quiz|test)|past\s*(?:exam|paper|questions)|midterm|final\s*exam)/i;

export function hasOnlineExamSignal(text = '', instructions = '') {
  const combined = `${text || ''}\n${instructions || ''}`;
  if (ONLINE_EXAM_SIGNAL_RE.test(combined)) return true;
  // Also detect 2+ numbered questions with choices A/B/C/D or أ/ب/ج/د
  const optionMatches = combined.match(/(?:^|\n)\s*(?:[A-Da-dأبجد]\s*[)\].:-])/gm);
  return Boolean(optionMatches && optionMatches.length >= 4);
}

function cleanLine(line) {
  return String(line || '').replace(/\s+/g, ' ').trim();
}

export function extractPastOnlineExamQuestions(rawText = '') {
  const text = String(rawText || '').replace(/\r\n/g, '\n');
  if (!text.trim()) return [];

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const extracted = [];
  let current = null;

  const questionStartRe = /^(?:س\s*\d*|Q\s*\d+|Question\s*\d+|\d+\s*[.)\]:-])\s*(.+)/i;
  const optionLineRe = /^(?:([A-Da-dأبجد])\s*[.)\]:-])\s*(.+)/;
  const answerHintRe = /^(?:الإجابة(?:\s*الصحيحة)?|الاجابة|الحل|Answer|Correct(?:\s*Answer)?)\s*[:=-]\s*(.+)/i;
  const tfHintRe = /\((?:\s*(?:صح|خطأ|غلط|True|False)\s*(?:\/|\||،|,|-)\s*(?:صح|خطأ|غلط|True|False)\s*)\)/i;

  const flushCurrent = () => {
    if (!current || !current.stem || current.stem.length < 6) {
      current = null;
      return;
    }
    if (current.options.length >= 2) {
      const paddedOptions = current.options.slice(0, 4);
      let correctIdx = current.correctIndex;
      if (correctIdx < 0 || correctIdx >= paddedOptions.length) correctIdx = 0;
      extracted.push({
        id: `past-q-${extracted.length + 1}`,
        type: 'mcq',
        sourceTag: 'past-online-exam',
        stem: current.stem,
        options: paddedOptions,
        correctIndex: correctIdx,
        explanation: current.explanation || (detectDominantLanguage(current.stem) === 'en'
          ? `Extracted directly from your past online exam materials. Review "${paddedOptions[correctIdx]}" carefully.`
          : `سؤال مستخرج مباشرة من الامتحانات الأونلاين المرفقة — ركّز جيدًا على فكرة «${paddedOptions[correctIdx]}» لأنها موضع تكرار في الامتحان.`),
      });
    } else if (tfHintRe.test(current.stem) || /^(?:ضع علامة صح|صح أم خطأ|صح أو خطأ|True or False)/i.test(current.stem)) {
      const en = detectDominantLanguage(current.stem) === 'en';
      const isFalse = /خطأ|غلط|false/i.test(current.rawAnswer || '');
      extracted.push({
        id: `past-q-${extracted.length + 1}`,
        type: 'tf',
        sourceTag: 'past-online-exam',
        stem: current.stem.replace(tfHintRe, '').trim(),
        options: en ? ['True', 'False'] : ['صح', 'خطأ'],
        correctIndex: isFalse ? 1 : 0,
        explanation: current.explanation || (en
          ? 'Past online exam True/False checkpoint.'
          : 'نقطة صح وخطأ واردة في الامتحانات الأونلاين — انتبه لأدوات النفي والشروط في العبارة.'),
      });
    } else if (current.stem.endsWith('؟') || current.stem.endsWith('?') || /^(?:اشرح|عرف|عرّف|قارن|علل|اذكر|ما\s|لماذا|كيف|Explain|Define|Compare|Why|How|What)/i.test(current.stem)) {
      extracted.push({
        id: `past-q-${extracted.length + 1}`,
        type: 'short',
        sourceTag: 'past-online-exam',
        stem: current.stem,
        modelAnswer: current.rawAnswer || (detectDominantLanguage(current.stem) === 'en'
          ? 'State the core definition clearly, list the main pillars, and support your answer with one concrete example from the lecture.'
          : 'اكتب التعريف الدقيق أولًا، ثم اذكر العناصر الأساسية مدعومة بمثال تطبيقي مباشر من المنهج.'),
        keywords: extractMaterialKeywords(current.stem, 4),
        explanation: current.explanation || (detectDominantLanguage(current.stem) === 'en'
          ? 'Past exam open question — graded on key terminology and clarity.'
          : 'سؤال مقالي/مباشر من أسئلة الامتحانات السابقة — احرص على ذكر المصطلحات المفتاحية في إجابتك.'),
      });
    }
    current = null;
  };

  for (const line of lines) {
    const ansMatch = line.match(answerHintRe);
    if (ansMatch && current) {
      const ansRaw = cleanLine(ansMatch[1]);
      current.rawAnswer = ansRaw;
      const letterMap = { a: 0, b: 1, c: 2, d: 3, 'أ': 0, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      const firstToken = ansRaw[0]?.toLowerCase();
      if (firstToken && Object.hasOwn(letterMap, firstToken) && ansRaw.length <= 4) {
        current.correctIndex = letterMap[firstToken];
      } else if (current.options.length) {
        const foundIdx = current.options.findIndex((opt) => ansRaw.includes(opt) || opt.includes(ansRaw));
        if (foundIdx !== -1) current.correctIndex = foundIdx;
      }
      current.explanation = ansRaw.length > 4 ? ansRaw : '';
      continue;
    }

    const optMatch = line.match(optionLineRe);
    if (optMatch && current) {
      let optText = cleanLine(optMatch[2]);
      const inlineCorrect = /\(\s*(?:صح|صحيحة|correct|\*|✓|✔)\s*\)/i.test(optText);
      if (inlineCorrect) {
        optText = optText.replace(/\(\s*(?:صح|صحيحة|correct|\*|✓|✔)\s*\)/gi, '').trim();
        current.correctIndex = current.options.length;
      }
      current.options.push(optText);
      continue;
    }

    const qMatch = line.match(questionStartRe);
    if (qMatch) {
      flushCurrent();
      current = {
        stem: cleanLine(qMatch[1]),
        options: [],
        correctIndex: -1,
        rawAnswer: '',
        explanation: '',
      };
      continue;
    }

    if (!current && (line.endsWith('؟') || line.endsWith('?'))) {
      current = {
        stem: cleanLine(line),
        options: [],
        correctIndex: -1,
        rawAnswer: '',
        explanation: '',
      };
      flushCurrent();
    }
  }

  flushCurrent();
  return extracted;
}

function extractConceptStatements(rawText = '') {
  const clean = String(rawText || '').replace(/\r\n/g, '\n');
  const rawSentences = clean
    .split(/(?<=[.!؟\n])\s+/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length >= 24 && s.length <= 260 && !/^(?:س\d|Q\d|[A-Dأبجد][)\].:-])/i.test(s));

  const unique = [];
  const seen = new Set();
  for (const s of rawSentences) {
    const key = s.slice(0, 45).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  return unique;
}

const BUILTIN_TOPIC_FACTS = {
  programming: {
    ar: [
      { term: 'الخوارزمية (Algorithm)', def: 'مجموعة خطوات منطقية محددة ومرتبة لحل مشكلة معينة والوصول لمخرج واضح في وقت محدود.' },
      { term: 'تعقيد الوقت Big-O', def: 'مقياس رياضي يصف معدل نمو وقت تنفيذ الكود كلما زاد حجم المدخلات (n).' },
      { term: 'البرمجة الكائنية (OOP)', def: 'تنظيم البرمجيات حول الكائنات والبيانات عبر 4 ركائز: التغليف، الوراثة، تعدد الأشكال، والتجريد.' },
      { term: 'هياكل البيانات (Data Structures)', def: 'طرق تنظيم وتخزين البيانات في الذاكرة مثل المصفوفات والـ Hash Map والأشجار لتسريع البحث والتعديل.' },
      { term: 'الاستدعاء الذاتي (Recursion)', def: 'قيام الدالة باستدعاء نفسها مع شرط توقف واضح (Base Case) لمنع التكرار اللانهائي.' },
    ],
    en: [
      { term: 'Algorithm', def: 'A finite, well-ordered sequence of unambiguous steps designed to solve a specific problem.' },
      { term: 'Big-O Time Complexity', def: 'An asymptotic measure of how execution time scales as input size (n) grows.' },
      { term: 'Encapsulation in OOP', def: 'Bundling internal state with methods while restricting direct external mutation of private fields.' },
      { term: 'Hash Table', def: 'A key-value data structure providing O(1) average-case lookup using a deterministic hash function.' },
      { term: 'Recursion Base Case', def: 'The terminating condition that stops recursive calls and prevents call-stack overflow.' },
    ],
  },
  databases: {
    ar: [
      { term: 'المفتاح الأساسي (Primary Key)', def: 'عمود أو مجموعة أعمدة تميز كل صف في الجدول بشكل فريد ولا تقبل القيم الفارغة NULL.' },
      { term: 'المفتاح الأجنبي (Foreign Key)', def: 'حقل يربط جدولًا بآخر عبر الإشارة إلى المفتاح الأساسي لضمان التكامل المرجعي.' },
      { term: 'خصائص المعاملات ACID', def: 'الذرية والاتساق والعزل والديمومة لضمان سلامة البيانات أثناء العمليات المتزامنة.' },
      { term: 'التطبيع (Normalization)', def: 'تنظيم الجداول لتقليل تكرار البيانات ومنع مشاكل الإضافة والتعديل والحذف.' },
      { term: 'الفهرس (Database Index)', def: 'بنية بحث مساعدة مثل B-Tree تسرّع استعلامات SELECT لكنها تضيف كلفة بسيطة عند الكتابة.' },
    ],
    en: [
      { term: 'Primary Key', def: 'A unique, non-null identifier that distinguishes every row in a relational table.' },
      { term: 'Foreign Key', def: 'A column referencing a primary key in another table to enforce referential integrity.' },
      { term: 'ACID Transactions', def: 'Atomicity, Consistency, Isolation, and Durability guarantees for reliable database writes.' },
      { term: 'Normalization', def: 'Structuring relational tables to eliminate data redundancy and update anomalies.' },
      { term: 'B-Tree Index', def: 'An ordered lookup structure that accelerates SELECT queries while adding minor write overhead.' },
    ],
  },
  networks: {
    ar: [
      { term: 'بروتوكول TCP', def: 'بروتوكول نقل موثوق يعتمد على المصافحة الثلاثية ويضمن وصول الحزم بالترتيب وبدون فقد.' },
      { term: 'بروتوكول UDP', def: 'بروتوكول نقل سريع غير متصل مناسب للبث الحي والألعاب حيث السرعة أهم من إعادة الإرسال.' },
      { term: 'نظام أسماء النطاقات DNS', def: 'ترجمة أسماء المواقع المقروءة للبشر إلى عناوين IP الرقمية المقابلة لها.' },
      { term: 'بروتوكول HTTPS / TLS', def: 'تشفير الاتصال بين المتصفح والخادم لحماية البيانات من التنصت والتلاعب.' },
      { term: 'عنوان الشبكة الفرعية Subnet Mask', def: 'تحديد الجزء الخاص بالشبكة والجزء الخاص بالأجهزة داخل عنوان الـ IP.' },
    ],
    en: [
      { term: 'TCP Protocol', def: 'A connection-oriented transport protocol guaranteeing ordered, reliable packet delivery via 3-way handshake.' },
      { term: 'UDP Protocol', def: 'A lightweight connectionless transport protocol prioritizing low latency for streaming and gaming.' },
      { term: 'DNS Resolution', def: 'Translating human-readable domain names into routable numerical IP addresses.' },
      { term: 'TLS in HTTPS', def: 'Encrypting HTTP traffic end-to-end with cryptographic certificates and session keys.' },
      { term: 'Subnet Mask', def: 'Separating the network prefix bits from host identifier bits in an IP address.' },
    ],
  },
};

function selectFallbackFacts(topic = '', lang = 'ar') {
  const t = String(topic || '').toLowerCase();
  if (/sql|database|قواعد بيانات|جدول|داتابيز/.test(t)) return BUILTIN_TOPIC_FACTS.databases[lang];
  if (/network|tcp|http|dns|شبكات|أمن|سيبراني|security/.test(t)) return BUILTIN_TOPIC_FACTS.networks[lang];
  return BUILTIN_TOPIC_FACTS.programming[lang];
}

function buildFactPairsFromText(rawText, topic, lang) {
  const statements = extractConceptStatements(rawText);
  const keywords = extractMaterialKeywords(rawText || topic, 14);
  const pairs = [];

  for (const stmt of statements) {
    const defMatch = stmt.match(/^([^:–—-]{3,55})\s*[:–—-]\s*(.{15,})$/)
      || stmt.match(/^(.{3,50}?)\s+(?:هو|هي|عبارة عن|يقصد به|يُعرف بأنه|تُعرف بأنها|is defined as|refers to|is a|means)\s+(.{15,})$/i);
    if (defMatch) {
      pairs.push({
        term: cleanLine(defMatch[1]),
        def: cleanLine(defMatch[2]),
      });
    } else {
      const matchedKw = keywords.find((kw) => stmt.toLowerCase().includes(kw.toLowerCase()));
      pairs.push({
        term: matchedKw || stmt.split(/\s+/).slice(0, 4).join(' '),
        def: stmt,
      });
    }
  }

  if (pairs.length < 4) {
    const seed = selectFallbackFacts(topic || rawText, lang);
    const topicLabel = cleanLine(topic || '').slice(0, 50);
    for (const item of seed) {
      pairs.push({
        term: topicLabel && !rawText ? `${item.term} (${topicLabel})` : item.term,
        def: item.def,
      });
    }
  }

  return pairs;
}

export function generateInteractiveExam({
  title = '',
  sourceText = '',
  topic = '',
  instructions = '',
  questionCount = 10,
  questionTypes = 'mixed', // 'mixed' | 'mcq' | 'tf' | 'comprehensive'
  difficulty = 'exam', // 'standard' | 'exam'
  language = 'auto',
} = {}) {
  const targetLang = language === 'en' || language === 'ar'
    ? language
    : detectDominantLanguage(`${sourceText}\n${topic}\n${instructions}`);
  const en = targetLang === 'en';
  const count = Math.max(3, Math.min(30, Number(questionCount) || 10));
  const onlineExamDetected = hasOnlineExamSignal(sourceText, instructions);

  // 1. First extract any real past online exam questions present in sourceText!
  const pastQuestions = extractPastOnlineExamQuestions(sourceText);
  const questions = [];

  for (const pq of pastQuestions) {
    if (questions.length >= count) break;
    questions.push({
      ...pq,
      badge: en ? 'Past Online Exam' : 'سؤال امتحان أونلاين سابق',
    });
  }

  // 2. Synthesize additional curriculum-grounded questions up to `count`
  const facts = buildFactPairsFromText(sourceText, topic || title, en ? 'en' : 'ar');
  let cursor = 0;

  while (questions.length < count && facts.length > 0) {
    const idx = cursor % facts.length;
    const current = facts[idx];
    const sibling1 = facts[(idx + 1) % facts.length];
    const sibling2 = facts[(idx + 2) % facts.length];
    const sibling3 = facts[(idx + 3) % facts.length];

    const slotType = questionTypes === 'mcq'
      ? 'mcq'
      : questionTypes === 'tf'
        ? 'tf'
        : (cursor % 5 === 3 ? 'tf' : (questionTypes === 'comprehensive' && cursor % 5 === 4 ? 'short' : 'mcq'));

    const qNum = questions.length + 1;

    if (slotType === 'mcq') {
      const distractors = [sibling1?.def, sibling2?.def, sibling3?.def]
        .filter((d) => d && d !== current.def)
        .slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(en
          ? `An unrelated secondary assumption outside the core scope of ${current.term}.`
          : `افتراض غير دقيق يخالف القاعدة الأساسية المرتبطة بـ «${current.term}».`);
      }

      const rawOptions = [current.def, ...distractors];
      const correctPos = qNum % 4;
      const rotated = [...rawOptions];
      const [correctItem] = rotated.splice(0, 1);
      rotated.splice(correctPos, 0, correctItem);

      questions.push({
        id: `gen-q-${qNum}`,
        type: 'mcq',
        sourceTag: onlineExamDetected ? 'online-exam-twin' : 'curriculum',
        badge: onlineExamDetected
          ? (en ? 'Online Exam Twin Focus' : 'محاكاة لنمط الامتحان الأونلاين')
          : (en ? 'Curriculum Concept' : 'سؤال فهم من المنهج'),
        stem: difficulty === 'exam'
          ? (en
            ? `In an online exam scenario, which statement most accurately defines or characterizes "${current.term}"?`
            : `وفقًا لما ورد في المنهج، أي العبارات التالية يعبّر بدقة عن «${current.term}»؟`)
          : (en
            ? `What is the accurate description of "${current.term}"?`
            : `ما المقصود بـ «${current.term}» أو أهم ما يميزه؟`),
        options: rotated,
        correctIndex: correctPos,
        explanation: en
          ? `Correct! "${current.term}": ${current.def}`
          : `الإجابة الصحيحة مرتبطة بـ «${current.term}»: ${current.def}`,
      });
    } else if (slotType === 'tf') {
      const makeTrue = cursor % 2 === 0;
      const shownDef = makeTrue ? current.def : (sibling1?.def && sibling1.def !== current.def ? sibling1.def : current.def);
      const actuallyTrue = shownDef === current.def;
      questions.push({
        id: `gen-q-${qNum}`,
        type: 'tf',
        sourceTag: 'curriculum',
        badge: en ? 'True / False Check' : 'تحقق صح أم خطأ',
        stem: en
          ? `True or False: Regarding "${current.term}", ${shownDef}`
          : `صح أم خطأ: بخصوص «${current.term}» — ${shownDef}`,
        options: en ? ['True', 'False'] : ['صح', 'خطأ'],
        correctIndex: actuallyTrue ? 0 : 1,
        explanation: actuallyTrue
          ? (en ? `True — this matches "${current.term}" directly.` : `العبارة صحيحة تمامًا وتطابق مفهوم «${current.term}».`)
          : (en ? `False — that description belongs to "${sibling1?.term || 'another concept'}", whereas "${current.term}" means: ${current.def}` : `العبارة خاطئة (فخ امتحاني!)؛ هذا الوصف يخص «${sibling1?.term || 'مفهومًا آخر'}»، بينما الصواب عن «${current.term}»: ${current.def}`),
      });
    } else {
      questions.push({
        id: `gen-q-${qNum}`,
        type: 'short',
        sourceTag: 'curriculum',
        badge: en ? 'Written Recall' : 'سؤال استرجاع كتابي',
        stem: en
          ? `Explain "${current.term}" in your own words and state its core takeaway.`
          : `اشرح باختصار مفهوم «${current.term}» واذكر أهم نقطة امتحانية فيه.`,
        modelAnswer: current.def,
        keywords: extractMaterialKeywords(`${current.term} ${current.def}`, 4),
        explanation: en
          ? `Model Answer: ${current.def}`
          : `الإجابة النموذجية: ${current.def}`,
      });
    }

    cursor += 1;
  }

  return {
    id: `exam-${Date.now()}`,
    title: cleanLine(title || topic) || (en ? 'PathPilot Interactive Assessment' : 'الامتحان التفاعلي الذكي — PathPilot'),
    language: en ? 'en' : 'ar',
    onlineExamDetected,
    pastExtractedCount: pastQuestions.length,
    totalQuestions: questions.length,
    questions,
  };
}

export function gradeExamSubmission(exam, userAnswers = {}) {
  const items = Array.isArray(exam?.questions) ? exam.questions : [];
  let correctCount = 0;
  let answeredCount = 0;

  const details = items.map((q) => {
    const rawAns = userAnswers[q.id];
    const hasAnswer = rawAns !== undefined && rawAns !== null && String(rawAns).trim() !== '';
    if (hasAnswer) answeredCount += 1;

    let isCorrect = false;
    if (q.type === 'short') {
      const text = String(rawAns || '').toLowerCase().trim();
      if (text.length >= 8) {
        const kws = Array.isArray(q.keywords) && q.keywords.length ? q.keywords : [];
        const hits = kws.filter((kw) => text.includes(String(kw).toLowerCase())).length;
        isCorrect = kws.length ? hits >= Math.max(1, Math.ceil(kws.length * 0.4)) : text.length >= 15;
      }
    } else {
      isCorrect = Number(rawAns) === q.correctIndex;
    }

    if (isCorrect) correctCount += 1;
    return {
      question: q,
      userAnswer: rawAns,
      hasAnswer,
      isCorrect,
    };
  });

  const total = items.length || 1;
  const percentage = Math.round((correctCount / total) * 100);
  const grade = percentage >= 90
    ? 'A+'
    : percentage >= 80
      ? 'A'
      : percentage >= 70
        ? 'B'
        : percentage >= 60
          ? 'C'
          : 'Review';

  return {
    total,
    answeredCount,
    correctCount,
    wrongCount: total - correctCount,
    percentage,
    grade,
    details,
  };
}

export function exportExamPaperPdf(exam, { includeAnswers = true } = {}) {
  if (typeof window === 'undefined') return;
  const en = exam?.language === 'en';
  const dir = en ? 'ltr' : 'rtl';
  const escape = (v) => String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  const rowsHtml = (exam?.questions || []).map((q, idx) => `
    <div class="q-card">
      <div class="q-head">
        <span class="q-num">${en ? `Question ${idx + 1}` : `السؤال ${idx + 1}`}</span>
        <span class="q-badge">${escape(q.badge || '')}</span>
      </div>
      <p class="q-stem">${escape(q.stem)}</p>
      ${Array.isArray(q.options) ? `
        <ol class="q-opts">
          ${q.options.map((opt, oi) => `
            <li class="${includeAnswers && oi === q.correctIndex ? 'correct' : ''}">
              ${escape(opt)} ${includeAnswers && oi === q.correctIndex ? (en ? ' ✓ (Correct)' : ' ✓ (الإجابة الصحيحة)') : ''}
            </li>
          `).join('')}
        </ol>
      ` : `<div class="short-lines"></div>`}
      ${includeAnswers ? `<div class="q-exp"><strong>${en ? 'Explanation / Model Answer:' : 'الشرح والإجابة النموذجية:'}</strong> ${escape(q.modelAnswer || q.explanation)}</div>` : ''}
    </div>
  `).join('');

  const html = `<!doctype html>
<html lang="${en ? 'en' : 'ar'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${escape(exam?.title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; line-height: 1.7; margin: 0; padding: 24px; background: #fff; }
    header { border-bottom: 3px solid #4f46e5; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { margin: 0; font-size: 22px; color: #1e1b4b; }
    .q-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 18px; margin-bottom: 14px; break-inside: avoid; }
    .q-head { display: flex; justify-content: space-between; font-size: 12px; color: #4f46e5; font-weight: 700; margin-bottom: 6px; }
    .q-stem { margin: 0 0 10px; font-weight: 700; font-size: 15px; }
    .q-opts { margin: 0; padding-inline-start: 22px; }
    .q-opts li { margin-bottom: 5px; padding: 4px 8px; border-radius: 6px; }
    .q-opts li.correct { background: #dcfce7; color: #14532d; font-weight: 700; }
    .short-lines { height: 54px; border-bottom: 1px dashed #94a3b8; margin: 8px 0; }
    .q-exp { margin-top: 10px; padding: 8px 12px; background: #f8fafc; border-inline-start: 3px solid #4f46e5; font-size: 13px; color: #334155; }
  </style>
</head>
<body>
  <header>
    <div>
      <div style="font-size:12px;color:#4f46e5;font-weight:700">PATHPILOT AI · INTERACTIVE EXAM STUDIO</div>
      <h1>${escape(exam?.title)}</h1>
    </div>
    <div style="font-size:13px;color:#475569">${en ? `Total Questions: ${exam?.questions?.length || 0}` : `عدد الأسئلة: ${exam?.questions?.length || 0}`}</div>
  </header>
  ${rowsHtml}
  <script>window.addEventListener('load', function () { setTimeout(function () { try { window.focus(); window.print(); } catch {} }, 350); });</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win?.document) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
