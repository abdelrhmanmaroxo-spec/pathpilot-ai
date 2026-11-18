import { createApiClient } from './api-client.js';
import {
  OWNER_IDENTITY_SHA256,
  shortIdentityFingerprint,
  DEFAULT_SUPPORT_EMAIL,
  buildFreeAdminDashboard,
  createFreeSupportTicket,
  freeDeleteUser,
  freeGetCurrentUser,
  freeInviteAdmin,
  freeListInvites,
  freeLoginAccount,
  freeLogout,
  freeRegisterAccount,
  freeRequestPasswordReset,
  freeResendVerification,
  freeResetPasswordWithCode,
  freeRevokeInvite,
  freeSetUserBan,
  freeUpdateUserRole,
  freeVerifyEmailCode,
  getFreeCloudConfig,
  getSupportEmail,
  listFreeSupportTickets,
  recordFreeEvent,
  replyFreeSupportTicket,
  saveFreeCloudConfig,
  saveFreeFeedback,
  testFreeCloudBridge,
  updateFreeSupportTicketStatus,
} from './free-cloud-hub.js';

const explicitBase = import.meta.env?.VITE_PLATFORM_API_URL?.trim();
const aiUrl = import.meta.env?.VITE_AI_API_URL?.trim();
export const PLATFORM_API_URL = explicitBase || aiUrl?.replace(/\/api\/(?:assistant|research)\/?$/, '') || '';
export const hasRemoteBackend = Boolean(PLATFORM_API_URL);
// Free Cloud Hub keeps accounts, OTP verification, Support Tickets, and Owner Admin live even with zero paid servers!
export const hasPlatformBackend = true;

export {
  OWNER_IDENTITY_SHA256,
  shortIdentityFingerprint,
  DEFAULT_SUPPORT_EMAIL,
  getFreeCloudConfig,
  getSupportEmail,
  saveFreeCloudConfig,
  testFreeCloudBridge,
};

const TOKEN_KEY = 'pathpilot.session.v1';
const ANONYMOUS_KEY = 'pathpilot.anonymous.v1';
const VISIT_REPORTED_KEY = 'pathpilot.security_visit.v1';
const VISIT_REPORT_INTERVAL_MS = 30 * 60 * 1000;

function storage() {
  return globalThis.localStorage;
}

export function getSessionToken() {
  return storage()?.getItem(TOKEN_KEY) || '';
}

function setSessionToken(token) {
  if (token) storage()?.setItem(TOKEN_KEY, token);
  else storage()?.removeItem(TOKEN_KEY);
}

function anonymousId() {
  let value = storage()?.getItem(ANONYMOUS_KEY);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage()?.setItem(ANONYMOUS_KEY, value);
  }
  return value;
}

const apiClient = createApiClient({
  baseUrl: PLATFORM_API_URL,
  getToken: getSessionToken,
  timeoutMs: 25_000,
});

async function request(path, options = {}) {
  return apiClient.request(path, options);
}

function loginDeviceDetails() {
  const navigatorInfo = globalThis.navigator;
  const screenInfo = globalThis.screen;
  let timezone;
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { timezone = ''; }
  return {
    userAgent: navigatorInfo?.userAgent || '',
    platform: navigatorInfo?.userAgentData?.platform || navigatorInfo?.platform || '',
    language: navigatorInfo?.language || '',
    timezone,
    screen: screenInfo ? `${screenInfo.width}x${screenInfo.height}` : '',
  };
}

function visitDetails() {
  const locationInfo = globalThis.location;
  let referrerHost;
  try { referrerHost = globalThis.document?.referrer ? new URL(globalThis.document.referrer).hostname : ''; } catch { referrerHost = ''; }
  const route = String(locationInfo?.hash || '').replace(/[^a-z0-9/_-]/gi, '').slice(0, 80);
  return {
    ...loginDeviceDetails(),
    visitorId: anonymousId(),
    path: `${locationInfo?.pathname || '/'}${route}`.slice(0, 160),
    referrerHost,
  };
}

