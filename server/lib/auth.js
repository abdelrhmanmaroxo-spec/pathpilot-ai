import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export const OWNER_IDENTITY_SHA256 = '1424b269c2238aa013af777f59195da1897669c79faa2d42dda38a009d96dcdb';
const OWNER_PEPPER = 'pathpilot-owner-v6-pepper::';
export const DEFAULT_SUPPORT_EMAIL = 'pathpilot.app00@gmail.com';

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isProtectedOwnerEmail(email, env = process.env) {
  const candidate = normalizeEmail(email);
  if (!candidate) return false;
  const explicitOwner = normalizeEmail(env.OWNER_EMAIL || env.ADMIN_EMAIL || '');
  if (explicitOwner) {
    return candidate === explicitOwner;
  }
  if (env === process.env) {
    const digest = createHash('sha256').update(`${OWNER_PEPPER}${candidate}`).digest('hex');
    const left = Buffer.from(digest, 'hex');
    const right = Buffer.from(OWNER_IDENTITY_SHA256, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }
  return false;
}

export async function hashPassword(password) {
  const value = String(password || '');
  if (value.length < 8 || value.length > 128) throw new Error('PASSWORD_LENGTH');
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(value, salt, 64);
  return `${salt}:${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash || '').split(':');
  if (!salt || !expectedHex) return false;
  const derived = Buffer.from(await scrypt(String(password || ''), salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function createVerificationCode() {
  return String(randomInt(100000, 1000000));
}

export function hashToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

export function hashEmailOtp(email, code) {
  return hashToken(`${normalizeEmail(email)}:${String(code || '').trim()}`);
}
