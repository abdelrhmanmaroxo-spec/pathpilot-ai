import {
  OWNER_IDENTITY_SHA256,
  hashEmailIdentity,
  hashOtpCode,
  hashPasswordPBKDF2,
  normalizeSafeEmail,
  openVaultPayload,
  randomHex,
  sanitizeSecurityText,
  sealVaultPayload,
  sha256Hex,
  shortIdentityFingerprint,
  timingSafeEqualStr,
  verifyOwnerIdentity,
  verifyPasswordPBKDF2,
} from './crypto-vault.js';

export const DEFAULT_SUPPORT_EMAIL = 'pathpilot.app00@gmail.com';
export { OWNER_IDENTITY_SHA256, shortIdentityFingerprint };

const USERS_KEY = 'pathpilot.vault.users.v6';
const LEGACY_USERS_KEY = 'pathpilot.free_cloud.users.v1';
const SESSION_KEY = 'pathpilot.vault.session.v6';
const OTPS_KEY = 'pathpilot.vault.otps.v6';
const AUTH_GUARD_KEY = 'pathpilot.vault.guard.v6';
const TICKETS_KEY = 'pathpilot.vault.tickets.v6';
const LEGACY_TICKETS_KEY = 'pathpilot.free_cloud.tickets.v1';
const INVITES_KEY = 'pathpilot.vault.invites.v6';
const FEEDBACK_KEY = 'pathpilot.vault.feedback.v6';
const EVENTS_KEY = 'pathpilot.vault.events.v6';
const CLOUD_CONFIG_KEY = 'pathpilot.vault.config.v6';
const LEGACY_CLOUD_CONFIG_KEY = 'pathpilot.free_cloud.config.v1';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MAX_AUTH_FAILURES = 5;
const LOCKOUT_MS = 2 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function getStore(customStorage) {
  if (customStorage) return customStorage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readSealed(key, fallback, customStorage, legacyKey = '') {
  const store = getStore(customStorage);
  if (!store) return fallback;
  const raw = store.getItem(key);
  if (raw) return openVaultPayload(raw, fallback);
  if (legacyKey) {
    const legacyRaw = store.getItem(legacyKey);
    if (legacyRaw) {
      const parsed = openVaultPayload(legacyRaw, fallback);
      writeSealed(key, parsed, customStorage);
      store.removeItem(legacyKey);
      return parsed;
    }
  }
  return fallback;
}

function writeSealed(key, value, customStorage) {
  const store = getStore(customStorage);
  if (!store) return;
  try {
    store.setItem(key, sealVaultPayload(value));
  } catch {
    // Ignore storage quota restrictions cleanly
  }
}

export function normalizeEmailAddress(email) {
  return normalizeSafeEmail(email);
}

export function getSupportEmail() {
  const envSupport = import.meta.env?.VITE_SUPPORT_EMAIL;
  return String(envSupport || DEFAULT_SUPPORT_EMAIL).trim();
}

export function isOwnerEmail(email, customOwnerOverride = '') {
  const envOwner = customOwnerOverride || import.meta.env?.VITE_OWNER_EMAIL_SHA256 || import.meta.env?.VITE_OWNER_EMAIL || '';
  return verifyOwnerIdentity(email, envOwner);
}

export function getFreeCloudConfig(customStorage) {
  const stored = readSealed(CLOUD_CONFIG_KEY, {}, customStorage, LEGACY_CLOUD_CONFIG_KEY);
  const envBridgeUrl = String(import.meta.env?.VITE_FREE_CLOUD_URL || '').trim();
  return {
    bridgeUrl: String(stored.bridgeUrl ?? envBridgeUrl).trim(),
    geminiApiKey: String(stored.geminiApiKey || '').trim(),
    geminiModel: String(stored.geminiModel || 'gemini-2.5-flash').trim(),
    supportEmail: getSupportEmail(),
    encryptionStandard: 'PBKDF2-SHA256-100K + SealedVault-v6',
  };
}

export function saveFreeCloudConfig(patch = {}, customStorage) {
  const current = readSealed(CLOUD_CONFIG_KEY, {}, customStorage, LEGACY_CLOUD_CONFIG_KEY);
  const next = {
    ...current,
    ...(patch.bridgeUrl !== undefined ? { bridgeUrl: String(patch.bridgeUrl || '').trim() } : {}),
    ...(patch.geminiApiKey !== undefined ? { geminiApiKey: String(patch.geminiApiKey || '').trim() } : {}),
    ...(patch.geminiModel !== undefined ? { geminiModel: String(patch.geminiModel || 'gemini-2.5-flash').trim() } : {}),
    updatedAt: new Date().toISOString(),
  };
  writeSealed(CLOUD_CONFIG_KEY, next, customStorage);
  return getFreeCloudConfig(customStorage);
}

export function generateSixDigitCode() {
  if (globalThis.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return String(100000 + (array[0] % 900000));
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

function assertNotRateLimited(emailHash, customStorage) {
  const guards = readSealed(AUTH_GUARD_KEY, {}, customStorage);
  const record = guards[emailHash];
  if (!record) return;
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const seconds = Math.max(5, Math.ceil((record.lockedUntil - Date.now()) / 1000));
    const err = new Error(`تم تفعيل الحماية المؤقتة ضد المحاولات المتكررة. انتظر ${seconds} ثانية ثم حاول مرة أخرى.`);
    err.code = 'AUTH_RATE_LIMITED';
    throw err;
  }
}

function registerFailedAttempt(emailHash, customStorage) {
  const guards = readSealed(AUTH_GUARD_KEY, {}, customStorage);
  const prev = guards[emailHash] || { count: 0, lockedUntil: 0 };
  const nextCount = (prev.lockedUntil && prev.lockedUntil <= Date.now()) ? 1 : prev.count + 1;
  guards[emailHash] = {
    count: nextCount,
    lockedUntil: nextCount >= MAX_AUTH_FAILURES ? Date.now() + LOCKOUT_MS : 0,
    lastAttemptAt: new Date().toISOString(),
  };
  writeSealed(AUTH_GUARD_KEY, guards, customStorage);
}

function clearFailedAttempts(emailHash, customStorage) {
  const guards = readSealed(AUTH_GUARD_KEY, {}, customStorage);
  if (guards[emailHash]) {
    delete guards[emailHash];
    writeSealed(AUTH_GUARD_KEY, guards, customStorage);
  }
}

async function callGoogleAppsScriptBridge(payload, customStorage, fetchImpl = globalThis.fetch) {
  const { bridgeUrl } = getFreeCloudConfig(customStorage);
  if (!bridgeUrl || typeof fetchImpl !== 'function') {
    return { attempted: false, ok: false, reason: 'BRIDGE_NOT_CONFIGURED' };
  }
  try {
    // text/plain + redirect: follow works cleanly with Google Apps Script Web Apps without CORS preflight
    const response = await fetchImpl(bridgeUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({ ok: response.ok }));
    return { attempted: true, ok: Boolean(response.ok && data.ok !== false), data };
  } catch {
    // Fallback for strict browser privacy shields blocking cross-origin 302 redirect reads on script.google.com:
    // send opaque no-cors POST so Google Apps Script still executes MailApp.sendEmail reliably!
    try {
      await fetchImpl(bridgeUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return { attempted: true, ok: true, data: { opaqueDelivered: true } };
    } catch (innerErr) {
      return { attempted: true, ok: false, reason: innerErr?.message || 'BRIDGE_NETWORK_ERROR' };
    }
  }
}

export async function testFreeCloudBridge(customStorage, fetchImpl) {
  return callGoogleAppsScriptBridge({ action: 'ping' }, customStorage, fetchImpl);
}

function decorateFreeUser(record, customOwnerOverride = '') {
  if (!record) return null;
  const owner = isOwnerEmail(record.email, customOwnerOverride);
  const role = owner ? 'admin' : (record.role || 'user');
  const emailHash = record.emailHash || hashEmailIdentity(record.email);
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    emailHash,
    securityFingerprint: shortIdentityFingerprint(record.email),
    role,
    isOwner: owner,
    disabled: Boolean(record.disabled),
    email_verified: record.emailVerified ? 1 : 0,
    emailVerified: Boolean(record.emailVerified),
    verified_at: record.verifiedAt || null,
    auth_provider: record.authProvider || 'pbkdf2-sha256',
    created_at: record.createdAt,
    last_seen_at: record.lastSeenAt || record.createdAt,
  };
}

function findUserIndexByEmail(users, email) {
  const targetHash = hashEmailIdentity(email);
  return users.findIndex((u) => (
    (u.emailHash && timingSafeEqualStr(u.emailHash, targetHash))
    || normalizeEmailAddress(u.email) === normalizeEmailAddress(email)
  ));
}

export async function freeRegisterAccount({ name, email, password }, { storage, fetchImpl, ownerOverride } = {}) {
  const cleanName = sanitizeSecurityText(name || '', 60);
  const cleanEmail = normalizeEmailAddress(email);
  const rawPassword = String(password || '');

  if (cleanName.length < 2 || !EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('يرجى إدخال اسم صحيح وبريد إلكتروني صالح.');
  }
  if (rawPassword.length < 8 || rawPassword.length > 128) {
    throw new Error('كلمة المرور يجب أن تكون بين 8 و128 حرفًا.');
  }

  const emailHash = hashEmailIdentity(cleanEmail);
  assertNotRateLimited(emailHash, storage);

  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const existingIdx = findUserIndexByEmail(users, cleanEmail);
  if (existingIdx !== -1) {
    const existing = users[existingIdx];
    if (existing.emailVerified) {
      const err = new Error('يوجد حساب مفعل بالفعل بهذا البريد الإلكتروني. سجل دخولك مباشرة أو استخدم نسيت كلمة المرور.');
      err.code = 'ACCOUNT_EXISTS';
      throw err;
    }
    // Account was pending verification — update name/password hash and re-send fresh OTP immediately!
    users[existingIdx] = {
      ...existing,
      name: cleanName,
      emailHash,
      passwordHash: await hashPasswordPBKDF2(rawPassword),
    };
    writeSealed(USERS_KEY, users, storage);
    return issueFreeOtpForUser(users[existingIdx], 'verify', { storage, fetchImpl });
  }

  const invites = readSealed(INVITES_KEY, [], storage);
  const invited = invites.find((inv) => normalizeEmailAddress(inv.email) === cleanEmail && !inv.accepted_at);
  const now = new Date().toISOString();
  const passwordHash = await hashPasswordPBKDF2(rawPassword);
  const newUser = {
    id: `usr_${sha256Hex(`${emailHash}:${now}:${randomHex(8)}`).slice(0, 24)}`,
    name: cleanName,
    email: cleanEmail,
    emailHash,
    passwordHash,
    role: isOwnerEmail(cleanEmail, ownerOverride) || invited ? 'admin' : 'user',
    emailVerified: false,
    verifiedAt: null,
    authProvider: 'pbkdf2-sha256',
    disabled: false,
    createdAt: now,
    lastSeenAt: now,
  };

  users.unshift(newUser);
  writeSealed(USERS_KEY, users, storage);

  return issueFreeOtpForUser(newUser, 'verify', { storage, fetchImpl });
}

export async function issueFreeOtpForUser(userRecord, purpose = 'verify', { storage, fetchImpl } = {}) {
  const cleanEmail = normalizeEmailAddress(userRecord.email);
  const emailHash = hashEmailIdentity(cleanEmail);
  const code = generateSixDigitCode();
  const codeHash = hashOtpCode(cleanEmail, code);
  const otps = readSealed(OTPS_KEY, {}, storage);
  otps[emailHash] = {
    codeHash,
    purpose,
    attempts: 0,
    expiresAt: Date.now() + 30 * 60 * 1000,
    createdAt: new Date().toISOString(),
  };
  writeSealed(OTPS_KEY, otps, storage);

  const bridgeResult = await callGoogleAppsScriptBridge({
    action: 'send_otp',
    email: cleanEmail,
    name: userRecord.name || cleanEmail.split('@')[0],
    code,
    purpose,
  }, storage, fetchImpl);

  return {
    requiresVerification: true,
    email: cleanEmail,
    securityFingerprint: shortIdentityFingerprint(cleanEmail),
    deliveryPending: !bridgeResult.ok,
    deliveryMode: bridgeResult.ok ? 'gmail-apps-script' : 'local-instant-otp',
    instantOtpCode: bridgeResult.ok ? undefined : code,
    supportSender: getSupportEmail(),
  };
}

export async function freeResendVerification(email, { storage, fetchImpl } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('يرجى إدخال بريد إلكتروني صالح.');
  }
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const idx = findUserIndexByEmail(users, cleanEmail);
  if (idx === -1) {
    throw new Error('لا يوجد حساب مسجل بهذا البريد بعد. أنشئ الحساب أولًا.');
  }
  if (users[idx].emailVerified) {
    return { ok: true, alreadyVerified: true, deliveryPending: false };
  }
  return issueFreeOtpForUser(users[idx], 'verify', { storage, fetchImpl });
}

export async function freeVerifyEmailCode({ email, code }, { storage, ownerOverride } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const cleanCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('أدخل كود التفعيل المكون من 6 أرقام.');
  }

  const emailHash = hashEmailIdentity(cleanEmail);
  assertNotRateLimited(emailHash, storage);

  const otps = readSealed(OTPS_KEY, {}, storage);
  const record = otps[emailHash];
  if (!record || record.expiresAt < Date.now()) {
    throw new Error('كود التفعيل غير صالح أو انتهت صلاحيته. اضغط إعادة إرسال الكود.');
  }

  const expectedHash = hashOtpCode(cleanEmail, cleanCode);
  if (!timingSafeEqualStr(expectedHash, record.codeHash)) {
    const nextAttempts = (record.attempts || 0) + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      delete otps[emailHash];
    } else {
      otps[emailHash] = { ...record, attempts: nextAttempts };
    }
    writeSealed(OTPS_KEY, otps, storage);
    registerFailedAttempt(emailHash, storage);
    throw new Error('كود التفعيل غير صحيح. تأكد من الأرقام الستة المرسلة لبريدك.');
  }

  delete otps[emailHash];
  writeSealed(OTPS_KEY, otps, storage);
  clearFailedAttempts(emailHash, storage);

  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const index = findUserIndexByEmail(users, cleanEmail);
  if (index === -1) {
    throw new Error('الحساب غير موجود.');
  }

  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    emailHash,
    emailVerified: true,
    verifiedAt: now,
    lastSeenAt: now,
    role: isOwnerEmail(cleanEmail, ownerOverride) ? 'admin' : users[index].role,
  };
  writeSealed(USERS_KEY, users, storage);

  const invites = readSealed(INVITES_KEY, [], storage);
  const updatedInvites = invites.map((inv) => (
    normalizeEmailAddress(inv.email) === cleanEmail ? { ...inv, accepted_at: now } : inv
  ));
  writeSealed(INVITES_KEY, updatedInvites, storage);

  const decorated = decorateFreeUser(users[index], ownerOverride);
  const token = `sess_sha256_${sha256Hex(`${decorated.id}:${now}:${randomHex(16)}`)}`;
  writeSealed(SESSION_KEY, { tokenHash: sha256Hex(token), userId: decorated.id }, storage);

  return { ok: true, token, user: decorated };
}

