const VOICE_SETTINGS_KEY = 'pathpilot.voice-settings.v1';

export const DEFAULT_VOICE_SETTINGS = Object.freeze({
  micLang: 'auto',
  rate: 1,
  pitch: 1,
  autoSpeakReplies: false,
  handsFreeAutoSend: false,
  silenceSubmitMs: 2200,
  preferredArabicVoice: '',
  preferredEnglishVoice: '',
  smartPunctuation: true,
});

const VALID_MIC_LANGS = new Set(['auto', 'ar-EG', 'ar-SA', 'en-US']);

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Number(num.toFixed(2))));
}

export function sanitizeVoiceSettings(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    micLang: VALID_MIC_LANGS.has(source.micLang) ? source.micLang : DEFAULT_VOICE_SETTINGS.micLang,
    rate: clampNumber(source.rate, 0.65, 2.0, DEFAULT_VOICE_SETTINGS.rate),
    pitch: clampNumber(source.pitch, 0.75, 1.25, DEFAULT_VOICE_SETTINGS.pitch),
    autoSpeakReplies: Boolean(source.autoSpeakReplies),
    handsFreeAutoSend: Boolean(source.handsFreeAutoSend),
    silenceSubmitMs: Math.round(clampNumber(source.silenceSubmitMs, 1200, 5000, DEFAULT_VOICE_SETTINGS.silenceSubmitMs)),
    preferredArabicVoice: String(source.preferredArabicVoice || '').trim().slice(0, 140),
    preferredEnglishVoice: String(source.preferredEnglishVoice || '').trim().slice(0, 140),
    smartPunctuation: source.smartPunctuation !== false,
  };
}

