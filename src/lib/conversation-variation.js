const STORAGE_KEY = 'pathpilot.conversation.variants.v1';
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

export function selectConversationVariant({
  intent,
  language = 'ar',
  variants,
  storage,
  random = Math.random,
} = {}) {
  const clean = normalizedVariants(variants, intent || 'conversation');
  if (!clean.length) return '';
  if (clean.length === 1) return clean[0].text;

  const key = `${language}:${intent || 'conversation'}`;
  const resolvedStorage = resolveStorage(storage);
  const stored = readStoredHistory(resolvedStorage);
  const recentSource = stored === null
    ? (volatileHistory.get(key) || [])
    : (Array.isArray(stored[key]) ? stored[key] : []);
  const recent = recentSource.filter((id) => clean.some((variant) => variant.id === id));

  let candidates = clean.filter((variant) => !recent.includes(variant.id));
  if (!candidates.length) candidates = clean;
  const selected = candidates[randomIndex(candidates.length, random)];

  const recentLimit = Math.max(1, Math.min(3, clean.length - 1));
  const nextRecent = [selected.id, ...recent.filter((id) => id !== selected.id)].slice(0, recentLimit);
  volatileHistory.set(key, nextRecent);
  writeStoredHistory(resolvedStorage, { ...(stored || {}), [key]: nextRecent });

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