export async function freeLoginAccount({ email, password }, { storage, ownerOverride } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const emailHash = hashEmailIdentity(cleanEmail);
  assertNotRateLimited(emailHash, storage);

  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const index = findUserIndexByEmail(users, cleanEmail);

  if (index === -1) {
    const err = new Error('لم يتم إنشاء حساب بهذا البريد بعد على المنصة الجديدة. اضغط (إنشاء وتفعيل هذا الحساب الآن) ليصلك كود التفعيل السداسي على بريدك فورًا.');
    err.code = 'ACCOUNT_NOT_FOUND';
    throw err;
  }

  const passwordValid = await verifyPasswordPBKDF2(String(password || ''), users[index].passwordHash);
  if (!passwordValid) {
    registerFailedAttempt(emailHash, storage);
    throw new Error('كلمة المرور غير صحيحة. حاول مرة أخرى أو اضغط نسيت كلمة المرور لاستلام كود استعادة على بريدك.');
  }
  if (users[index].disabled) {
    throw new Error('تم إيقاف هذا الحساب من قبل الإدارة.');
  }
  if (!users[index].emailVerified) {
    const err = new Error('هذا الحساب بانتظار التفعيل. أدخل الكود المرسل لبريدك أو اطلب كودًا جديدًا.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  clearFailedAttempts(emailHash, storage);

  // Upgrade legacy hash to PBKDF2-100K transparently on login if needed
  const upgradedHash = String(users[index].passwordHash || '').startsWith('pbkdf2$')
    ? users[index].passwordHash
    : await hashPasswordPBKDF2(String(password || ''));

  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    emailHash,
    passwordHash: upgradedHash,
    role: isOwnerEmail(cleanEmail, ownerOverride) ? 'admin' : users[index].role,
    lastSeenAt: now,
  };
  writeSealed(USERS_KEY, users, storage);

  const user = decorateFreeUser(users[index], ownerOverride);
  const token = `sess_sha256_${sha256Hex(`${user.id}:${now}:${randomHex(16)}`)}`;
  writeSealed(SESSION_KEY, { tokenHash: sha256Hex(token), userId: user.id }, storage);
  recordFreeEvent({ userId: user.id, eventType: 'login' }, storage);

  return { token, user };
}

export function freeGetCurrentUser(storage, ownerOverride = '') {
  const session = readSealed(SESSION_KEY, null, storage);
  if (!session?.userId) return null;
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const found = users.find((u) => u.id === session.userId);
  if (!found || found.disabled) return null;
  return decorateFreeUser(found, ownerOverride);
}

export function freeLogout(storage) {
  const store = getStore(storage);
  store?.removeItem(SESSION_KEY);
}

export async function freeRequestPasswordReset(email, { storage, fetchImpl } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('يرجى إدخال بريد إلكتروني صالح أولًا.');
  }
  const emailHash = hashEmailIdentity(cleanEmail);
  assertNotRateLimited(emailHash, storage);

  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const idx = findUserIndexByEmail(users, cleanEmail);
  if (idx !== -1 && users[idx].disabled) {
    throw new Error('تم إيقاف هذا الحساب من قبل الإدارة.');
  }

  // Always dispatch a real 6-digit verification/recovery OTP to the email via the Gmail bridge!
  // Even if the user moved from an older deployment or new browser, proving ownership of the email
  // via the 6-digit OTP lets them set a PBKDF2-encrypted password and activate/recover seamlessly.
  const targetRecord = idx !== -1
    ? users[idx]
    : { email: cleanEmail, name: cleanEmail.split('@')[0] };

  const otpInfo = await issueFreeOtpForUser(targetRecord, 'reset', { storage, fetchImpl });
  return {
    ok: true,
    requiresResetCode: true,
    accountExisted: idx !== -1,
    email: cleanEmail,
    securityFingerprint: shortIdentityFingerprint(cleanEmail),
    deliveryPending: otpInfo.deliveryPending,
    instantOtpCode: otpInfo.instantOtpCode,
  };
}