function visitMarker() {
  try { return JSON.parse(globalThis.sessionStorage?.getItem(VISIT_REPORTED_KEY) || 'null'); } catch { return null; }
}

function setVisitMarker(value) {
  try { globalThis.sessionStorage?.setItem(VISIT_REPORTED_KEY, JSON.stringify(value)); } catch { /* storage can be unavailable */ }
}

async function reportLoginDevice() {
  if (!hasRemoteBackend) return undefined;
  return request('/api/security/login-device', {
    method: 'POST',
    body: JSON.stringify(loginDeviceDetails()),
  });
}

export async function reportSecurityVisit({ force = false } = {}) {
  if (!hasRemoteBackend) return undefined;
  const identity = getSessionToken() ? 'signed-in' : 'guest';
  const marker = visitMarker();
  if (!force && marker?.identity === identity && Date.now() - Number(marker.recordedAt || 0) < VISIT_REPORT_INTERVAL_MS) return undefined;
  const payload = await request('/api/security/visit', {
    method: 'POST',
    body: JSON.stringify(visitDetails()),
  });
  setVisitMarker({ identity, recordedAt: Date.now() });
  return payload;
}

export async function registerAccount(details) {
  if (!hasRemoteBackend) {
    return freeRegisterAccount(details);
  }
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(details) });
}

export async function verifyAccountEmailCode({ email, code }) {
  if (!hasRemoteBackend) {
    const result = await freeVerifyEmailCode({ email, code });
    if (result.token) setSessionToken(result.token);
    return result;
  }
  const payload = await request('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  if (payload.token) {
    setSessionToken(payload.token);
    await Promise.all([
      reportLoginDevice().catch(() => undefined),
      reportSecurityVisit({ force: true }).catch(() => undefined),
    ]);
  }
  return payload;
}

export async function resendVerification(email) {
  if (!hasRemoteBackend) {
    return freeResendVerification(email);
  }
  return request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function requestPasswordReset(email) {
  if (!hasRemoteBackend) {
    return freeRequestPasswordReset(email);
  }
  return request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPasswordWithOtpCode({ email, code, newPassword }) {
  if (!hasRemoteBackend) {
    const result = await freeResetPasswordWithCode({ email, code, newPassword });
    if (result.token) setSessionToken(result.token);
    return result;
  }
  return request('/api/auth/reset-password-code', {
    method: 'POST',
    body: JSON.stringify({ email, code, password: newPassword }),
  });
}

export async function loginAccount(details) {
  if (!hasRemoteBackend) {
    const result = await freeLoginAccount(details);
    setSessionToken(result.token);
    return result.user;
  }
  const payload = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(details) });
  setSessionToken(payload.token);
  await Promise.all([
    reportLoginDevice().catch(() => undefined),
    reportSecurityVisit({ force: true }).catch(() => undefined),
  ]);
  return payload.user;
}

export async function loginWithGoogleCredential(credential) {
  if (!hasRemoteBackend) {
    throw new Error('تسجيل الدخول السريع عبر Google يتطلب إعداد GOOGLE_CLIENT_ID. يمكنك التسجيل بالبريد الإلكتروني وكود التفعيل مجانًا.');
  }
  const payload = await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
  setSessionToken(payload.token);
  await Promise.all([
    reportLoginDevice().catch(() => undefined),
    reportSecurityVisit({ force: true }).catch(() => undefined),
  ]);
  return payload.user;
}

export async function getPlatformStatus() {
  if (!hasRemoteBackend) {
    const cfg = getFreeCloudConfig();
    return {
      ok: true,
      mode: 'free-cloud',
      apiOnline: Boolean(cfg.geminiApiKey),
      provider: cfg.geminiApiKey ? 'Google Gemini Free' : 'Smart Local Engine',
      model: cfg.geminiApiKey ? cfg.geminiModel : null,
      databaseOnline: true,
      googleAuthAvailable: false,
      googleClientId: null,
      emailVerificationAvailable: true,
      passwordResetAvailable: true,
      otpVerificationAvailable: true,
      supportTicketsAvailable: true,
      supportEmail: cfg.supportEmail,
      encryptionStandard: cfg.encryptionStandard,
      bridgeConnected: Boolean(cfg.bridgeUrl),
    };
  }
  return request('/api/status');
}

