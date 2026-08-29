import { buildExpertKnowledgeContext as buildBaseKnowledge } from './local-knowledge-context.js';
import { retrieveProExpertise, LOCAL_EXPERTISE_PRO_STATS } from './local-expertise-pro.js';

export const LOCAL_AUGMENTED_KNOWLEDGE_VERSION = '2026.08.29-augmented-v1';

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

function unique(items, limit) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const value = String(item || '').replace(/\s+/g, ' ').trim();
    const key = normalize(value);
    if (!value || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function proContext(entries, maxChars) {
  const facts = unique(entries.flatMap((entry) => entry.facts || []), 16);
  const mistakes = unique(entries.flatMap((entry) => entry.mistakes || []), 8);
  const steps = unique(entries.flatMap((entry) => entry.steps || []), 10);
  const lines = [
    'PROFESSIONAL SPECIALIST CONTEXT',
    ...entries.map((entry) => `- ${entry.id}: ${entry.summary}`),
    '',
    'SPECIALIST PRINCIPLES',
    ...facts.map((item) => `- ${item}`),
    '',
    'SPECIALIST FAILURE MODES',
    ...mistakes.map((item) => `- ${item}`),
    '',
    'SPECIALIST EXECUTION CHECKLIST',
    ...steps.map((item, index) => `${index + 1}. ${item}`),
  ];

  let result = '';
  for (const line of lines) {
    const next = result ? `${result}\n${line}` : line;
    if (next.length > maxChars) break;
    result = next;
  }
  return result;
}

function mergeStats(baseStats) {
  return {
    ...baseStats,
    domains: Number(baseStats?.domains || 0) + LOCAL_EXPERTISE_PRO_STATS.domains,
    facts: Number(baseStats?.facts || 0) + LOCAL_EXPERTISE_PRO_STATS.facts,
    mistakes: Number(baseStats?.mistakes || 0) + LOCAL_EXPERTISE_PRO_STATS.mistakes,
    playbookSteps: Number(baseStats?.playbookSteps || 0) + LOCAL_EXPERTISE_PRO_STATS.playbookSteps,
    proPackVersion: LOCAL_EXPERTISE_PRO_STATS.version,
  };
}

export function buildExpertKnowledgeContext({ prompt, tool = 'ask', mode = 'general', preferences = {}, maxChars = 10_500 } = {}) {
  const budget = Math.max(4_500, Math.min(18_000, Number(maxChars || 10_500)));
  const baseBudget = Math.max(3_500, Math.floor(budget * 0.7));
  const proBudget = Math.max(900, budget - baseBudget - 120);
  const base = buildBaseKnowledge({ prompt, tool, mode, preferences, maxChars: baseBudget });
  const proLimit = preferences.responseStyle === 'detailed' ? 12 : preferences.responseStyle === 'concise' ? 6 : 9;
  const proEntries = retrieveProExpertise({
    prompt,
    tool,
    mode,
    limit: proLimit,
    seedIds: base.domains,
  });
  const extra = proContext(proEntries, proBudget);
  const context = extra ? `${base.context}\n\n${extra}`.slice(0, budget) : base.context.slice(0, budget);
  const proScores = Object.fromEntries(proEntries.map((entry, index) => [entry.id, Number(Math.max(6, 22 - index * 1.35).toFixed(2))]));
  const domains = [...new Set([...base.domains, ...proEntries.map((entry) => entry.id)])];

  return {
    ...base,
    context,
    domains,
    scores: { ...base.scores, ...proScores },
    version: `${base.version}+${LOCAL_AUGMENTED_KNOWLEDGE_VERSION}`,
    stats: mergeStats(base.stats),
  };
}
