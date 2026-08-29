const FLAG_STORAGE_KEY = 'pathpilot.feature-flags.v1';
const IDENTITY_KEY = 'pathpilot.rollout-id.v1';

export const FEATURE_FLAGS = Object.freeze({
  pwaUpdatePrompt: { rollout: 100 },
  conversationV2: { rollout: 0 },
  streamingResponses: { rollout: 0 },
  indexedLocalRag: { rollout: 0 },
});

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function getRolloutIdentity(storage = globalThis.localStorage) {
  let identity = storage?.getItem?.(IDENTITY_KEY) || '';
  if (!identity) {
    identity = globalThis.crypto?.randomUUID?.() || `rollout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage?.setItem?.(IDENTITY_KEY, identity);
  }
  return identity;
}

export function readFeatureOverrides(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem?.(FLAG_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function setFeatureOverride(name, value, storage = globalThis.localStorage) {
  const current = readFeatureOverrides(storage);
  if (value === null || value === undefined) delete current[name];
  else current[name] = Boolean(value);
  storage?.setItem?.(FLAG_STORAGE_KEY, JSON.stringify(current));
  return current;
}

export function isFeatureEnabled(name, { identity, overrides, flags = FEATURE_FLAGS } = {}) {
  const explicit = overrides || readFeatureOverrides();
  if (Object.prototype.hasOwnProperty.call(explicit, name)) return Boolean(explicit[name]);
  const rollout = Math.max(0, Math.min(100, Number(flags[name]?.rollout || 0)));
  if (rollout <= 0) return false;
  if (rollout >= 100) return true;
  const stableIdentity = identity || getRolloutIdentity();
  const bucket = hash(`${name}:${stableIdentity}`) % 100;
  return bucket < rollout;
}
