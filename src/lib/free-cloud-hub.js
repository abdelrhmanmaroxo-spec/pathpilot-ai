export const DEFAULT_OWNER_EMAIL = 'Abdelrhman.maroxo@gmail.com';
export const DEFAULT_SUPPORT_EMAIL = 'pathpilot.app00@gmail.com';

const USERS_KEY = 'pathpilot.free_cloud.users.v1';
const SESSION_KEY = 'pathpilot.free_cloud.session.v1';
const OTPS_KEY = 'pathpilot.free_cloud.otps.v1';
const TICKETS_KEY = 'pathpilot.free_cloud.tickets.v1';
const INVITES_KEY = 'pathpilot.free_cloud.invites.v1';
const FEEDBACK_KEY = 'pathpilot.free_cloud.feedback.v1';
const EVENTS_KEY = 'pathpilot.free_cloud.events.v1';
const CLOUD_CONFIG_KEY = 'pathpilot.free_cloud.config.v1';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function getStore(customStorage) {
  if (customStorage) return customStorage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readCollection(key, fallback, customStorage) {
  const store = getStore(customStorage);
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCollection(key, value, customStorage) {
  const store = getStore(customStorage);
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function normalizeEmailAddress(email) {
  return String(email || '').trim().toLowerCase();
}

export function getOwnerEmail() {
  const envOwner = import.meta.env?.VITE_OWNER_EMAIL;
  return normalizeEmailAddress(envOwner || DEFAULT_OWNER_EMAIL);
}

export function getSupportEmail() {
  const envSupport = import.meta.env?.VITE_SUPPORT_EMAIL;
  return String(envSupport || DEFAULT_SUPPORT_EMAIL).trim();
}

export function isOwnerEmail(email) {
  return Boolean(email && normalizeEmailAddress(email) === getOwnerEmail());
}

export function getFreeCloudConfig(customStorage) {
  const stored = readCollection(CLOUD_CONFIG_KEY, {}, customStorage);
  const envBridgeUrl = String(import.meta.env?.VITE_FREE_CLOUD_URL || '').trim();
  return {
    bridgeUrl: String(stored.bridgeUrl ?? envBridgeUrl).trim(),
    geminiApiKey: String(stored.geminiApiKey || '').trim(),
    geminiModel: String(stored.geminiModel || 'gemini-2.5-flash').trim(),
    ownerEmail: DEFAULT_OWNER_EMAIL,
    supportEmail: getSupportEmail(),
  };
}

export function saveFreeCloudConfig(patch = {}, customStorage) {
  const current = readCollection(CLOUD_CONFIG_KEY, {}, customStorage);
  const next = {
    ...current,
    ...(patch.bridgeUrl !== undefined ? { bridgeUrl: String(patch.bridgeUrl || '').trim() } : {}),
    ...(patch.geminiApiKey !== undefined ? { geminiApiKey: String(patch.geminiApiKey || '').trim() } : {}),
    ...(patch.geminiModel !== undefined ? { geminiModel: String(patch.geminiModel || 'gemini-2.5-flash').trim() } : {}),
    updatedAt: new Date().toISOString(),
  };
  writeCollection(CLOUD_CONFIG_KEY, next, customStorage);
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

export async function hashSecret(text) {
  const raw = String(text || '');
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(`pathpilot-v5:${raw}`);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a:${(h >>> 0).toString(16)}`;
}

async function callGoogleAppsScriptBridge(payload, customStorage, fetchImpl = globalThis.fetch) {
  const { bridgeUrl } = getFreeCloudConfig(customStorage);
  if (!bridgeUrl || typeof fetchImpl !== 'function') {
    return { attempted: false, ok: false, reason: 'BRIDGE_NOT_CONFIGURED' };
  }
  try {
    // text/plain avoids CORS preflight rejection on script.google.com Web Apps
    const response = await fetchImpl(bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { attempted: true, ok: Boolean(response.ok && data.ok !== false), data };
  } catch (err) {
    return { attempted: true, ok: false, reason: err?.message || 'BRIDGE_NETWORK_ERROR' };
  }
}

export async function testFreeCloudBridge(customStorage, fetchImpl) {
  return callGoogleAppsScriptBridge({ action: 'ping' }, customStorage, fetchImpl);
}

function decorateFreeUser(record) {
  if (!record) return null;
  const owner = isOwnerEmail(record.email);
  const role = owner ? 'admin' : (record.role || 'user');
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role,
    isOwner: owner,
    disabled: Boolean(record.disabled),
    email_verified: record.emailVerified ? 1 : 0,
    emailVerified: Boolean(record.emailVerified),
    verified_at: record.verifiedAt || null,
    auth_provider: record.authProvider || 'password',
    created_at: record.createdAt,
    last_seen_at: record.lastSeenAt || record.createdAt,
  };
}

export async function freeRegisterAccount({ name, email, password }, { storage, fetchImpl } = {}) {
  const cleanName = String(name || '').trim().slice(0, 60);
  const cleanEmail = normalizeEmailAddress(email);
  const rawPassword = String(password || '');

  if (cleanName.length < 2 || !EMAIL_PATTERN.test(cleanEmail)) {
    throw new Error('يرجى إدخال اسم صحيح وبريد إلكتروني صالح.');
  }
  if (rawPassword.length < 8 || rawPassword.length > 128) {
    throw new Error('كلمة المرور يجب أن تكون بين 8 و128 حرفًا.');
  }

  const users = readCollection(USERS_KEY, [], storage);
  const existing = users.find((u) => normalizeEmailAddress(u.email) === cleanEmail);
  if (existing) {
    const err = new Error(
      existing.emailVerified
        ? 'يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني. يمكنك تسجيل الدخول مباشرة.'
        : 'هذا البريد بانتظار كود التفعيل. أدخل الكود أو اضغط إعادة إرسال الكود.',
    );
    err.code = existing.emailVerified ? 'ACCOUNT_EXISTS' : 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  const invites = readCollection(INVITES_KEY, [], storage);
  const invited = invites.find((inv) => normalizeEmailAddress(inv.email) === cleanEmail && !inv.accepted_at);
  const now = new Date().toISOString();
  const passwordHash = await hashSecret(rawPassword);
  const newUser = {
    id: globalThis.crypto?.randomUUID?.() || `usr-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: isOwnerEmail(cleanEmail) || invited ? 'admin' : 'user',
    emailVerified: false,
    verifiedAt: null,
    authProvider: 'password',
    disabled: false,
    createdAt: now,
    lastSeenAt: now,
  };

  users.unshift(newUser);
  writeCollection(USERS_KEY, users, storage);

  return issueFreeOtpForUser(newUser, 'verify', { storage, fetchImpl });
}

export async function issueFreeOtpForUser(userRecord, purpose = 'verify', { storage, fetchImpl } = {}) {
  const code = generateSixDigitCode();
  const codeHash = await hashSecret(`${normalizeEmailAddress(userRecord.email)}:${code}`);
  const otps = readCollection(OTPS_KEY, {}, storage);
  otps[normalizeEmailAddress(userRecord.email)] = {
    codeHash,
    purpose,
    expiresAt: Date.now() + 30 * 60 * 1000,
    createdAt: new Date().toISOString(),
  };
  writeCollection(OTPS_KEY, otps, storage);

  const bridgeResult = await callGoogleAppsScriptBridge({
    action: 'send_otp',
    email: userRecord.email,
    name: userRecord.name,
    code,
    purpose,
  }, storage, fetchImpl);

  return {
    requiresVerification: true,
    email: userRecord.email,
    deliveryPending: !bridgeResult.ok,
    deliveryMode: bridgeResult.ok ? 'gmail-apps-script' : 'local-instant-otp',
    // If the user hasn't connected the Google Apps Script bridge URL yet, return instantOtpHint
    // so signup & testing never deadlock before configuring script.google.com!
    instantOtpCode: bridgeResult.ok ? undefined : code,
    supportSender: getSupportEmail(),
  };
}

export async function freeResendVerification(email, { storage, fetchImpl } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const users = readCollection(USERS_KEY, [], storage);
  const userRecord = users.find((u) => normalizeEmailAddress(u.email) === cleanEmail);
  if (!userRecord) {
    throw new Error('لا يوجد حساب مسجل بهذا البريد الإلكتروني.');
  }
  if (userRecord.emailVerified) {
    return { ok: true, alreadyVerified: true, deliveryPending: false };
  }
  return issueFreeOtpForUser(userRecord, 'verify', { storage, fetchImpl });
}

export async function freeVerifyEmailCode({ email, code }, { storage } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const cleanCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('أدخل كود التفعيل المكون من 6 أرقام.');
  }

  const otps = readCollection(OTPS_KEY, {}, storage);
  const record = otps[cleanEmail];
  if (!record || record.expiresAt < Date.now()) {
    throw new Error('كود التفعيل غير صالح أو انتهت صلاحيته. اطلب كودًا جديدًا.');
  }

  const expectedHash = await hashSecret(`${cleanEmail}:${cleanCode}`);
  if (expectedHash !== record.codeHash) {
    throw new Error('كود التفعيل غير صحيح. تأكد من الأرقام الستة.');
  }

  delete otps[cleanEmail];
  writeCollection(OTPS_KEY, otps, storage);

  const users = readCollection(USERS_KEY, [], storage);
  const index = users.findIndex((u) => normalizeEmailAddress(u.email) === cleanEmail);
  if (index === -1) {
    throw new Error('الحساب غير موجود.');
  }

  const now = new Date().toISOString();
  users[index] = {
    ...users[index],
    emailVerified: true,
    verifiedAt: now,
    lastSeenAt: now,
    role: isOwnerEmail(cleanEmail) ? 'admin' : users[index].role,
  };
  writeCollection(USERS_KEY, users, storage);

  const invites = readCollection(INVITES_KEY, [], storage);
  const updatedInvites = invites.map((inv) => (
    normalizeEmailAddress(inv.email) === cleanEmail ? { ...inv, accepted_at: now } : inv
  ));
  writeCollection(INVITES_KEY, updatedInvites, storage);

  const decorated = decorateFreeUser(users[index]);
  const token = `free-sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  writeCollection(SESSION_KEY, { token, userId: decorated.id, email: decorated.email }, storage);

  return { ok: true, token, user: decorated };
}

export async function freeLoginAccount({ email, password }, { storage } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const passwordHash = await hashSecret(String(password || ''));
  const users = readCollection(USERS_KEY, [], storage);
  const index = users.findIndex((u) => normalizeEmailAddress(u.email) === cleanEmail);

  if (index === -1 || users[index].passwordHash !== passwordHash) {
    throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  }
  if (users[index].disabled) {
    throw new Error('تم إيقاف هذا الحساب من قبل الإدارة.');
  }
  if (!users[index].emailVerified) {
    const err = new Error('يرجى تفعيل بريدك الإلكتروني بالكود المرسل أولًا.');
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  users[index] = {
    ...users[index],
    role: isOwnerEmail(cleanEmail) ? 'admin' : users[index].role,
    lastSeenAt: new Date().toISOString(),
  };
  writeCollection(USERS_KEY, users, storage);

  const user = decorateFreeUser(users[index]);
  const token = `free-sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  writeCollection(SESSION_KEY, { token, userId: user.id, email: user.email }, storage);
  recordFreeEvent({ userId: user.id, eventType: 'login' }, storage);

  return { token, user };
}

export function freeGetCurrentUser(storage) {
  const session = readCollection(SESSION_KEY, null, storage);
  if (!session?.userId) return null;
  const users = readCollection(USERS_KEY, [], storage);
  const found = users.find((u) => u.id === session.userId);
  if (!found || found.disabled) return null;
  return decorateFreeUser(found);
}

export function freeLogout(storage) {
  const store = getStore(storage);
  store?.removeItem(SESSION_KEY);
}

export async function freeRequestPasswordReset(email, { storage, fetchImpl } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const users = readCollection(USERS_KEY, [], storage);
  const userRecord = users.find((u) => normalizeEmailAddress(u.email) === cleanEmail && !u.disabled);
  if (!userRecord) {
    return { ok: true, deliveryPending: false };
  }
  const otpInfo = await issueFreeOtpForUser(userRecord, 'reset', { storage, fetchImpl });
  return {
    ok: true,
    requiresResetCode: true,
    email: cleanEmail,
    deliveryPending: otpInfo.deliveryPending,
    instantOtpCode: otpInfo.instantOtpCode,
  };
}

export async function freeResetPasswordWithCode({ email, code, newPassword }, { storage } = {}) {
  const cleanEmail = normalizeEmailAddress(email);
  const cleanCode = String(code || '').replace(/\s+/g, '');
  const rawPass = String(newPassword || '');
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('أدخل كود الاستعادة المكون من 6 أرقام.');
  }
  if (rawPass.length < 8 || rawPass.length > 128) {
    throw new Error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
  }

  const otps = readCollection(OTPS_KEY, {}, storage);
  const record = otps[cleanEmail];
  if (!record || record.expiresAt < Date.now()) {
    throw new Error('كود الاستعادة غير صالح أو منتهي الصلاحية.');
  }
  const expectedHash = await hashSecret(`${cleanEmail}:${cleanCode}`);
  if (expectedHash !== record.codeHash) {
    throw new Error('كود الاستعادة غير صحيح.');
  }

  delete otps[cleanEmail];
  writeCollection(OTPS_KEY, otps, storage);

  const users = readCollection(USERS_KEY, [], storage);
  const idx = users.findIndex((u) => normalizeEmailAddress(u.email) === cleanEmail);
  if (idx === -1) throw new Error('الحساب غير موجود.');
  users[idx] = {
    ...users[idx],
    passwordHash: await hashSecret(rawPass),
    emailVerified: true,
    verifiedAt: users[idx].verifiedAt || new Date().toISOString(),
  };
  writeCollection(USERS_KEY, users, storage);
  return { ok: true };
}

export function recordFreeEvent(event, storage) {
  const events = readCollection(EVENTS_KEY, [], storage);
  events.unshift({
    id: events.length + 1,
    user_id: event.userId || null,
    event_type: event.eventType || 'activity',
    workspace: event.workspace || 'general',
    tool: event.tool || null,
    created_at: new Date().toISOString(),
  });
  writeCollection(EVENTS_KEY, events.slice(0, 300), storage);
}

// ============================================================================
// Support Tickets & Two-Way Messaging Engine (Users <-> Owner Support)
// ============================================================================

export async function createFreeSupportTicket(details, { storage, fetchImpl } = {}) {
  const currentUser = freeGetCurrentUser(storage);
  const requesterName = String(details.name || currentUser?.name || '').trim().slice(0, 80);
  const requesterEmail = normalizeEmailAddress(details.email || currentUser?.email || '');
  const subject = String(details.subject || '').trim().slice(0, 160);
  const message = String(details.message || '').trim().slice(0, 4000);
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
    category,
    priority,
    subject,
    status: 'open',
    created_at: now,
    updated_at: now,
    messages: [firstMessage],
  };

  const tickets = readCollection(TICKETS_KEY, [], storage);
  tickets.unshift(ticket);
  writeCollection(TICKETS_KEY, tickets, storage);

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
    ownerEmail: DEFAULT_OWNER_EMAIL,
  };
}

