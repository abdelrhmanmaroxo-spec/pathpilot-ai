function elapsed(startedAt) {
  return Date.now() - startedAt;
}

async function timedProbe(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
    return { name, ok: true, latencyMs: elapsed(startedAt), ...(details || {}) };
  } catch (error) {
    return { name, ok: false, latencyMs: elapsed(startedAt), code: String(error?.message || 'PROBE_FAILED').split(':')[0].slice(0, 80) };
  }
}

async function probeGemini(env, fetchImpl) {
  const key = String(env.AI_API_KEY || '').trim();
  const model = String(env.AI_MODEL || '').trim();
  const base = String(env.AI_BASE_URL || '').trim();
  if (!key || !model) throw new Error('AI_NOT_CONFIGURED');
  if (!base.includes('generativelanguage.googleapis.com')) return { configured: true, provider: 'compatible', liveProbe: false };
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
    headers: { 'x-goog-api-key': key },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`GEMINI_${response.status}`);
  return { configured: true, provider: 'Gemini', model, liveProbe: true };
}

async function probeTavily(env, fetchImpl) {
  const key = String(env.TAVILY_API_KEY || '').trim();
  if (!key) throw new Error('TAVILY_NOT_CONFIGURED');
  const response = await fetchImpl('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query: 'PathPilot service health check', search_depth: 'basic', max_results: 1, include_answer: false, include_raw_content: false, include_images: false }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`TAVILY_${response.status}`);
  return { configured: true, provider: 'Tavily', liveProbe: true };
}

async function probeGmail(env, fetchImpl) {
  const provider = String(env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (provider !== 'gmail-api' && provider !== 'gmailapi') return { configured: false, provider: provider || 'other', liveProbe: false };
  const clientId = String(env.GMAIL_CLIENT_ID || '').trim();
  const clientSecret = String(env.GMAIL_CLIENT_SECRET || '').trim();
  const refreshToken = String(env.GMAIL_REFRESH_TOKEN || '').trim();
  if (!clientId || !clientSecret || !refreshToken) throw new Error('GMAIL_API_NOT_CONFIGURED');
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(`GMAIL_TOKEN_${response.status}`);
  return { configured: true, provider: 'gmail-api', liveProbe: true };
}

export async function probeDeepHealth({ env = process.env, database, fetchImpl = globalThis.fetch } = {}) {
  const checkedAt = new Date().toISOString();
  const [db, gemini, tavily, gmail] = await Promise.all([
    timedProbe('database', async () => {
      if (!database?.prepare) throw new Error('DATABASE_UNAVAILABLE');
      const row = database.prepare('SELECT 1 AS ok').get();
      if (row?.ok !== 1) throw new Error('DATABASE_PROBE_FAILED');
      return { persistent: String(env.DATABASE_PATH || '') !== ':memory:' };
    }),
    timedProbe('gemini', () => probeGemini(env, fetchImpl)),
    timedProbe('tavily', () => probeTavily(env, fetchImpl)),
    timedProbe('gmail', () => probeGmail(env, fetchImpl)),
  ]);
  const services = { database: db, gemini, tavily, gmail };
  return {
    ok: Object.values(services).every((item) => item.ok || item.configured === false),
    checkedAt,
    services,
  };
}

export function createCachedHealthProbe(options = {}, ttlMs = 300_000) {
  let cached = null;
  let expiresAt = 0;
  let pending = null;
  return async function getHealth({ force = false } = {}) {
    if (!force && cached && Date.now() < expiresAt) return { ...cached, cached: true };
    if (!force && pending) return pending;
    pending = probeDeepHealth(options)
      .then((result) => {
        cached = result;
        expiresAt = Date.now() + ttlMs;
        return { ...result, cached: false };
      })
      .finally(() => { pending = null; });
    return pending;
  };
}
