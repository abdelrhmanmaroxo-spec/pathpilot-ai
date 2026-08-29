const BLOCKED_PATTERNS = [
  /<\s*script\b/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/(?:html|javascript)/i,
  /<[^>]+\son(?:error|load|click|focus|mouseover)\s*=/i,
  /<!ENTITY\s+[^>]+SYSTEM\s+["']/i,
  /(?:__proto__|constructor\.prototype|prototype\s*\[)/i,
  /file\s*:\/\//i,
  /gopher\s*:\/\//i,
  /(?:\.\.\/|\.\.\\){2,}/,
];

export function hasExploitLikePayload(value) {
  const text = String(value || '');
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}
