const STORAGE_KEY = 'pathpilot.conversation.variants.v1';
const GLOBAL_HISTORY_SUFFIX = '__global_recent__';
const volatileHistory = new Map();

function resolveStorage(explicitStorage) {
  if (explicitStorage !== undefined) return explicitStorage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readStoredHistory(storage) {
  if (!storage?.getItem) return null;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredHistory(storage, history) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}

function normalizedVariants(variants, intent) {
  const seen = new Set();
  return (Array.isArray(variants) ? variants : [])
    .map((variant, index) => {
      const text = typeof variant === 'string' ? variant : String(variant?.text || '');
      const id = typeof variant === 'string' ? `${intent}:${index}` : String(variant?.id || `${intent}:${index}`);
      return { id, text: text.trim() };
    })
    .filter((variant) => {
      if (!variant.text || seen.has(variant.id)) return false;
      seen.add(variant.id);
      return true;
    });
}

function randomIndex(length, random) {
  if (length <= 1) return 0;
  let value = Number(typeof random === 'function' ? random() : Math.random());
  if (!Number.isFinite(value)) value = 0;
  value = Math.min(0.999999999, Math.max(0, value));
  return Math.floor(value * length);
}

const RESPONSE_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'you', 'your', 'i', 'im', 'i’m', 'we', 'it', 'is', 'are', 'of', 'for', 'in', 'on', 'at', 'with', 'when',
  'انا', 'انت', 'انتي', 'احنا', 'هو', 'هي', 'يا', 'في', 'من', 'على', 'علي', 'مع', 'لو', 'كده', 'اللي', 'ده', 'دي', 'بس', 'بقى', 'بقا',
]);

function responseSignature(value) {
  const tokens = String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !RESPONSE_STOP_WORDS.has(token));
  return [...new Set(tokens)].slice(0, 14).join('|');
}

function signatureTokens(signature) {
  return new Set(String(signature || '').split('|').filter(Boolean));
}

function signatureSimilarity(left, right) {
  const a = signatureTokens(left);
  const b = signatureTokens(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.min(a.size, b.size);
}

function isNearRecentWording(variant, recentSignatures) {
  const signature = responseSignature(variant.text);
  if (!signature) return false;
  return recentSignatures.some((recent) => {
    if (recent === signature) return true;
    const smallest = Math.min(signatureTokens(recent).size, signatureTokens(signature).size);
    return smallest >= 3 && signatureSimilarity(signature, recent) >= 0.72;
  });
}

function readRecentList(stored, key) {
  if (stored === null) return volatileHistory.get(key) || [];
  return Array.isArray(stored[key]) ? stored[key] : [];
}

function chooseCandidates(clean, recentIds, recentSignatures) {
  const unseenForIntent = clean.filter((variant) => !recentIds.includes(variant.id));
  const base = unseenForIntent.length ? unseenForIntent : clean;
  const globallyFresh = base.filter((variant) => !isNearRecentWording(variant, recentSignatures));
  return globallyFresh.length ? globallyFresh : base;
}

export function selectConversationVariant({
  intent,
  language = 'ar',
  variants,
  storage,
  random = Math.random,
} = {}) {
  const clean = normalizedVariants(variants, intent || 'conversation');
  if (!clean.length) return '';

  const key = `${language}:${intent || 'conversation'}`;
  const globalKey = `${language}:${GLOBAL_HISTORY_SUFFIX}`;
  const resolvedStorage = resolveStorage(storage);
  const stored = readStoredHistory(resolvedStorage);
  const recentIds = readRecentList(stored, key)
    .filter((id) => clean.some((variant) => variant.id === id));
  const recentSignatures = readRecentList(stored, globalKey).filter(Boolean);

  const candidates = chooseCandidates(clean, recentIds, recentSignatures);
  const selected = candidates[randomIndex(candidates.length, random)];

  const recentLimit = clean.length > 1 ? Math.max(1, Math.min(3, clean.length - 1)) : 1;
  const nextRecent = [selected.id, ...recentIds.filter((id) => id !== selected.id)].slice(0, recentLimit);
  const selectedSignature = responseSignature(selected.text);
  const nextGlobal = selectedSignature
    ? [selectedSignature, ...recentSignatures.filter((signature) => signature !== selectedSignature)].slice(0, 8)
    : recentSignatures.slice(0, 8);

  volatileHistory.set(key, nextRecent);
  volatileHistory.set(globalKey, nextGlobal);
  writeStoredHistory(resolvedStorage, {
    ...(stored || {}),
    [key]: nextRecent,
    [globalKey]: nextGlobal,
  });

  return selected.text;
}

export function clearConversationVariationHistory(storage) {
  volatileHistory.clear();
  const resolvedStorage = resolveStorage(storage);
  try {
    resolvedStorage?.removeItem?.(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export const CONVERSATION_VARIATION_STORAGE_KEY = STORAGE_KEY;
