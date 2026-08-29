const HISTORY_KEY = 'pathpilot.history.v1';
const PREFERENCES_KEY = 'pathpilot.preferences.v1';
const MAX_HISTORY = 24;

export const DEFAULT_PREFERENCES = {
  displayName: '',
  audience: 'self',
  responseStyle: 'balanced',
  localLlmEnabled: false,
};

export function loadHistory(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveHistory(items, storage = globalThis.localStorage) {
  const trimmed = items.slice(0, MAX_HISTORY);
  storage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function createHistoryItem({ mode, tool, prompt, answer, source }) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    mode,
    tool,
    prompt,
    answer,
    source,
    createdAt: new Date().toISOString(),
  };
}

export function clearHistory(storage = globalThis.localStorage) {
  storage.removeItem(HISTORY_KEY);
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