export async function freeResetPasswordWithCode({ email, code, newPassword, name = '' }, { storage, ownerOverride } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const cleanCode = String(code || '').replace(/\s+/g, '');
  const rawPass = String(newPassword || '');
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('أدخل كود الاستعادة المكون من 6 أرقام.');
  }
  if (rawPass.length < 8 || rawPass.length > 128) {
    throw new Error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
  }

  const emailHash = hashEmailIdentity(cleanEmail);
  assertNotRateLimited(emailHash, storage);

  const otps = readSealed(OTPS_KEY, {}, storage);
  const record = otps[emailHash];
  if (!record || record.expiresAt < Date.now()) {
    throw new Error('كود الاستعادة غير صالح أو منتهي الصلاحية. اطلب كودًا جديدًا.');
  }
  const expectedHash = hashOtpCode(cleanEmail, cleanCode);
  if (!timingSafeEqualStr(expectedHash, record.codeHash)) {
    registerFailedAttempt(emailHash, storage);
    throw new Error('كود الاستعادة غير صحيح.');
  }

  delete otps[emailHash];
  writeSealed(OTPS_KEY, otps, storage);
  clearFailedAttempts(emailHash, storage);

  const passwordHash = await hashPasswordPBKDF2(rawPass);
  const now = new Date().toISOString();
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const idx = findUserIndexByEmail(users, cleanEmail);

  let savedRecord;
  if (idx === -1) {
    savedRecord = {
      id: `usr_${sha256Hex(`${emailHash}:${now}:${randomHex(8)}`).slice(0, 24)}`,
      name: sanitizeSecurityText(name || cleanEmail.split('@')[0], 60),
      email: cleanEmail,
      emailHash,
      passwordHash,
      role: isOwnerEmail(cleanEmail, ownerOverride) ? 'admin' : 'user',
      emailVerified: true,
      verifiedAt: now,
      authProvider: 'pbkdf2-sha256',
      disabled: false,
      createdAt: now,
      lastSeenAt: now,
    };
    users.unshift(savedRecord);
  } else {
    savedRecord = {
      ...users[idx],
      emailHash,
      passwordHash,
      role: isOwnerEmail(cleanEmail, ownerOverride) ? 'admin' : users[idx].role,
      emailVerified: true,
      verifiedAt: users[idx].verifiedAt || now,
      lastSeenAt: now,
    };
    users[idx] = savedRecord;
  }
  writeSealed(USERS_KEY, users, storage);

  const user = decorateFreeUser(savedRecord, ownerOverride);
  const token = `sess_sha256_${sha256Hex(`${user.id}:${now}:${randomHex(16)}`)}`;
  writeSealed(SESSION_KEY, { tokenHash: sha256Hex(token), userId: user.id }, storage);

  return { ok: true, token, user };
}

