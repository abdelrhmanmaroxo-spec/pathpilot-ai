const SUSPICIOUS_PATH_PARTS = [
  '/.env', '/.git', '/wp-admin', '/wp-login', '/phpmyadmin', '/vendor/phpunit',
  '/actuator', '/server-status', '/cgi-bin', '/boaform', '/HNAP1', '/.aws', '/.ssh',
];

function normalizeIp(value) {
  return String(value || 'unknown').replace(/^::ffff:/, '').slice(0, 80);
}

export function clientIp(request) {
  // Railway's edge proxy supplies X-Forwarded-For. Keep the first public-facing hop
  // for audit/rate limiting, with safe fallbacks for local development.
  const forwarded = String(request.headers['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalizeIp(
    forwarded[0]
      || request.headers['x-real-ip']
      || request.headers['cf-connecting-ip']
      || request.socket?.remoteAddress,
  );
}

export function applySecurityHeaders(request, response) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const isHttps = forwardedProto === 'https';
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  response.setHeader('X-DNS-Prefetch-Control', 'off');
  response.setHeader('Cache-Control', 'no-store');
  if (isHttps) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function routePolicy(path) {
  if (path === '/api/auth/login' || path === '/api/auth/google') return { limit: 12, windowMs: 10 * 60_000, bucket: 'auth-login' };
  if (['/api/auth/register', '/api/auth/resend-verification', '/api/auth/forgot-password', '/api/auth/reset-password'].includes(path)) {
    return { limit: 8, windowMs: 10 * 60_000, bucket: 'auth-sensitive' };
  }
  if (path === '/api/research' || path === '/api/assistant') return { limit: 30, windowMs: 60_000, bucket: 'ai' };
  if (path.startsWith('/api/admin/')) return { limit: 180, windowMs: 60_000, bucket: 'admin' };
  if (path === '/api/feedback' || path === '/api/client-errors') return { limit: 40, windowMs: 60_000, bucket: 'telemetry' };
  return { limit: 240, windowMs: 60_000, bucket: 'general' };
}

function suspiciousPath(rawPath) {
  const path = String(rawPath || '').toLowerCase();
  if (path.includes('..') || path.includes('%2e%2e') || path.includes('%00')) return true;
  return SUSPICIOUS_PATH_PARTS.some((part) => path.includes(part.toLowerCase()));
}

export function createSecurityGuard() {
  const buckets = new Map();
  let lastCleanup = Date.now();

  function cleanup(now) {
    if (now - lastCleanup < 5 * 60_000) return;
    lastCleanup = now;
    for (const [key, record] of buckets) {
      if (record.resetAt <= now) buckets.delete(key);
    }
  }

  return {
    check(request) {
      const now = Date.now();
      cleanup(now);
      const url = new URL(request.url || '/', 'http://localhost');
      const path = url.pathname;
      const method = String(request.method || 'GET').toUpperCase();
      const ip = clientIp(request);

      if (!['GET', 'POST', 'OPTIONS', 'HEAD'].includes(method)) {
        return { allowed: false, status: 405, error: 'Method not allowed.', code: 'METHOD_BLOCKED' };
      }
      if (suspiciousPath(request.url)) {
        return { allowed: false, status: 404, error: 'Not found.', code: 'SUSPICIOUS_PATH' };
      }

      const length = Number(request.headers['content-length'] || 0);
      if (Number.isFinite(length) && length > 128_000) {
        return { allowed: false, status: 413, error: 'Request body is too large.', code: 'BODY_TOO_LARGE' };
      }

      const policy = routePolicy(path);
      const key = `${ip}:${policy.bucket}`;
      let record = buckets.get(key);
      if (!record || record.resetAt <= now) {
        record = { count: 0, resetAt: now + policy.windowMs };
        buckets.set(key, record);
      }
      record.count += 1;
      if (record.count > policy.limit) {
        return {
          allowed: false,
          status: 429,
          error: 'Too many requests. Try again later.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
        };
      }

      return { allowed: true, ip };
    },
  };
}