export async function getSystemStatus() {
  if (!hasRemoteBackend) {
    return { paused: false, reason: '', updatedAt: null };
  }
  return request('/api/system/status');
}

export async function getResearchStatus() {
  if (!hasRemoteBackend) {
    const cfg = getFreeCloudConfig();
    return { researchAvailable: false, synthesisAvailable: Boolean(cfg.geminiApiKey), fallbackAvailable: true };
  }
  return request('/api/research/status');
}

export async function logoutAccount() {
  if (!hasRemoteBackend) {
    freeLogout();
    setSessionToken('');
    return;
  }
  try { await request('/api/auth/logout', { method: 'POST' }); } finally { setSessionToken(''); }
}

export async function getCurrentUser() {
  if (!hasRemoteBackend) {
    return freeGetCurrentUser();
  }
  if (!getSessionToken()) return null;
  try {
    const payload = await request('/api/auth/me');
    return payload.user;
  } catch {
    setSessionToken('');
    return null;
  }
}

export function trackUsage({ eventType, workspace, tool, metadata }) {
  if (!hasRemoteBackend) {
    recordFreeEvent({ eventType, workspace, tool, metadata });
    return Promise.resolve();
  }
  return request('/api/events', {
    method: 'POST',
    body: JSON.stringify({ anonymousId: anonymousId(), eventType, workspace, tool, metadata }),
  }).catch(() => undefined);
}

export function sendFeedback(details) {
  if (!hasRemoteBackend) {
    return Promise.resolve(saveFreeFeedback(details));
  }
  return request('/api/feedback', { method: 'POST', body: JSON.stringify(details) });
}

export function reportClientError(error, context = '') {
  if (!hasRemoteBackend) return Promise.resolve();
  return request('/api/client-errors', {
    method: 'POST',
    body: JSON.stringify({
      message: error?.message || String(error),
      context,
      code: error?.code || '',
      requestId: error?.requestId || '',
    }),
  }).catch(() => undefined);
}

// Support Ticket & Two-Way Messaging APIs
export async function createSupportTicket(details) {
  if (!hasRemoteBackend) {
    return createFreeSupportTicket(details);
  }
  return request('/api/support/tickets', { method: 'POST', body: JSON.stringify(details) });
}

