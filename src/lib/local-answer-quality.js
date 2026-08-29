const STOP = new Set([
  'the','and','for','with','from','that','this','your','you','are','was','what','how','why','can','will','into','about',
  'على','الى','إلى','من','في','عن','مع','هذا','هذه','عايز','اريد','أريد','ايه','كيف','ليه','هو','هي','كان','تكون','يكون',
]);

const NEGATION_TOKENS = new Set([
  'بدون', 'لا', 'ليس', 'ممنوع',
  'without', 'not', 'never', 'no', 'mustnt', 'dont',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}+#.\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywords(value, limit = 16) {
  const counts = new Map();
  for (const token of normalize(value).split(' ')) {
    if (token.length < 3 || STOP.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([token]) => token);
}

function coverageScore(answer, prompt) {
  const answerText = normalize(answer);
  const terms = keywords(prompt);
  if (!terms.length) return 0.7;
  const hits = terms.filter((term) => answerText.includes(term)).length;
  return Math.min(1, hits / Math.max(3, Math.min(8, terms.length)));
}

function isNegativeConstraint(value) {
  const text = ` ${normalize(value)} `;
  return [
    ' بدون ', ' من غير ', ' لا ', ' ليس ', ' ممنوع ',
    ' without ', ' do not ', ' must not ', ' never ', ' no ',
  ].some((marker) => text.includes(marker));
}

function constraintTerms(value) {
  return keywords(value, 6).filter((token) => !NEGATION_TOKENS.has(token) && token !== 'غير');
}

function hasNearbyNegation(tokens, index, radius = 4) {
  const start = Math.max(0, index - radius);
  const end = Math.min(tokens.length, index + radius + 1);
  const window = tokens.slice(start, end);
  if (window.some((token) => NEGATION_TOKENS.has(token))) return true;
  const phrase = window.join(' ');
  return phrase.includes('من غير') || phrase.includes('do not') || phrase.includes('must not');
}

function assessNegativeConstraint(answer, constraint) {
  const tokens = normalize(answer).split(' ').filter(Boolean);
  const terms = constraintTerms(constraint);
  if (!terms.length) return { satisfied: true, contradicted: false };

  let mentioned = false;
  let negatedMention = false;
  for (const term of terms) {
    tokens.forEach((token, index) => {
      if (token !== term) return;
      mentioned = true;
      if (hasNearbyNegation(tokens, index)) negatedMention = true;
    });
  }

  return {
    satisfied: mentioned && negatedMention,
    contradicted: mentioned && !negatedMention,
  };
}

function constraintAssessment(answer, constraints = []) {
  if (!constraints.length) return { score: 0.76, contradictions: 0 };
  const text = normalize(answer);
  let hits = 0;
  let contradictions = 0;

  for (const constraint of constraints) {
    if (isNegativeConstraint(constraint)) {
      const assessment = assessNegativeConstraint(answer, constraint);
      if (assessment.satisfied) hits += 1;
      if (assessment.contradicted) contradictions += 1;
      continue;
    }

    const parts = constraintTerms(constraint);
    if (!parts.length || parts.some((part) => text.includes(part))) hits += 1;
  }

  return {
    score: Math.min(1, hits / constraints.length),
    contradictions,
  };
}

function repetitionPenalty(answer) {
  const lines = String(answer || '')
    .split(/\n+/)
    .map((line) => normalize(line))
    .filter((line) => line.length >= 18);
  if (lines.length < 4) return 0;
  const unique = new Set(lines);
  return Math.min(0.22, (1 - unique.size / lines.length) * 0.7);
}

function genericPenalty(answer) {
  const text = normalize(answer);
  const generic = [
    'it depends', 'consider your needs', 'do more research', 'consult a professional',
    'يعتمد على احتياجاتك', 'اعمل بحث', 'قم بالمزيد من البحث', 'راجع مختص',
  ];
  const matches = generic.filter((phrase) => text.includes(normalize(phrase))).length;
  return Math.min(0.16, matches * 0.04);
}

function lengthFitness(answer, style) {
  const length = String(answer || '').trim().length;
  const [min, ideal] = style === 'concise' ? [120, 450] : style === 'detailed' ? [420, 1700] : [220, 900];
  if (length < min) return Math.max(0.2, length / min);
  if (length <= ideal * 1.8) return 1;
  return Math.max(0.65, 1 - (length - ideal * 1.8) / Math.max(ideal * 5, 1));
}

function actionableScore(answer) {
  const text = String(answer || '');
  const markers = [
    /(?:^|\n)\s*[-•*]\s+/m,
    /(?:^|\n)\s*\d+[.)]\s+/m,
    /(?:خطو|نفذ|جرّب|اختبر|راجع|ابدأ|next|step|test|check|implement)/i,
  ];
  const hits = markers.filter((pattern) => pattern.test(text)).length;
  return 0.55 + hits * 0.15;
}

export function scoreLocalAnswer({ answer, prompt = '', knowledge = {}, style = 'balanced' } = {}) {
  const trimmed = String(answer || '').trim();
  if (!trimmed) return { score: 0, components: {}, flags: ['empty'] };

  const coverage = coverageScore(trimmed, prompt);
  const constraintResult = constraintAssessment(trimmed, knowledge.constraints || []);
  const constraints = constraintResult.score;
  const length = lengthFitness(trimmed, style);
  const actionable = Math.min(1, actionableScore(trimmed));
  const repetition = repetitionPenalty(trimmed);
  const generic = genericPenalty(trimmed);
  const contradiction = Math.min(0.24, constraintResult.contradictions * 0.16);
  const score = Math.max(0, Math.min(1,
    coverage * 0.32 + constraints * 0.28 + length * 0.2 + actionable * 0.2 - repetition - generic - contradiction,
  ));

  const flags = [];
  if (coverage < 0.45) flags.push('weak-prompt-coverage');
  if (constraints < 0.6) flags.push('missed-constraints');
  if (constraintResult.contradictions > 0) flags.push('contradicted-constraints');
  if (length < 0.55) flags.push('too-thin');
  if (repetition > 0.08) flags.push('repetitive');
  if (generic > 0.08) flags.push('too-generic');

  return {
    score: Number(score.toFixed(2)),
    components: {
      coverage: Number(coverage.toFixed(2)),
      constraints: Number(constraints.toFixed(2)),
      length: Number(length.toFixed(2)),
      actionable: Number(actionable.toFixed(2)),
      repetition: Number(repetition.toFixed(2)),
      generic: Number(generic.toFixed(2)),
      contradiction: Number(contradiction.toFixed(2)),
    },
    flags,
  };
}

export function chooseBetterLocalAnswer({ draft, reviewed, prompt, knowledge, style = 'balanced' } = {}) {
  const draftQuality = scoreLocalAnswer({ answer: draft, prompt, knowledge, style });
  const reviewedQuality = reviewed
    ? scoreLocalAnswer({ answer: reviewed, prompt, knowledge, style })
    : { score: -1, flags: ['missing-review'] };
  const useReviewed = Boolean(reviewed) && reviewedQuality.score >= draftQuality.score - 0.02;
  return {
    answer: useReviewed ? reviewed : draft,
    selected: useReviewed ? 'reviewed' : 'draft',
    draftQuality,
    reviewedQuality,
  };
}
