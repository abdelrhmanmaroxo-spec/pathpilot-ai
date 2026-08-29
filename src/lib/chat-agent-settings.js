import { disabledToolsForGroups } from './chat-agent-orchestrator.js';

const CHAT_AGENT_SETTINGS_KEY = 'pathpilot.chat-agent-settings.v1';

export const DEFAULT_CHAT_AGENT_SETTINGS = Object.freeze({
  disabledGroups: [],
});

function normalizeGroups(value) {
  const allowed = new Set(['search', 'rag', 'deep', 'planning', 'comparison', 'code', 'numbers', 'writing', 'voice']);
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '')).filter((item) => allowed.has(item)))];
}

export function loadChatAgentSettings(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(CHAT_AGENT_SETTINGS_KEY) || '{}');
    const disabledGroups = normalizeGroups(parsed?.disabledGroups);
    return {
      disabledGroups,
      disabledToolIds: disabledToolsForGroups(disabledGroups),
    };
  } catch {
    return { ...DEFAULT_CHAT_AGENT_SETTINGS, disabledToolIds: [] };
  }
}

export function saveChatAgentSettings(settings = {}, storage = globalThis.localStorage) {
  const disabledGroups = normalizeGroups(settings.disabledGroups);
  storage.setItem(CHAT_AGENT_SETTINGS_KEY, JSON.stringify({ disabledGroups }));
  return {
    disabledGroups,
    disabledToolIds: disabledToolsForGroups(disabledGroups),
  };
}

export function toggleChatAgentGroup(groupId, settings = {}, storage = globalThis.localStorage) {
  const current = normalizeGroups(settings.disabledGroups);
  const id = String(groupId || '');
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  return saveChatAgentSettings({ disabledGroups: next }, storage);
}