export async function listSupportTickets({ email = '', ticketId = '', includeAll = false } = {}) {
  if (!hasRemoteBackend) {
    return listFreeSupportTickets({ email, ticketId, includeAll });
  }
  if (includeAll) {
    const payload = await request('/api/admin/tickets');
    return payload.tickets || [];
  }
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (ticketId) params.set('ticketId', ticketId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const payload = await request(`/api/support/tickets${query}`);
  return payload.tickets || [];
}

export async function replySupportTicket(details) {
  if (!hasRemoteBackend) {
    return replyFreeSupportTicket(details);
  }
  return request('/api/support/tickets/reply', { method: 'POST', body: JSON.stringify(details) });
}

export async function updateSupportTicketStatus(ticketId, status) {
  if (!hasRemoteBackend) {
    return updateFreeSupportTicketStatus({ ticketId, status });
  }
  const payload = await request('/api/admin/tickets/status', {
    method: 'POST',
    body: JSON.stringify({ ticketId, status }),
  });
  return payload.ticket;
}

// Admin & Owner APIs
export async function updateUserRole(userId, role) {
  if (!hasRemoteBackend) {
    return freeUpdateUserRole(userId, role);
  }
  const payload = await request('/api/admin/users/role', { method: 'POST', body: JSON.stringify({ userId, role }) });
  return payload.user;
}

export async function deleteUserAccount(userId) {
  if (!hasRemoteBackend) {
    return freeDeleteUser(userId);
  }
  return request('/api/admin/users/delete', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function setUserBan(userId, banned, reason = '') {
  if (!hasRemoteBackend) {
    return freeSetUserBan(userId, banned, reason);
  }
  const payload = await request('/api/admin/users/ban', { method: 'POST', body: JSON.stringify({ userId, banned, reason }) });
  return payload.user;
}

export async function sendOwnerPasswordReset(userId) {
  if (!hasRemoteBackend) {
    const dash = buildFreeAdminDashboard();
    const target = dash.users.find((u) => u.id === userId);
    if (!target) throw new Error('المستخدم غير موجود.');
    return freeRequestPasswordReset(target.email);
  }
  return request('/api/admin/users/reset-password', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function inviteAdminByEmail(email) {
  if (!hasRemoteBackend) {
    return freeInviteAdmin(email);
  }
  return request('/api/admin/invites', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loadAdminInvites() {
  if (!hasRemoteBackend) {
    return freeListInvites();
  }
  const payload = await request('/api/admin/invites');
  return payload.invites;
}

export async function revokeAdminInvite(email) {
  if (!hasRemoteBackend) {
    return freeRevokeInvite(email);
  }
  return request('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loadAdminLoginLog() {
  if (!hasRemoteBackend) {
    return buildFreeAdminDashboard().loginLog;
  }
  const payload = await request('/api/admin/login-log');
  return payload.logins || [];
}

export async function loadOwnerAccountLog() {
  if (!hasRemoteBackend) {
    return buildFreeAdminDashboard().users.map((u) => ({
      ...u,
      loginCount: 1,
      lastLoginAt: u.last_seen_at,
    }));
  }
  const payload = await request('/api/admin/account-log');
  return payload.accounts || [];
}

export async function exportOwnerData() {
  if (!hasRemoteBackend) {
    const dash = buildFreeAdminDashboard();
    return {
      kind: 'PathPilotOwnerDataExport',
      version: 5,
      mode: 'free-cloud',
      generatedAt: new Date().toISOString(),
      users: dash.users,
      tickets: dash.tickets,
      feedback: dash.feedback,
    };
  }
  const payload = await request('/api/admin/export');
  return payload.snapshot;
}

export async function loadSystemControl() {
  if (!hasRemoteBackend) {
    return { paused: false, reason: '', updatedAt: null };
  }
  const payload = await request('/api/admin/system-control');
  return payload.control;
}

export async function setSystemPause(paused, reason = '') {
  if (!hasRemoteBackend) {
    return { paused: Boolean(paused), reason: String(reason || ''), updatedAt: new Date().toISOString() };
  }
  const payload = await request('/api/admin/system-control', {
    method: 'POST',
    body: JSON.stringify({ paused: Boolean(paused), reason: String(reason || '').slice(0, 500) }),
  });
  return payload.control;
}

export async function loadSecurityEvents() {
  if (!hasRemoteBackend) return [];
  const payload = await request('/api/admin/security-events');
  return payload.events || [];
}

export async function loadAdminDashboard() {
  if (!hasRemoteBackend) {
    return buildFreeAdminDashboard();
  }
  const [summary, users, apiUsage, errors, feedback, status, researchStatus, loginLog, securityVisits, securityEvents, ticketsPayload] = await Promise.all([
    request('/api/admin/summary'),
    request('/api/admin/users'),
    request('/api/admin/api-usage'),
    request('/api/admin/errors'),
    request('/api/admin/feedback'),
    request('/api/status'),
    request('/api/research/status').catch(() => ({ researchAvailable: false, targetSources: 18, appliesToAllTools: true })),
    request('/api/admin/login-log'),
    request('/api/admin/security-visits'),
    request('/api/admin/security-events').catch(() => ({ events: [] })),
    request('/api/admin/tickets').catch(() => ({ tickets: [] })),
  ]);
  return {
    summary: summary.summary,
    users: users.users,
    tickets: ticketsPayload.tickets || [],
    apiUsage: apiUsage.requests,
    errors: errors.errors,
    feedback: feedback.feedback,
    status,
    researchStatus,
    loginLog: loginLog.logins || [],
    securityVisits: securityVisits.visits || [],
    securityVisitSummary: securityVisits.summary || null,
    securityEvents: securityEvents.events || [],
  };
}