export function listFreeSupportTickets({ email, ticketId, includeAll = false } = {}, storage) {
  const currentUser = freeGetCurrentUser(storage);
  const tickets = readCollection(TICKETS_KEY, [], storage);
  const isAdminOrOwner = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isOwner));

  if (includeAll && isAdminOrOwner) {
    return tickets;
  }

  const lookupId = String(ticketId || '').trim().toUpperCase();
  const lookupEmail = normalizeEmailAddress(email || currentUser?.email || '');
  if (!lookupEmail) return [];

  return tickets.filter((t) => {
    const emailMatches = normalizeEmailAddress(t.requester_email) === lookupEmail;
    if (!emailMatches) return false;
    return lookupId ? t.id.toUpperCase() === lookupId : true;
  });
}

export async function replyFreeSupportTicket({ ticketId, message, senderName, senderEmail }, { storage, fetchImpl } = {}) {
  const cleanId = String(ticketId || '').trim();
  const body = String(message || '').trim().slice(0, 4000);
  if (!cleanId || body.length < 2) {
    throw new Error('يرجى كتابة نص الرد أولًا.');
  }

  const currentUser = freeGetCurrentUser(storage);
  const isStaff = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.isOwner));
  const tickets = readCollection(TICKETS_KEY, [], storage);
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
    sender_name: isStaff ? (currentUser?.name || 'فريق دعم PathPilot') : (senderName || currentUser?.name || target.requester_name),
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
  writeCollection(TICKETS_KEY, tickets, storage);

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
  const tickets = readCollection(TICKETS_KEY, [], storage);
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) throw new Error('التذكرة غير موجودة.');

  tickets[index] = {
    ...tickets[index],
    status,
    updated_at: new Date().toISOString(),
  };
  writeCollection(TICKETS_KEY, tickets, storage);
  return tickets[index];
}

