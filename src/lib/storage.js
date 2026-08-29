const HISTORY_KEY = 'pathpilot.history.v1';
const MAX_HISTORY = 24;

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
