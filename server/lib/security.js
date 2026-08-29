const SUSPICIOUS_PATH_PARTS = [
  '/.env', '/.git', '/wp-admin', '/wp-login', '/phpmyadmin', '/vendor/phpunit',
  '/actuator', '/server-status', '/cgi-bin', '/boaform', '/HNAP1', '/.aws', '/.ssh',
  '/etc/passwd', '/proc/self', '/docker.sock', '/metadata/identity', '/latest/meta-data',
];

const MAX_BODY_BYTES = 128_000;
const MAX_URL_LENGTH = 2_048;
const MAX_HEADER_COUNT = 100;

function normalizeIp(value) {
  return String(value || 'unknown').replace(/^::ffff:/, '').slice(0, 80);
}

export function clientIp(request) {
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
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()');
  response.setHeader('X-DNS-Prefetch-Control', 'off');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  response.setHeader('X-Download-Options', 'noopen');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  response.setHeader('Origin-Agent-Cluster', '?1');
  response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
  if (isHttps) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function routePolicy(path) {
  if (path === '/api/auth/login' || path === '/api/auth/google') return { limit: 12, windowMs: 10 * 60_000, bucket: 'auth-login' };
  if (path === '/api/auth/register') return { limit: 6, windowMs: 15 * 60_000, bucket: 'auth-register' };
  if (['/api/auth/resend-verification', '/api/auth/forgot-password', '/api/auth/reset-password'].includes(path)) {
    return { limit: 6, windowMs: 15 * 60_000, bucket: 'auth-sensitive' };
  }
  if (path === '/api/research' || path === '/api/assistant') return { limit: 30, windowMs: 60_000, bucket: 'ai' };
  if (path.startsWith('/api/admin/') || path.startsWith('/api/security/')) return { limit: 120, windowMs: 60_000, bucket: 'admin' };
  if (path === '/api/feedback' || path === '/api/client-errors') return { limit: 30, windowMs: 60_000, bucket: 'telemetry' };
  return { limit: 180, windowMs: 60_000, bucket: 'general' };
}

function suspiciousPath(rawPath) {
  const path = String(rawPath || '').toLowerCase();
  if (path.includes('..') || path.includes('%2e%2e') || path.includes('%00') || path.includes('\\')) return true;
  return SUSPICIOUS_PATH_PARTS.some((part) => path.includes(part.toLowerCase()));
}

function contentTypeAllowed(request, method, path, contentLength) {
  if (method !== 'POST' || !path.startsWith('/api/') || contentLength === 0) return true;
  const type = String(request.headers['content-type'] || '').toLowerCase();
  return type.startsWith('application/json');
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
      const rawUrl = String(request.url || '/');
      if (rawUrl.length > MAX_URL_LENGTH) {
        return { allowed: false, status: 414, error: 'Request URL is too long.', code: 'URL_TOO_LONG' };
      }

      let url;
      try { url = new URL(rawUrl, 'http://localhost'); }
      catch { return { allowed: false, status: 400, error: 'Invalid request URL.', code: 'INVALID_URL' }; }
      const path = url.pathname;
      const method = String(request.method || 'GET').toUpperCase();
      const ip = clientIp(request);

      if (!['GET', 'POST', 'OPTIONS', 'HEAD'].includes(method)) {
        return { allowed: false, status: 405, error: 'Method not allowed.', code: 'METHOD_BLOCKED' };
      }
      if (suspiciousPath(rawUrl)) {
        return { allowed: false, status: 404, error: 'Not found.', code: 'SUSPICIOUS_PATH' };
      }

      const headerCount = Array.isArray(request.rawHeaders) ? Math.floor(request.rawHeaders.length / 2) : Object.keys(request.headers || {}).length;
      if (headerCount > MAX_HEADER_COUNT) {
        return { allowed: false, status: 431, error: 'Too many request headers.', code: 'TOO_MANY_HEADERS' };
      }

      const rawLength = request.headers['content-length'];
      const length = rawLength === undefined ? 0 : Number(rawLength);
      if (!Number.isFinite(length) || length < 0) {
        return { allowed: false, status: 400, error: 'Invalid content length.', code: 'INVALID_CONTENT_LENGTH' };
      }
      if (length > MAX_BODY_BYTES) {
        return { allowed: false, status: 413, error: 'Request body is too large.', code: 'BODY_TOO_LARGE' };
      }
      if (!contentTypeAllowed(request, method, path, length)) {
        return { allowed: false, status: 415, error: 'Content-Type must be application/json.', code: 'UNSUPPORTED_MEDIA_TYPE' };
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
