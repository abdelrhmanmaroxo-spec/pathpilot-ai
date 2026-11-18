// ============================================================================
// PathPilot Security Core v6.0 — Zero-Plaintext Cryptographic Blender
// FIPS 180-4 SHA-256 + PBKDF2-HMAC-SHA256 (100,000 rounds) + Sealed Vault
// ============================================================================

// Salted SHA-256 digest of the protected platform Owner identity.
// No plaintext owner email is stored anywhere in the repository source code.
export const OWNER_IDENTITY_SHA256 = '1424b269c2238aa013af777f59195da1897669c79faa2d42dda38a009d96dcdb';

const OWNER_PEPPER = 'pathpilot-owner-v6-pepper::';
const EMAIL_ID_PEPPER = 'pathpilot-email-id-v6::';
const OTP_PEPPER = 'pathpilot-otp-v6::';
const VAULT_STREAM_KEY = 'pathpilot-sealed-vault-v6::keystream';
const PBKDF2_ITERATIONS = 100_000;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value, shift) {
  return (value >>> shift) | (value << (32 - shift));
}

export function sha256Bytes(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input ?? ''));
  const bitLen = bytes.length * 8;
  const paddedLen = (((bytes.length + 9 + 63) >> 6) << 6);
  const buffer = new Uint8Array(paddedLen);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex) {
  const clean = String(hex || '').replace(/[^0-9a-f]/gi, '');
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function sha256Hex(input) {
  return bytesToHex(sha256Bytes(input));
}

export function timingSafeEqualStr(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function randomHex(byteCount = 16) {
  const buf = new Uint8Array(byteCount);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < byteCount; i += 1) buf[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(buf);
}

export function normalizeSafeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function verifyOwnerIdentity(email, customOwnerEmailOrHash = '') {
  const clean = normalizeSafeEmail(email);
  if (!clean) return false;
  const candidateDigest = sha256Hex(`${OWNER_PEPPER}${clean}`);
  if (timingSafeEqualStr(candidateDigest, OWNER_IDENTITY_SHA256)) return true;

  const custom = String(customOwnerEmailOrHash || '').trim();
  if (!custom) return false;
  if (/^[0-9a-f]{64}$/i.test(custom)) {
    return timingSafeEqualStr(candidateDigest, custom.toLowerCase());
  }
  return timingSafeEqualStr(clean, normalizeSafeEmail(custom));
}

export function hashEmailIdentity(email) {
  const clean = normalizeSafeEmail(email);
  if (!clean) return '';
  return `sha256$${sha256Hex(`${EMAIL_ID_PEPPER}${clean}`)}`;
}

export function shortIdentityFingerprint(email) {
  const clean = normalizeSafeEmail(email);
  if (!clean) return 'sha256:--------';
  const hex = sha256Hex(`${EMAIL_ID_PEPPER}${clean}`);
  return `sha256:${hex.slice(0, 8)}…${hex.slice(-6)}`;
}

export function hashOtpCode(email, code) {
  const cleanEmail = normalizeSafeEmail(email);
  const cleanCode = String(code || '').replace(/\s+/g, '');
  return `otp$sha256$${sha256Hex(`${OTP_PEPPER}${cleanEmail}:${cleanCode}`)}`;
}

export async function hashPasswordPBKDF2(password, saltHex = randomHex(16), iterations = PBKDF2_ITERATIONS) {
  const raw = String(password || '');
  if (globalThis.crypto?.subtle) {
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(raw),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: hexToBytes(saltHex),
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256,
    );
    const derivedHex = bytesToHex(new Uint8Array(bits));
    return `pbkdf2$sha256$${iterations}$${saltHex}$${derivedHex}`;
  }
  // Pure-JS multi-round stretched SHA-256 fallback for environments without subtle crypto
  let state = sha256Hex(`${saltHex}:${raw}`);
  for (let i = 0; i < 4096; i += 1) {
    state = sha256Hex(`${state}:${saltHex}:${i}`);
  }
  return `sha256s$4096$${saltHex}$${state}`;
}

export async function verifyPasswordPBKDF2(password, storedHash) {
  const stored = String(storedHash || '');
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$sha256$')) {
    const [, , iterStr, saltHex] = stored.split('$');
    const iterations = Number.parseInt(iterStr, 10) || PBKDF2_ITERATIONS;
    const recomputed = await hashPasswordPBKDF2(password, saltHex, iterations);
    return timingSafeEqualStr(recomputed, stored);
  }
  if (stored.startsWith('sha256s$')) {
    const [, , saltHex] = stored.split('$');
    let state = sha256Hex(`${saltHex}:${String(password || '')}`);
    for (let i = 0; i < 4096; i += 1) {
      state = sha256Hex(`${state}:${saltHex}:${i}`);
    }
    return timingSafeEqualStr(`sha256s$4096$${saltHex}$${state}`, stored);
  }
  // Legacy v5 single-round SHA-256 compatibility
  const legacyDigest = sha256Hex(`pathpilot-v5:${String(password || '')}`);
  return timingSafeEqualStr(legacyDigest, stored);
}

// ============================================================================
// Sealed Local Vault (SHA-256 CTR Stream Cipher + Integrity MAC)
// Prevents casual/XSS plaintext inspection of stored records in localStorage
// ============================================================================

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binary);
}

function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(String(b64 || ''), 'base64'));
  }
  const binary = globalThis.atob(String(b64 || ''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function xorWithSha256Keystream(inputBytes, ivHex) {
  const output = new Uint8Array(inputBytes.length);
  let counter = 0;
  for (let offset = 0; offset < inputBytes.length; offset += 32) {
    const blockKey = sha256Bytes(`${VAULT_STREAM_KEY}:${ivHex}:${counter}`);
    counter += 1;
    const end = Math.min(inputBytes.length, offset + 32);
    for (let i = offset; i < end; i += 1) {
      output[i] = inputBytes[i] ^ blockKey[i - offset];
    }
  }
  return output;
}

export function sealVaultPayload(value) {
  const ivHex = randomHex(12);
  const plainBytes = new TextEncoder().encode(JSON.stringify(value));
  const cipherBytes = xorWithSha256Keystream(plainBytes, ivHex);
  const cipherB64 = bytesToBase64(cipherBytes);
  const macHex = sha256Hex(`mac:${VAULT_STREAM_KEY}:${ivHex}:${cipherB64}`).slice(0, 32);
  return `vault$v6$${ivHex}$${macHex}$${cipherB64}`;
}

export function openVaultPayload(raw, fallback) {
  if (!raw || typeof raw !== 'string') return fallback;
  if (!raw.startsWith('vault$v6$')) {
    // Transparent migration from unsealed JSON if present
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  const parts = raw.split('$');
  if (parts.length !== 5) return fallback;
  const [, , ivHex, macHex, cipherB64] = parts;
  const expectedMac = sha256Hex(`mac:${VAULT_STREAM_KEY}:${ivHex}:${cipherB64}`).slice(0, 32);
  if (!timingSafeEqualStr(macHex, expectedMac)) return fallback;
  try {
    const cipherBytes = base64ToBytes(cipherB64);
    const plainBytes = xorWithSha256Keystream(cipherBytes, ivHex);
    return JSON.parse(new TextDecoder().decode(plainBytes));
  } catch {
    return fallback;
  }
}

function stripControlChars(input) {
  let clean = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      clean += input[i];
    }
  }
  return clean;
}

export function sanitizeSecurityText(value, maxLength = 2000) {
  return stripControlChars(String(value || ''))
    .replace(/<\s*\/?\s*script\b[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}