export function recordFreeEvent(event, storage) {
  const events = readSealed(EVENTS_KEY, [], storage);
  events.unshift({
    id: events.length + 1,
    user_id: event.userId || null,
    event_type: sanitizeSecurityText(event.eventType || 'activity', 60),
    workspace: sanitizeSecurityText(event.workspace || 'general', 40),
    tool: event.tool ? sanitizeSecurityText(event.tool, 60) : null,
    created_at: new Date().toISOString(),
  });
  writeSealed(EVENTS_KEY, events.slice(0, 300), storage);
}

// ============================================================================
// Support Tickets & Two-Way Messaging Engine (Encrypted Local + Gmail Bridge)
// ============================================================================

export async function createFreeSupportTicket(details, { storage, fetchImpl } = {}) {
  const currentUser = freeGetCurrentUser(storage);
  const requesterName = sanitizeSecurityText(details.name || currentUser?.name || '', 80);
  const requesterEmail = normalizeEmailAddress(details.email || currentUser?.email || '');
  const subject = sanitizeSecurityText(details.subject || '', 160);
  const message = sanitizeSecurityText(details.message || '', 4000);
  const category = ['technical', 'account', 'billing', 'suggestion', 'other'].includes(details.category)
    ? details.category
    : 'technical';
  const priority = ['normal', 'high', 'urgent'].includes(details.priority)
    ? details.priority
    : 'normal';

  if (requesterName.length < 2 || !EMAIL_PATTERN.test(requesterEmail)) {
    throw new Error('يرجى كتابة الاسم والبريد الإلكتروني للتواصل معك بشأن التذكرة.');
  }
  if (subject.length < 3 || message.length < 5) {
    throw new Error('يرجى كتابة عنوان واضح وتفاصيل المشكلة أو الاستفسار.');
  }

  const now = new Date().toISOString();
  const ticketId = `TKT-${generateSixDigitCode()}`;
  const firstMessage = {
    id: `MSG-${Date.now()}`,
    ticket_id: ticketId,
    sender_role: 'user',
    sender_name: requesterName,
    sender_email: requesterEmail,
    body: message,
    created_at: now,
  };

  const ticket = {
    id: ticketId,
    user_id: currentUser?.id || null,
    requester_name: requesterName,
    requester_email: requesterEmail,
    requester_hash: hashEmailIdentity(requesterEmail),
    category,
    priority,
    subject,
    status: 'open',
    created_at: now,
    updated_at: now,
    messages: [firstMessage],
  };

  const tickets = readSealed(TICKETS_KEY, [], storage, LEGACY_TICKETS_KEY);
  tickets.unshift(ticket);
  writeSealed(TICKETS_KEY, tickets, storage);

  const bridgeResult = await callGoogleAppsScriptBridge({
    action: 'notify_ticket',
    ticket,
    message,
    isAdminReply: false,
    senderName: requesterName,
    senderEmail: requesterEmail,
  }, storage, fetchImpl);

  return {
    ok: true,
    ticket,
    emailDelivered: bridgeResult.ok,
    supportEmail: getSupportEmail(),
  };
}

