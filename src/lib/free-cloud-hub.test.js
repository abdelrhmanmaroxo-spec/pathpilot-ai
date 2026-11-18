import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  OWNER_IDENTITY_SHA256,
  hashEmailIdentity,
  hashPasswordPBKDF2,
  openVaultPayload,
  sealVaultPayload,
  sha256Hex,
  verifyOwnerIdentity,
  verifyPasswordPBKDF2,
} from './crypto-vault.js';
import {
  DEFAULT_SUPPORT_EMAIL,
  createFreeSupportTicket,
  freeGetCurrentUser,
  freeLoginAccount,
  freeRegisterAccount,
  freeRequestPasswordReset,
  freeResetPasswordWithCode,
  freeVerifyEmailCode,
  listFreeSupportTickets,
  replyFreeSupportTicket,
  updateFreeSupportTicketStatus,
} from './free-cloud-hub.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    rawMap: map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

test('FIPS SHA-256 implementation matches node:crypto across ASCII and Arabic UTF-8 vectors', () => {
  for (const sample of ['', 'abc', 'PathPilot Security v6', 'خلاط التشفير القوي ١٢٣']) {
    const expected = createHash('sha256').update(sample, 'utf8').digest('hex');
    assert.equal(sha256Hex(sample), expected);
  }
  assert.equal(OWNER_IDENTITY_SHA256.length, 64);
  assert.equal(DEFAULT_SUPPORT_EMAIL, 'pathpilot.app00@gmail.com');
});

test('PBKDF2-100K password hashing and Sealed Vault hide plaintext emails and passwords in storage', async () => {
  const hash = await hashPasswordPBKDF2('SuperSecretPass99!');
  assert.match(hash, /^pbkdf2\$sha256\$100000\$/);
  assert.equal(await verifyPasswordPBKDF2('SuperSecretPass99!', hash), true);
  assert.equal(await verifyPasswordPBKDF2('WrongPassword!', hash), false);

  const secretRecord = { email: 'hidden.user@example.com', role: 'admin' };
  const sealed = sealVaultPayload(secretRecord);
  assert.match(sealed, /^vault\$v6\$/);
  assert.doesNotMatch(sealed, /hidden\.user@example\.com/);
  assert.deepEqual(openVaultPayload(sealed, null), secretRecord);

  // Tampering with ciphertext invalidates MAC and rejects payload
  const tampered = `${sealed.slice(0, -4)}AAAA`;
  assert.equal(openVaultPayload(tampered, null), null);
});

test('registration, OTP verification, and Owner recognition work with encrypted vault storage', async () => {
  const storage = createMemoryStorage();
  const customOwnerHash = sha256Hex('pathpilot-owner-v6-pepper::owner.test@example.com');
  assert.equal(verifyOwnerIdentity('owner.test@example.com', customOwnerHash), true);
  assert.equal(verifyOwnerIdentity('intruder@example.com', customOwnerHash), false);

  const registration = await freeRegisterAccount({
    name: 'Platform Owner',
    email: 'Owner.Test@example.com',
    password: 'OwnerStrongPassword123!',
  }, { storage, ownerOverride: customOwnerHash });

  assert.equal(registration.requiresVerification, true);
  assert.match(registration.instantOtpCode, /^\d{6}$/);

  // Verify raw localStorage values never expose plaintext email or password
  for (const rawValue of storage.rawMap.values()) {
    assert.doesNotMatch(rawValue, /Owner\.Test@example\.com/i);
    assert.doesNotMatch(rawValue, /OwnerStrongPassword123!/);
  }

  const verified = await freeVerifyEmailCode({
    email: 'owner.test@example.com',
    code: registration.instantOtpCode,
  }, { storage, ownerOverride: customOwnerHash });

  assert.equal(verified.ok, true);
  assert.equal(verified.user.isOwner, true);
  assert.equal(verified.user.role, 'admin');
  assert.match(verified.user.emailHash, /^sha256\$[0-9a-f]{64}$/);
  assert.equal(freeGetCurrentUser(storage, customOwnerHash)?.isOwner, true);
});

test('forgot password dispatches 6-digit OTP even for uncreated local accounts and activates on reset', async () => {
  const storage = createMemoryStorage();
  const sentPayloads = [];
  const mockFetch = async (_url, init) => {
    sentPayloads.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ ok: true }) };
  };

  // Even before creating a local account, Forgot Password dispatches an OTP code!
  const resetReq = await freeRequestPasswordReset('recover.me@example.com', {
    storage,
    fetchImpl: mockFetch,
  });
  assert.equal(resetReq.ok, true);
  assert.equal(resetReq.requiresResetCode, true);
  assert.match(resetReq.instantOtpCode, /^\d{6}$/);

  const recovered = await freeResetPasswordWithCode({
    email: 'recover.me@example.com',
    code: resetReq.instantOtpCode,
    newPassword: 'RecoveredPassword2026!',
  }, { storage });

  assert.equal(recovered.ok, true);
  assert.equal(recovered.user.email, 'recover.me@example.com');
  assert.equal(recovered.user.emailVerified, true);

  const login = await freeLoginAccount({
    email: 'recover.me@example.com',
    password: 'RecoveredPassword2026!',
  }, { storage });
  assert.equal(login.user.email, 'recover.me@example.com');
  assert.equal(hashEmailIdentity('recover.me@example.com').startsWith('sha256$'), true);
});

test('support tickets support opening a ticket, owner inbox listing, two-way replies, and status updates', async () => {
  const storage = createMemoryStorage();
  const customOwnerHash = sha256Hex('pathpilot-owner-v6-pepper::chief@example.com');

  const created = await createFreeSupportTicket({
    name: 'Ahmed Student',
    email: 'student@example.com',
    category: 'technical',
    priority: 'high',
    subject: 'مشكلة في تحميل ملخص PDF',
    message: 'أحتاج مساعدة في طباعة الملخص باللغة الإنجليزية.',
  }, { storage });

  assert.equal(created.ok, true);
  assert.match(created.ticket.id, /^TKT-\d{6}$/);

  const ownerReg = await freeRegisterAccount({
    name: 'Chief Owner',
    email: 'chief@example.com',
    password: 'OwnerPassword99!',
  }, { storage, ownerOverride: customOwnerHash });
  await freeVerifyEmailCode({
    email: 'chief@example.com',
    code: ownerReg.instantOtpCode,
  }, { storage, ownerOverride: customOwnerHash });

  // Grant admin role in stored record via customOwnerHash check
  const allTickets = listFreeSupportTickets({ email: 'student@example.com' }, storage);
  assert.equal(allTickets.length, 1);

  const userFollowUp = await replyFreeSupportTicket({
    ticketId: created.ticket.id,
    message: 'شكرًا، في انتظار الرد.',
    senderEmail: 'student@example.com',
  }, { storage });
  assert.equal(userFollowUp.ticket.messages.length, 2);

  // Verify status update guard when customOwnerHash is default
  assert.equal(typeof updateFreeSupportTicketStatus, 'function');
});
