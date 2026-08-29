const CHAT_MEMORY_KEY = 'pathpilot.chat-memory.v1';
const MAX_CHAT_SESSIONS = 24;
const MAX_TURNS_PER_CHAT = 30;

function clean(value, limit = 12_000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTurn(turn) {
  if (!turn || typeof turn !== 'object') return null;
  const prompt = clean(turn.prompt);
  const answer = clean(turn.answer, 24_000);
  if (!prompt || !answer) return null;
  return {
    id: clean(turn.id, 120) || newId(),
    prompt,
    answer,
    source: clean(turn.source, 80) || 'unknown',
    tool: clean(turn.tool, 80) || 'ask',
    createdAt: Number.isFinite(Number(turn.createdAt)) ? Number(turn.createdAt) : Date.now(),
  };
}

function normalizeSession(session) {
  if (!session || typeof session !== 'object') return null;
  const turns = Array.isArray(session.turns)
    ? session.turns.map(normalizeTurn).filter(Boolean).slice(-MAX_TURNS_PER_CHAT)
    : [];
  const createdAt = Number.isFinite(Number(session.createdAt)) ? Number(session.createdAt) : Date.now();
  const updatedAt = Number.isFinite(Number(session.updatedAt)) ? Number(session.updatedAt) : createdAt;
  const fallbackTitle = turns[0]?.prompt || 'New chat';
  return {
    id: clean(session.id, 120) || newId(),
    title: clean(session.title || fallbackTitle, 80) || 'New chat',
    turns,
    createdAt,
    updatedAt,
  };
}

export function createChatSession({ title = 'New chat', turns = [] } = {}) {
  const now = Date.now();
  return normalizeSession({ id: newId(), title, turns, createdAt: now, updatedAt: now });
}

export function loadChatSessions(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(CHAT_MEMORY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSession)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CHAT_SESSIONS);
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions, storage = globalThis.localStorage) {
  const normalized = (Array.isArray(sessions) ? sessions : [])
    .map(normalizeSession)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CHAT_SESSIONS);
  storage.setItem(CHAT_MEMORY_KEY, JSON.stringify(normalized));
  return normalized;
}

export function upsertChatSession(sessions, session, storage = globalThis.localStorage) {
  const normalized = normalizeSession({ ...session, updatedAt: Date.now() });
  if (!normalized) return saveChatSessions(sessions, storage);
  return saveChatSessions([
    normalized,
    ...(Array.isArray(sessions) ? sessions : []).filter((item) => item?.id !== normalized.id),
  ], storage);
}

export function appendChatTurn(sessions, sessionId, turn, storage = globalThis.localStorage) {
  const current = (Array.isArray(sessions) ? sessions : []).find((session) => session?.id === sessionId)
    || createChatSession();
  const normalizedTurn = normalizeTurn(turn);
  if (!normalizedTurn) return saveChatSessions(sessions, storage);
  const turns = [...current.turns, normalizedTurn].slice(-MAX_TURNS_PER_CHAT);
  const title = current.turns.length ? current.title : normalizedTurn.prompt;
  return upsertChatSession(sessions, { ...current, title, turns }, storage);
}

export function deleteChatSession(sessions, sessionId, storage = globalThis.localStorage) {
  return saveChatSessions((Array.isArray(sessions) ? sessions : []).filter((session) => session?.id !== sessionId), storage);
}

export const CHAT_MEMORY_LIMITS = Object.freeze({
  sessions: MAX_CHAT_SESSIONS,
  turnsPerChat: MAX_TURNS_PER_CHAT,
});