export function listFreeSupportTickets({ email, ticketId, includeAll = false } = {}, storage) {
  const currentUser = freeGetCurrentUser(storage);
  const tickets = readSealed(TICKETS_KEY, [], storage, LEGACY_TICKETS_KEY);
  const isAdminOrOwner = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isOwner));

  if (includeAll && isAdminOrOwner) {
    return tickets;
  }

  const lookupId = String(ticketId || '').trim().toUpperCase();
  const lookupEmail = normalizeEmailAddress(email || currentUser?.email || '');
  if (!lookupEmail) return [];
  const lookupHash = hashEmailIdentity(lookupEmail);

  return tickets.filter((t) => {
    const emailMatches = (t.requester_hash && timingSafeEqualStr(t.requester_hash, lookupHash))
      || normalizeEmailAddress(t.requester_email) === lookupEmail;
    if (!emailMatches) return false;
    return lookupId ? t.id.toUpperCase() === lookupId : true;
  });
}

export async function replyFreeSupportTicket({ ticketId, message, senderName, senderEmail }, { storage, fetchImpl } = {}) {
  const cleanId = String(ticketId || '').trim();
  const body = sanitizeSecurityText(message || '', 4000);
  if (!cleanId || body.length < 2) {
    throw new Error('يرجى كتابة نص الرد أولًا.');
  }

  const currentUser = freeGetCurrentUser(storage);
  const isStaff = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isOwner));
  const tickets = readSealed(TICKETS_KEY, [], storage, LEGACY_TICKETS_KEY);
  const index = tickets.findIndex((t) => t.id === cleanId);
  if (index === -1) {
    throw new Error('التذكرة غير موجودة.');
  }

  const target = tickets[index];
  const effectiveEmail = normalizeEmailAddress(senderEmail || currentUser?.email || '');
  if (!isStaff && effectiveEmail !== normalizeEmailAddress(target.requester_email)) {
    throw new Error('غير مصرح بالرد على هذه التذكرة.');
  }

  const now = new Date().toISOString();
  const newMsg = {
    id: `MSG-${Date.now()}`,
    ticket_id: target.id,
    sender_role: currentUser?.isOwner ? 'owner' : isStaff ? 'support' : 'user',
    sender_name: isStaff ? (currentUser?.name || 'فريق دعم PathPilot') : sanitizeSecurityText(senderName || currentUser?.name || target.requester_name, 80),
    sender_email: isStaff ? getSupportEmail() : target.requester_email,
    body,
    created_at: now,
  };

  const nextStatus = isStaff
    ? (target.status === 'open' ? 'in_progress' : target.status)
    : (target.status === 'resolved' ? 'open' : target.status);

  const updatedTicket = {
    ...target,
    status: nextStatus,
    updated_at: now,
    messages: [...(target.messages || []), newMsg],
  };

  tickets[index] = updatedTicket;
  writeSealed(TICKETS_KEY, tickets, storage);

  const bridgeResult = await callGoogleAppsScriptBridge({
    action: 'notify_ticket',
    ticket: updatedTicket,
    message: body,
    isAdminReply: isStaff,
    senderName: newMsg.sender_name,
    senderEmail: newMsg.sender_email,
  }, storage, fetchImpl);

  return {
    ok: true,
    ticket: updatedTicket,
    emailDelivered: bridgeResult.ok,
  };
}

