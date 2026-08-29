const HISTORY_KEY = 'pathpilot.history.v1';
const PREFERENCES_KEY = 'pathpilot.preferences.v1';
const PINNED_PROMPTS_KEY = 'pathpilot.pinned-prompts.v1';
const MAX_HISTORY = 24;
const MAX_PINNED_PROMPTS = 12;

export const DEFAULT_PREFERENCES = {
  displayName: '',
  audience: 'self',
  responseStyle: 'balanced',
  localLlmEnabled: false,
};

function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    ...item,
    favorite: item.favorite === true,
    folder: String(item.folder || '').slice(0, 60),
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim().slice(0, 30)).filter(Boolean).slice(0, 8) : [],
  };
}

export function loadHistory(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value
      .map(normalizeHistoryItem)
      .filter(Boolean)
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  } catch {
    return [];
  }
}

export function saveHistory(items, storage = globalThis.localStorage) {
  const trimmed = items.map(normalizeHistoryItem).filter(Boolean).slice(0, MAX_HISTORY);
  storage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed.sort((a, b) => Number(b.favorite) - Number(a.favorite) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function createHistoryItem({ mode, tool, prompt, answer, source }) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    mode,
    tool,
    prompt,
    answer,
    source,
    favorite: false,
    folder: '',
    tags: [],
    createdAt: new Date().toISOString(),
  };
}

export function updateHistoryItem(items, itemId, patch, storage = globalThis.localStorage) {
  const next = items.map((item) => item.id === itemId ? normalizeHistoryItem({ ...item, ...patch }) : normalizeHistoryItem(item)).filter(Boolean);
  return saveHistory(next, storage);
}

export function searchHistory(items, query) {
  const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return items;
  return items.filter((item) => {
    const haystack = [item.prompt, item.answer, item.mode, item.tool, item.folder, ...(item.tags || [])].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function clearHistory(storage = globalThis.localStorage) {
  storage.removeItem(HISTORY_KEY);
}

export function loadPinnedPrompts(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(PINNED_PROMPTS_KEY) || '[]');
    return Array.isArray(value) ? value.map((item) => String(item).trim().slice(0, 12000)).filter(Boolean).slice(0, MAX_PINNED_PROMPTS) : [];
  } catch {
    return [];
  }
}

export function savePinnedPrompts(prompts, storage = globalThis.localStorage) {
  const unique = [...new Set(prompts.map((item) => String(item).trim()).filter(Boolean))].slice(0, MAX_PINNED_PROMPTS);
  storage.setItem(PINNED_PROMPTS_KEY, JSON.stringify(unique));
  return unique;
}

export function togglePinnedPrompt(prompt, storage = globalThis.localStorage) {
  const value = String(prompt || '').trim();
  if (!value) return loadPinnedPrompts(storage);
  const current = loadPinnedPrompts(storage);
  return savePinnedPrompts(current.includes(value) ? current.filter((item) => item !== value) : [value, ...current], storage);
}

export function loadPreferences(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(PREFERENCES_KEY) || '{}');
    return { ...DEFAULT_PREFERENCES, ...(value && typeof value === 'object' ? value : {}) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences, storage = globalThis.localStorage) {
  const safePreferences = {
    displayName: String(preferences.displayName || '').slice(0, 60),
    audience: ['self', 'teacher', 'recruiter', 'team'].includes(preferences.audience) ? preferences.audience : 'self',
    responseStyle: ['concise', 'balanced', 'detailed'].includes(preferences.responseStyle) ? preferences.responseStyle : 'balanced',
    localLlmEnabled: preferences.localLlmEnabled === true,
  };
  storage.setItem(PREFERENCES_KEY, JSON.stringify(safePreferences));
  return safePreferences;
}