export function saveFreeFeedback(details, storage) {
  const currentUser = freeGetCurrentUser(storage);
  const list = readCollection(FEEDBACK_KEY, [], storage);
  list.unshift({
    id: list.length + 1,
    user_id: currentUser?.id || null,
    user_name: currentUser?.name || 'زائر',
    user_email: currentUser?.email || null,
    rating: Number(details.rating) || 5,
    message: String(details.message || '').slice(0, 2000),
    workspace: details.workspace || 'general',
    tool: details.tool || 'feedback',
    created_at: new Date().toISOString(),
  });
  writeCollection(FEEDBACK_KEY, list.slice(0, 200), storage);
  return { ok: true };
}

export function buildFreeAdminDashboard(storage) {
  const users = readCollection(USERS_KEY, [], storage).map(decorateFreeUser);
  const tickets = readCollection(TICKETS_KEY, [], storage);
  const feedback = readCollection(FEEDBACK_KEY, [], storage);
  const events = readCollection(EVENTS_KEY, [], storage);
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
      mode: 'free-cloud',
      apiOnline: Boolean(cfg.geminiApiKey),
      provider: cfg.geminiApiKey ? 'Google Gemini Free' : 'Smart Local Engine',
      model: cfg.geminiApiKey ? cfg.geminiModel : 'PathPilot Local v5',
      databaseOnline: true,
      emailVerificationAvailable: true,
      passwordResetAvailable: true,
      supportEmail: cfg.supportEmail,
      ownerEmail: cfg.ownerEmail,
      bridgeConnected: Boolean(cfg.bridgeUrl),
    },
    researchStatus: { researchAvailable: false, synthesisAvailable: Boolean(cfg.geminiApiKey) },
    loginLog: events.filter((e) => e.event_type === 'login').map((e) => ({
      ...e,
      event_type: 'login · Free Cloud Hub',
    })),
    securityVisits: [],
    securityVisitSummary: { uniqueVisitors: users.length, totalVisits: events.length },
    securityEvents: [],
  };
}

