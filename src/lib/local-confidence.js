const PROFILE_WEIGHT = {
  lite: 0.52,
  strong: 0.72,
  expert: 0.84,
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function numericScores(knowledge) {
  return Object.values(knowledge?.scores || {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
}

function retrievalStrength(knowledge) {
  const scores = numericScores(knowledge);
  if (!scores.length) return 0.18;
  const top = scores[0] || 0;
  const topThree = scores.slice(0, 3);
  const averageTop = topThree.reduce((sum, value) => sum + value, 0) / topThree.length;
  const scoreComponent = clamp((averageTop - 4) / 26);
  const domainComponent = clamp((knowledge?.domains?.length || 0) / 8);
  return clamp(scoreComponent * 0.72 + domainComponent * 0.28);
}

function constraintCoverage(knowledge) {
  const count = knowledge?.constraints?.length || 0;
  if (!count) return 0.72;
  const context = String(knowledge?.context || '').toLowerCase();
  const covered = knowledge.constraints.filter((constraint) => {
    const normalized = String(constraint || '').toLowerCase().trim();
    return normalized && context.includes(normalized.slice(0, Math.min(normalized.length, 32)));
  }).length;
  return clamp(covered / count);
}

function modelCapacity(profile, modelScaleB) {
  const profileBase = PROFILE_WEIGHT[profile] ?? PROFILE_WEIGHT.lite;
  const scale = clamp((Number(modelScaleB || 0.8) - 0.5) / 3.5);
  return clamp(profileBase * 0.7 + scale * 0.3);
}

function complexityPenalty({ prompt, tool }) {
  const text = String(prompt || '');
  let penalty = 0;
  if (text.length > 900) penalty += 0.05;
  if (text.length > 2200) penalty += 0.05;
  if (['research', 'decide', 'qa', 'plan', 'tasks'].includes(tool)) penalty += 0.04;
  if (/(?:latest|today|current|price|law|news|availability|النهارده|اليوم|سعر|قانون|أحدث|حالي)/i.test(text)) penalty += 0.13;
  if (/(?:medical|legal|financial|diagnos|دواء|طبي|قانوني|استثمار|تشخيص)/i.test(text)) penalty += 0.08;
  return Math.min(0.24, penalty);
}

export function computeLocalConfidence({ knowledge, profile = 'lite', modelScaleB = 0.8, reviewed = false, prompt = '', tool = 'ask' } = {}) {
  const retrieval = retrievalStrength(knowledge);
  const constraints = constraintCoverage(knowledge);
  const capacity = modelCapacity(profile, modelScaleB);
  const reviewBonus = reviewed ? 0.08 : 0;
  const penalty = complexityPenalty({ prompt, tool });

  const raw = retrieval * 0.46 + constraints * 0.22 + capacity * 0.24 + reviewBonus - penalty;
  const score = clamp(raw, 0.08, 0.96);
  const level = score >= 0.76 ? 'high' : score >= 0.52 ? 'medium' : 'low';

  return {
    score: Number(score.toFixed(2)),
    level,
    retrieval: Number(retrieval.toFixed(2)),
    constraints: Number(constraints.toFixed(2)),
    capacity: Number(capacity.toFixed(2)),
    reviewed: Boolean(reviewed),
    freshnessSensitive: penalty >= 0.13,
  };
}

export function shouldRunLocalReview({ confidence, isComplex = false } = {}) {
  if (isComplex) return true;
  if (!confidence) return false;
  return confidence.score < 0.72 || confidence.level === 'low';
}
