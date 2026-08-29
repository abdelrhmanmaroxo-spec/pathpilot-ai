const DEFAULT_LIMITS = Object.freeze({
  guest: { ai: 12, auth: 12, general: 90 },
  user: { ai: 30, auth: 20, general: 150 },
  admin: { ai: 120, auth: 60, general: 300 },
});

function bucketFor(path) {
  if (path === '/api/research' || path === '/api/assistant') return 'ai';
  if (path.startsWith('/api/auth/')) return 'auth';
  return 'general';
}

export function createRoleRateLimiter({ windowMs = 60_000, limits = DEFAULT_LIMITS, now = () => Date.now() } = {}) {
  const records = new Map();

  function check({ identity, role = 'guest', path = '/', method = 'GET' }) {
    if (method === 'OPTIONS') return { allowed: true, limit: Infinity, remaining: Infinity, retryAfterSeconds: 0 };
    const normalizedRole = role === 'admin' ? 'admin' : role === 'user' ? 'user' : 'guest';
    const bucket = bucketFor(path);
    const limit = Number(limits[normalizedRole]?.[bucket] || limits.guest[bucket] || 60);
    const timestamp = now();
    const window = Math.floor(timestamp / windowMs);
    const key = `${normalizedRole}:${identity || 'unknown'}:${bucket}`;
    let record = records.get(key);
    if (!record || record.window !== window) {
      record = { window, count: 0 };
      records.set(key, record);
    }
    record.count += 1;
    const allowed = record.count <= limit;
    const remaining = Math.max(0, limit - record.count);
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil(((window + 1) * windowMs - timestamp) / 1000));

    if (records.size > 10_000 && Math.random() < 0.02) {
      for (const [recordKey, value] of records) {
        if (value.window < window - 1) records.delete(recordKey);
      }
    }

    return { allowed, limit, remaining, retryAfterSeconds, bucket, role: normalizedRole };
  }

  return { check };
}
