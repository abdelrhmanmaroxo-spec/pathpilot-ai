import { createPublicKey, verify } from 'node:crypto';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
let keyCache = { expiresAt: 0, keys: [] };

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function getGoogleKeys() {
  if (keyCache.expiresAt > Date.now() && keyCache.keys.length) return keyCache.keys;
  const response = await fetch(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('GOOGLE_KEYS_UNAVAILABLE');
  const payload = await response.json();
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  keyCache = { expiresAt: Date.now() + Math.max(300, maxAge) * 1000, keys: payload.keys || [] };
  return keyCache.keys;
}

export async function verifyGoogleCredential(credential, clientId) {
  if (!credential || !clientId) throw new Error('GOOGLE_AUTH_NOT_CONFIGURED');
  const parts = String(credential).split('.');
  if (parts.length !== 3) throw new Error('INVALID_GOOGLE_TOKEN');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('INVALID_GOOGLE_TOKEN');

  const keys = await getGoogleKeys();
  const jwk = keys.find((item) => item.kid === header.kid);
  if (!jwk) {
    keyCache.expiresAt = 0;
    const refreshed = await getGoogleKeys();
    const retryKey = refreshed.find((item) => item.kid === header.kid);
    if (!retryKey) throw new Error('INVALID_GOOGLE_TOKEN');
    const valid = verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), createPublicKey({ key: retryKey, format: 'jwk' }), Buffer.from(encodedSignature, 'base64url'));
    if (!valid) throw new Error('INVALID_GOOGLE_TOKEN');
  } else {
    const valid = verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(encodedSignature, 'base64url'));
    if (!valid) throw new Error('INVALID_GOOGLE_TOKEN');
  }

  const audienceValid = Array.isArray(payload.aud) ? payload.aud.includes(clientId) : payload.aud === clientId;
  if (!audienceValid || !VALID_ISSUERS.has(payload.iss)) throw new Error('INVALID_GOOGLE_TOKEN');
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('EXPIRED_GOOGLE_TOKEN');
  if (payload.nbf && payload.nbf * 1000 > Date.now() + 30_000) throw new Error('INVALID_GOOGLE_TOKEN');
  if (payload.email_verified !== true || !payload.email) throw new Error('UNVERIFIED_GOOGLE_EMAIL');

  return {
    sub: String(payload.sub || ''),
    email: String(payload.email),
    name: String(payload.name || payload.given_name || payload.email.split('@')[0]).slice(0, 60),
    picture: String(payload.picture || ''),
  };
}