export function freeUpdateUserRole(userId, role, storage) {
  const users = readCollection(USERS_KEY, [], storage);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('المستخدم غير موجود.');
  if (isOwnerEmail(users[idx].email) && role !== 'admin') {
    throw new Error('لا يمكن خفض صلاحية مالك المنصة.');
  }
  users[idx] = { ...users[idx], role };
  writeCollection(USERS_KEY, users, storage);
  return decorateFreeUser(users[idx]);
}

export function freeSetUserBan(userId, banned, reason = '', storage) {
  const users = readCollection(USERS_KEY, [], storage);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error('المستخدم غير موجود.');
  if (isOwnerEmail(users[idx].email)) {
    throw new Error('لا يمكن حظر حساب المالك المحمي.');
  }
  users[idx] = {
    ...users[idx],
    disabled: Boolean(banned),
    disabledReason: banned ? String(reason || 'مراجعة إدارية') : null,
  };
  writeCollection(USERS_KEY, users, storage);
  return decorateFreeUser(users[idx]);
}

export function freeDeleteUser(userId, storage) {
  const users = readCollection(USERS_KEY, [], storage);
  const target = users.find((u) => u.id === userId);
  if (!target) throw new Error('المستخدم غير موجود.');
  if (isOwnerEmail(target.email)) throw new Error('لا يمكن حذف حساب المالك المحمي.');
  writeCollection(USERS_KEY, users.filter((u) => u.id !== userId), storage);
  return { ok: true };
}