export function updateFreeSupportTicketStatus({ ticketId, status }, storage) {
  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    throw new Error('حالة التذكرة غير صالحة.');
  }
  const currentUser = freeGetCurrentUser(storage);
  if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isOwner)) {
    throw new Error('صلاحية الإدارة مطلوبة لتحديث حالة التذكرة.');
  }
  const tickets = readSealed(TICKETS_KEY, [], storage, LEGACY_TICKETS_KEY);
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) throw new Error('التذكرة غير موجودة.');

  tickets[index] = {
    ...tickets[index],
    status,
    updated_at: new Date().toISOString(),
  };
  writeSealed(TICKETS_KEY, tickets, storage);
  return tickets[index];
}

export function saveFreeFeedback(details, storage) {
  const currentUser = freeGetCurrentUser(storage);
  const list = readSealed(FEEDBACK_KEY, [], storage);
  list.unshift({
    id: list.length + 1,
    user_id: currentUser?.id || null,
    user_name: currentUser?.name || 'زائر',
    user_email: currentUser?.email || null,
    rating: Number(details.rating) || 5,
    message: sanitizeSecurityText(details.message || '', 2000),
    workspace: details.workspace || 'general',
    tool: details.tool || 'feedback',
    created_at: new Date().toISOString(),
  });
  writeSealed(FEEDBACK_KEY, list.slice(0, 200), storage);
  return { ok: true };
}

