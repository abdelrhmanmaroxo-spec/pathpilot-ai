const DEFAULTS = {
  maxConcurrency: 4,
  failureThreshold: 3,
  cooldownMs: 30_000,
  maxRetries: 2,
  baseDelayMs: 250,
  researchCacheTtlMs: 5 * 60_000,
  researchCacheMaxEntries: 100,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerForUrl(input) {
  const url = typeof input === 'string' ? input : input?.url || String(input || '');
  if (url.includes('api.tavily.com')) return 'tavily';
  if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
  return null;
}

function retryableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function researchCacheKey(input, init) {
  if (providerForUrl(input) !== 'tavily') return '';
  const method = String(init?.method || 'GET').toUpperCase();
  if (method !== 'POST' || typeof init?.body !== 'string') return '';
  try {
    const payload = JSON.parse(init.body);
    delete payload.api_key;
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

function responseFromCache(entry) {
  return new Response(entry.body.slice(0), {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });
}

async function snapshotResponse(response) {
  const clone = response.clone();
  return {
    body: new Uint8Array(await clone.arrayBuffer()),
    status: clone.status,
    statusText: clone.statusText,
    headers: Object.fromEntries(clone.headers.entries()),
    storedAt: Date.now(),
  };
}

class ProviderGate {
  constructor(name, options) {
    this.name = name;
    this.options = options;
    this.active = 0;
    this.queue = [];
    this.failures = 0;
    this.openUntil = 0;
    this.halfOpenInFlight = false;
  }

  circuitState() {
    if (!this.openUntil) return 'closed';
    if (Date.now() < this.openUntil) return 'open';
    return 'half-open';
  }

  async acquire() {
    const state = this.circuitState();
    if (state === 'open') {
      const error = new Error(`CIRCUIT_OPEN_${this.name.toUpperCase()}`);
      error.code = 'PROVIDER_CIRCUIT_OPEN';
      throw error;
    }
    if (state === 'half-open') {
      if (this.halfOpenInFlight) {
        const error = new Error(`CIRCUIT_HALF_OPEN_${this.name.toUpperCase()}`);
        error.code = 'PROVIDER_CIRCUIT_OPEN';
        throw error;
      }
      this.halfOpenInFlight = true;
    }

    if (this.active < this.options.maxConcurrency) {
      this.active += 1;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
    this.active += 1;
  }

  release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) next();
  }

  success() {
    this.failures = 0;
    this.openUntil = 0;
    this.halfOpenInFlight = false;
  }

  failure() {
    this.failures += 1;
    this.halfOpenInFlight = false;
    if (this.failures >= this.options.failureThreshold) {
      this.openUntil = Date.now() + this.options.cooldownMs;
    }
  }
}

export function createProviderResilientFetch(fetchImpl = globalThis.fetch, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const gates = new Map([
    ['gemini', new ProviderGate('gemini', { ...config, ...(options.gemini || {}) })],
    ['tavily', new ProviderGate('tavily', { ...config, ...(options.tavily || {}) })],
  ]);
  const researchCache = new Map();

  function readResearchCache(key) {
    if (!key) return null;
    const entry = researchCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.storedAt > config.researchCacheTtlMs) {
      researchCache.delete(key);
      return null;
    }
    researchCache.delete(key);
    researchCache.set(key, entry);
    return responseFromCache(entry);
  }

  async function writeResearchCache(key, response) {
    if (!key || !response.ok || config.researchCacheTtlMs <= 0) return;
    const entry = await snapshotResponse(response);
    researchCache.set(key, entry);
    while (researchCache.size > config.researchCacheMaxEntries) {
      const oldest = researchCache.keys().next().value;
      researchCache.delete(oldest);
    }
  }

  async function resilientFetch(input, init) {
    const provider = providerForUrl(input);
    if (!provider) return fetchImpl(input, init);

    const cacheKey = researchCacheKey(input, init);
    const cached = readResearchCache(cacheKey);
    if (cached) return cached;

    const gate = gates.get(provider);
    await gate.acquire();
    try {
      let lastError = null;
      for (let attempt = 0; attempt <= gate.options.maxRetries; attempt += 1) {
        try {
          const response = await fetchImpl(input, init);
          if (!retryableStatus(response.status)) {
            if (response.ok) {
              gate.success();
              await writeResearchCache(cacheKey, response);
            } else gate.failure();
            return response;
          }
          lastError = new Error(`${provider.toUpperCase()}_${response.status}`);
          if (attempt >= gate.options.maxRetries) {
            gate.failure();
            return response;
          }
        } catch (error) {
          lastError = error;
          if (attempt >= gate.options.maxRetries) {
            gate.failure();
            throw error;
          }
        }
        const jitter = Math.floor(Math.random() * 100);
        await sleep(gate.options.baseDelayMs * (2 ** attempt) + jitter);
      }
      gate.failure();
      throw lastError || new Error(`${provider.toUpperCase()}_FAILED`);
    } finally {
      gate.release();
    }
  }

  resilientFetch.getState = () => ({
    ...Object.fromEntries([...gates.entries()].map(([name, gate]) => [name, {
      state: gate.circuitState(),
      active: gate.active,
      queued: gate.queue.length,
      failures: gate.failures,
    }])),
    researchCache: {
      entries: researchCache.size,
      ttlMs: config.researchCacheTtlMs,
      maxEntries: config.researchCacheMaxEntries,
    },
  });

  resilientFetch.clearResearchCache = () => researchCache.clear();
  return resilientFetch;
}

export function installProviderResilience({ fetchImpl = globalThis.fetch, logger = console, options = {} } = {}) {
  if (globalThis.__pathPilotProviderFetch) return globalThis.__pathPilotProviderFetch;
  const wrapped = createProviderResilientFetch(fetchImpl, options);
  globalThis.__pathPilotNativeFetch = fetchImpl;
  globalThis.__pathPilotProviderFetch = wrapped;
  globalThis.fetch = wrapped;
  logger.info?.('[PathPilot providers] resilience and research cache enabled for Gemini and Tavily');
  return wrapped;
}