export function loadVoiceSettings(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(VOICE_SETTINGS_KEY) || '{}');
    return sanitizeVoiceSettings(parsed);
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export function saveVoiceSettings(patch = {}, storage = globalThis.localStorage) {
  const current = loadVoiceSettings(storage);
  const next = sanitizeVoiceSettings({ ...current, ...(patch || {}) });
  try {
    storage?.setItem?.(VOICE_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors safely.
  }
  return next;
}

export function detectTextSpeechLang(text, fallback = 'ar-EG') {
  const value = String(text || '');
  const arabicMatches = value.match(/[\u0600-\u06FF]/g) || [];
  const latinMatches = value.match(/[A-Za-z]/g) || [];
  if (arabicMatches.length === 0 && latinMatches.length === 0) return fallback;
  if (arabicMatches.length >= latinMatches.length * 0.45) {
    return fallback.startsWith('ar') ? fallback : 'ar-EG';
  }
  return 'en-US';
}

export function resolveRecognitionLanguage(settings = DEFAULT_VOICE_SETTINGS, uiLanguage = 'ar') {
  if (settings?.micLang && settings.micLang !== 'auto' && VALID_MIC_LANGS.has(settings.micLang)) {
    return settings.micLang;
  }
  return uiLanguage === 'en' ? 'en-US' : 'ar-EG';
}

export function cleanTextForSpeech(rawText) {
  const raw = String(rawText || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return '';

  const isMostlyArabic = detectTextSpeechLang(raw, 'ar-EG').startsWith('ar');
  const codeCue = isMostlyArabic ? ' (مقطع برمجي مرفق بالرد). ' : ' (Code snippet attached in response). ';

  return raw
    .replace(/^🌐\s*PathPilot Research Beta\s*\n(?:تم [^\n]*\n)?/i, '')
    .replace(/^🧠\s*(?:PathPilot AI|Local LLM|PathPilot Local Reasoner)[^\n]*\n/i, '')
    .replace(/^⚠️\s*Local Intelligence Beta\s*\n/i, '')
    .replace(/^🔄\s*Local Deliberation Pass\s*\n/i, '')
    .replace(/```[\s\S]*?```/g, codeCue)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/https?:\/\/[^\s)\]}>,]+/g, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1$2')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/[🌐🧠⚠️🔄✨📎📝📊🔗]/gu, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitSpeechChunks(rawText, maxChunkLength = 210) {
  const cleaned = cleanTextForSpeech(rawText);
  if (!cleaned) return [];

  const limit = Math.max(60, Number(maxChunkLength) || 210);
  const paragraphs = cleaned.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const chunks = [];

  for (const paragraph of paragraphs) {
    const rawSentences = paragraph
      .split(/(?<=[.!؟؛:;])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const sentence of rawSentences) {
      if (sentence.length <= limit) {
        chunks.push(sentence);
        continue;
      }
      const words = sentence.split(/\s+/);
      let current = '';
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > limit && current) {
          chunks.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks.map((text, index) => ({
    index,
    text,
    lang: detectTextSpeechLang(text),
  }));
}

export function applyVoiceTranscriptCommands(rawText, { smartPunctuation = true } = {}) {
  let text = String(rawText || '').replace(/[ \t]+/g, ' ').trim();
  if (!text) return '';
  if (!smartPunctuation) return text;

  text = text
    .replace(/\s*(?:سطر جديد|فقرة جديدة|new line|next line)\s*/gi, '\n')
    .replace(/\s+(?:علامة استفهام|question mark)(?=\s|$)/gi, '؟')
    .replace(/\s+(?:علامة تعجب|exclamation mark)(?=\s|$)/gi, '!')
    .replace(/\s+(?:فصلة|فاصلة|comma)(?=\s|$)/gi, '،')
    .replace(/\s+(?:نقطة|full stop|period)(?=\s|$)/gi, '.')
    .replace(/\s+([.،,!؟؛:])/g, '$1')
    .replace(/([.،,!؟؛:])(?=[^\s\n])/g, '$1 ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n');

  return text.trim();
}

export function rankAvailableVoices(voices = [], langPrefix = 'ar') {
  const target = String(langPrefix || 'ar').toLowerCase().slice(0, 2);
  const preferredNames = target === 'ar'
    ? ['salma', 'shakir', 'hoda', 'zariyah', 'hamdan', 'maged', 'tarik', 'laila', 'mariam', 'natural', 'neural', 'online', 'google']
    : ['aria', 'jenny', 'guy', 'sonia', 'ryan', 'samantha', 'daniel', 'natural', 'neural', 'online', 'google'];

  return [...(Array.isArray(voices) ? voices : [])]
    .filter((voice) => String(voice?.lang || '').toLowerCase().startsWith(target))
    .sort((left, right) => {
      const scoreVoice = (voice) => {
        const name = String(voice?.name || '').toLowerCase();
        const lang = String(voice?.lang || '').toLowerCase();
        let score = 0;
        if (target === 'ar' && lang.includes('eg')) score += 35;
        if (target === 'ar' && lang.includes('sa')) score += 20;
        if (target === 'en' && lang.includes('us')) score += 25;
        if (/natural|neural|online|premium|enhanced/i.test(name)) score += 45;
        preferredNames.forEach((token, idx) => {
          if (name.includes(token)) score += Math.max(6, 26 - idx * 2);
        });
        if (voice?.default) score += 8;
        return score;
      };
      return scoreVoice(right) - scoreVoice(left);
    });
}

export function pickBestVoice(voices = [], lang = 'ar-EG', settings = DEFAULT_VOICE_SETTINGS) {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length) return null;
  const isArabic = String(lang || '').toLowerCase().startsWith('ar');
  const preferredName = isArabic ? settings?.preferredArabicVoice : settings?.preferredEnglishVoice;
  if (preferredName) {
    const exact = list.find((voice) => voice?.name === preferredName || voice?.voiceURI === preferredName);
    if (exact) return exact;
  }
  const ranked = rankAvailableVoices(list, isArabic ? 'ar' : 'en');
  return ranked[0] || list.find((voice) => voice?.default) || list[0] || null;
}
