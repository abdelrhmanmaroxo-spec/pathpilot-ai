const MAX_TURNS = 6;
const MAX_CONTEXT_CHARS = 9_000;
const MAX_MESSAGE_CHARS = 3_000;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function clip(value, limit = MAX_MESSAGE_CHARS) {
  const text = clean(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1))}…`;
}

export function createConversationTurn({ prompt, answer, source = 'unknown', tool = '', createdAt = Date.now() }) {
  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: clip(prompt, 12_000),
    answer: clip(answer, 16_000),
    source: String(source || 'unknown'),
    tool: String(tool || ''),
    createdAt,
  };
}

export function normalizeConversationTurns(turns) {
  if (!Array.isArray(turns)) return [];
  return turns
    .filter((turn) => turn && clean(turn.prompt) && clean(turn.answer))
    .map((turn) => ({
      ...turn,
      prompt: clip(turn.prompt),
      answer: clip(turn.answer),
    }))
    .slice(-MAX_TURNS);
}

export function isFollowUpPrompt(prompt) {
  const text = clean(prompt).toLowerCase();
  if (!text) return false;
  return /^(كمل|كمّل|تابع|التاني|الثاني|عدله|عدّلها|غيره|غيّره|وضح|وضّح|ليه|طب|تمام|continue|go on|the second|second one|edit it|change it|why|explain)/i.test(text)
    || /\b(السابق|اللي فات|فوق|previous|above|last answer|same one)\b/i.test(text);
}

export function buildConversationPrompt({ prompt, turns = [], maxChars = MAX_CONTEXT_CHARS }) {
  const current = clean(prompt);
  const normalized = normalizeConversationTurns(turns);
  if (!normalized.length) return current;

  const parts = [];
  let used = 0;
  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const turn = normalized[index];
    const block = `User: ${turn.prompt}\nAssistant: ${turn.answer}`;
    if (used + block.length > maxChars) break;
    parts.unshift(block);
    used += block.length;
  }

  if (!parts.length) return current;
  const continuity = isFollowUpPrompt(current)
    ? 'The latest request is a follow-up. Resolve references from the conversation context before answering.'
    : 'Use the conversation only when it is relevant to the latest request. Do not repeat old content unnecessarily.';

  return [
    'Conversation context (previous turns):',
    ...parts,
    '',
    continuity,
    '',
    `Latest user request: ${current}`,
  ].join('\n');
}

export function conversationContextStats(turns = []) {
  const normalized = normalizeConversationTurns(turns);
  return {
    turns: normalized.length,
    chars: normalized.reduce((total, turn) => total + turn.prompt.length + turn.answer.length, 0),
    maxTurns: MAX_TURNS,
    maxChars: MAX_CONTEXT_CHARS,
  };
}