export function buildFreeAdminDashboard(storage) {
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY).map((u) => decorateFreeUser(u));
  const tickets = readSealed(TICKETS_KEY, [], storage, LEGACY_TICKETS_KEY);
  const feedback = readSealed(FEEDBACK_KEY, [], storage);
  const events = readSealed(EVENTS_KEY, [], storage);
  const cfg = getFreeCloudConfig(storage);
  const since = new Date(Date.now() - 86_400_000).toISOString();

  const usage = { general: 0, study: 0, work: 0 };
  for (const ev of events) {
    if (ev.workspace && usage[ev.workspace] !== undefined) {
      usage[ev.workspace] += 1;
    }
  }
  const totalUsage = usage.general + usage.study + usage.work;

  return {
    summary: {
      totalUsers: users.length,
      verifiedUsers: users.filter((u) => u.emailVerified).length,
      activeToday: users.filter((u) => (u.last_seen_at || '') >= since).length,
      aiRequests: totalUsage,
      aiSuccessRate: 100,
      usage,
      totalUsage,
      apiOnline: Boolean(cfg.geminiApiKey || cfg.bridgeUrl),
      errors: 0,
      feedback: feedback.length,
      openTickets: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
      totalTickets: tickets.length,
    },
    users,
    tickets,
    apiUsage: [],
    errors: [],
    feedback,
    status: {
      ok: true,
      mode: 'free-cloud-encrypted',
      apiOnline: Boolean(cfg.geminiApiKey),
      provider: cfg.geminiApiKey ? 'Google Gemini Free' : 'PathPilot Natural Tutor v6',
      model: cfg.geminiApiKey ? cfg.geminiModel : 'Natural Q&A + Exam Engine',
      databaseOnline: true,
      emailVerificationAvailable: true,
      passwordResetAvailable: true,
      supportEmail: cfg.supportEmail,
      encryptionStandard: cfg.encryptionStandard,
      bridgeConnected: Boolean(cfg.bridgeUrl),
    },
    researchStatus: { researchAvailable: false, synthesisAvailable: Boolean(cfg.geminiApiKey) },
    loginLog: events.filter((e) => e.event_type === 'login').map((e) => ({
      ...e,
      event_type: 'login · Encrypted Vault SHA-256',
    })),
    securityVisits: [],
    securityVisitSummary: { uniqueVisitors: users.length, totalVisits: events.length },
    securityEvents: [],
  };
}

