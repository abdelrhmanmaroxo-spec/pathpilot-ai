const ARABIC_RE = /[\u0600-\u06ff]/;
const LATIN_RE = /[A-Za-z]/;
const ACTION_RE = /\b(explain|debug|fix|write|draft|summarize|compare|plan|review|how|why|what|كمل|اشرح|وضح|حل|اكتب|لخص|قارن|اعمل|ازاي|ليه|إيه|ايه)\b/i;
const SOCIAL_PATTERNS = [
  /^(hi|hello|hey|good morning|good evening|how are you|thanks|thank you|sorry|ok|okay|great|bye|see you|and you|what about you)$/i,
  /^(مرحبا|اهلا|أهلا|ازيك|إزيك|عامل ايه|عامل إيه|تمام|شكرا|شكرًا|معلش|حاضر|باي|سلام|وانت|وإنت|أخبارك|الدنيا ايه|هلو)$/i,
  /^(ezayak|3amel eh|tmam|shokran|ma3lesh|yalla|w enta|akhbarak|helo|hello ya)$/i,
];

function collapseRepeatedLetters(value) {
  return value.replace(/(.)\1{2,}/gu, '$1$1');
}

export function normalizeConversationText(value) {
  return collapseRepeatedLetters(String(value || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/ـ+/g, '')
    .replace(/[!?؟.,،؛:;()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase());
}

export function detectConversationLanguage(value) {
  const text = String(value || '');
  const arabic = (text.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic && latin) return arabic >= latin ? 'ar' : 'mixed';
  if (arabic) return 'ar';
  if (latin) return 'en';
  return 'unknown';
}

export function classifyConversationTurn(value) {
  const normalized = normalizeConversationText(value);
  const language = detectConversationLanguage(value);
  if (!normalized) return { kind: 'empty', language, lightweight: true };
  if (ACTION_RE.test(normalized)) return { kind: 'substantive', language, lightweight: false };
  if (SOCIAL_PATTERNS.some((pattern) => pattern.test(normalized))) return { kind: 'social', language, lightweight: true };
  if (normalized.split(' ').length <= 4 && !/[?؟]/.test(normalized)) return { kind: 'short', language, lightweight: true };
  return { kind: 'open', language, lightweight: false };
}

export function conversationDirective(prompt) {
  const profile = classifyConversationTurn(prompt);
  if (profile.kind === 'social' || profile.kind === 'short') {
    return 'Turn policy: this appears to be a lightweight conversational turn. Reply naturally and briefly in the user’s language, acknowledge the social intent, and do not invent research, citations, tool activity, or heavy reasoning. Offer the next helpful step only when it fits.';
  }
  if (profile.kind === 'substantive') {
    return 'Turn policy: this message contains an action or information request. Do not answer with small talk. Execute the requested task directly, preserving context and constraints.';
  }
  return 'Turn policy: infer the user’s concrete intent from the full message. Prefer a direct helpful answer over generic conversational filler.';
}

export function isArabicLike(value) {
  return detectConversationLanguage(value) === 'ar' || ARABIC_RE.test(String(value || ''));
}

export function hasLatinContent(value) {
  return LATIN_RE.test(String(value || ''));
}
