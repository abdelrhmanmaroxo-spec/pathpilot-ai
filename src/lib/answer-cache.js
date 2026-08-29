import { shouldBypassAnswerCache } from './smart-router.js';

const DEFAULT_TTL_MS = 10 * 60_000;
const DEFAULT_MAX_ENTRIES = 40;
const DEFAULT_THRESHOLD = 0.94;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1));
}

export function semanticSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach((token) => { if (right.has(token)) intersection += 1; });
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

function preferenceSignature(preferences = {}) {
  return JSON.stringify({
    audience: preferences.audience || 'self',
    responseStyle: preferences.responseStyle || 'balanced',
    displayName: String(preferences.displayName || '').trim().toLowerCase(),
    deepThinkEnabled: preferences.deepThinkEnabled === true,
  });
}

export function createAnswerCache({ ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES, threshold = DEFAULT_THRESHOLD } = {}) {
  const entries = [];

  function prune(now = Date.now()) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (now - entries[index].storedAt > ttlMs) entries.splice(index, 1);
    }
    while (entries.length > maxEntries) entries.shift();
  }

  function find({ mode, tool, prompt, preferences }) {
    if (shouldBypassAnswerCache(prompt, tool)) return null;
    prune();
    const signature = preferenceSignature(preferences);
    let best = null;
    for (const entry of entries) {
      if (entry.mode !== mode || entry.tool !== tool || entry.preferenceSignature !== signature) continue;
      const score = semanticSimilarity(prompt, entry.prompt);
      if (score >= threshold && (!best || score > best.score)) best = { entry, score };
    }
    if (!best) return null;
    best.entry.lastUsedAt = Date.now();
    return {
      ...best.entry.result,
      source: 'semantic-cache',
      cacheSimilarity: best.score,
      cachedSource: best.entry.result.source,
      route: 'semantic-cache',
    };
  }

  function store({ mode, tool, prompt, preferences, result }) {
    if (!result?.answer || result.degraded || shouldBypassAnswerCache(prompt, tool)) return false;
    if (['research-ai', 'research-search', 'semantic-cache'].includes(result.source)) return false;
    prune();
    const signature = preferenceSignature(preferences);
    const normalized = normalize(prompt);
    const duplicate = entries.findIndex((entry) => (
      entry.mode === mode && entry.tool === tool && entry.preferenceSignature === signature && normalize(entry.prompt) === normalized
    ));
    if (duplicate >= 0) entries.splice(duplicate, 1);
    entries.push({
      mode,
      tool,
      prompt,
      preferenceSignature: signature,
      result: { ...result },
      storedAt: Date.now(),
      lastUsedAt: Date.now(),
    });
    prune();
    return true;
  }

  function clear() { entries.splice(0, entries.length); }
  function stats() { prune(); return { entries: entries.length, ttlMs, maxEntries, threshold }; }

  return { find, store, clear, stats };
}

export const answerCache = createAnswerCache();