export function freeInviteAdmin(email, storage) {
  const cleanEmail = normalizeEmailAddress(email);
  if (!EMAIL_PATTERN.test(cleanEmail)) throw new Error('أدخل بريدًا إلكترونيًا صالحًا.');
  const users = readCollection(USERS_KEY, [], storage);
  const existingIdx = users.findIndex((u) => normalizeEmailAddress(u.email) === cleanEmail);
  if (existingIdx !== -1) {
    users[existingIdx] = { ...users[existingIdx], role: 'admin' };
    writeCollection(USERS_KEY, users, storage);
    return { status: 'admin_granted', user: decorateFreeUser(users[existingIdx]) };
  }
  const invites = readCollection(INVITES_KEY, [], storage).filter((i) => normalizeEmailAddress(i.email) !== cleanEmail);
  const invite = { email: cleanEmail, created_at: new Date().toISOString(), accepted_at: null };
  invites.unshift(invite);
  writeCollection(INVITES_KEY, invites, storage);
  return { status: 'invite_created', invite };
}

export function freeListInvites(storage) {
  return readCollection(INVITES_KEY, [], storage);
}

export function freeRevokeInvite(email, storage) {
  const cleanEmail = normalizeEmailAddress(email);
  const invites = readCollection(INVITES_KEY, [], storage).filter((i) => normalizeEmailAddress(i.email) !== cleanEmail);
  writeCollection(INVITES_KEY, invites, storage);
  return { ok: true };
}