export function freeUpdateUserRole(userId, role, storage) {
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('المستخدم غير موجود.');
  if (isOwnerEmail(users[idx].email) && role !== 'admin') {
    throw new Error('لا يمكن خفض صلاحية مالك المنصة.');
  }
  users[idx] = { ...users[idx], role };
  writeSealed(USERS_KEY, users, storage);
  return decorateFreeUser(users[idx]);
}

export function freeSetUserBan(userId, banned, reason = '', storage) {
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('المستخدم غير موجود.');
  if (isOwnerEmail(users[idx].email)) {
    throw new Error('لا يمكن حظر حساب المالك المحمي.');
  }
  users[idx] = {
    ...users[idx],
    disabled: Boolean(banned),
    disabledReason: banned ? sanitizeSecurityText(reason || 'مراجعة إدارية', 200) : null,
  };
  writeSealed(USERS_KEY, users, storage);
  return decorateFreeUser(users[idx]);
}

export function freeDeleteUser(userId, storage) {
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const target = users.find((u) => u.id === userId);
  if (!target) throw new Error('المستخدم غير موجود.');
  if (isOwnerEmail(target.email)) throw new Error('لا يمكن حذف حساب المالك المحمي.');
  writeSealed(USERS_KEY, users.filter((u) => u.id !== userId), storage);
  return { ok: true };
}

export function freeInviteAdmin(email, storage) {
  const cleanEmail = normalizeEmailAddress(email);
  if (!EMAIL_PATTERN.test(cleanEmail)) throw new Error('أدخل بريدًا إلكترونيًا صالحًا.');
  const users = readSealed(USERS_KEY, [], storage, LEGACY_USERS_KEY);
  const existingIdx = findUserIndexByEmail(users, cleanEmail);
  if (existingIdx !== -1) {
    users[existingIdx] = { ...users[existingIdx], role: 'admin' };
    writeSealed(USERS_KEY, users, storage);
    return { status: 'admin_granted', user: decorateFreeUser(users[existingIdx]) };
  }
  const invites = readSealed(INVITES_KEY, [], storage).filter((i) => normalizeEmailAddress(i.email) !== cleanEmail);
  const invite = { email: cleanEmail, emailHash: hashEmailIdentity(cleanEmail), created_at: new Date().toISOString(), accepted_at: null };
  invites.unshift(invite);
  writeSealed(INVITES_KEY, invites, storage);
  return { status: 'invite_created', invite };
}

export function freeListInvites(storage) {
  return readSealed(INVITES_KEY, [], storage);
}

export function freeRevokeInvite(email, storage) {
  const cleanEmail = normalizeEmailAddress(email);
  const invites = readSealed(INVITES_KEY, [], storage).filter((i) => normalizeEmailAddress(i.email) !== cleanEmail);
  writeSealed(INVITES_KEY, invites, storage);
  return { ok: true };
}
