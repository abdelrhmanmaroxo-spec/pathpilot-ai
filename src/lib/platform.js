import { createApiClient } from './api-client.js';
import { openVaultPayload, sealVaultPayload } from './crypto-vault.js';
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
const TAB_SESSION_KEY = 'pathpilot.tab_session.v6';
const IP_CACHE_KEY = 'pathpilot.ip_geo_cache.v6';
const LIVE_PRESENCE_VAULT_KEY = 'pathpilot.live_presence.v6';
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

let heartbeatStarted = false;
let ipFetchPromise = null;
let presenceChannel = null;

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

function currentTabSessionId() {
  try {
    let id = globalThis.sessionStorage?.getItem(TAB_SESSION_KEY);
    if (!id) {
      id = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      globalThis.sessionStorage?.setItem(TAB_SESSION_KEY, id);
    }
    return id;
  } catch {
    return anonymousId();
  }
}

function parseDeviceSummary(ua = '', platformHint = '') {
  const s = String(ua || '');
  let browser = 'Browser';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\//i.test(s)) browser = 'Opera';
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = 'Chrome';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/Safari\//i.test(s) && !/Chrome\//i.test(s)) browser = 'Safari';

  let os = String(platformHint || '').trim();
  if (!os) {
    if (/Windows NT/i.test(s)) os = 'Windows';
    else if (/Android/i.test(s)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
    else if (/Mac OS X/i.test(s)) os = 'macOS';
    else if (/Linux/i.test(s)) os = 'Linux';
    else os = 'OS';
  }
  const deviceType = /Mobile|Android|iPhone|iPad|iPod/i.test(s) ? 'Mobile' : 'Desktop';
  return { browser, os, deviceType };
}

async function resolvePublicIpDetails() {
  try {
    const cachedRaw = globalThis.sessionStorage?.getItem(IP_CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed?.ip) return parsed;
    }
  } catch {
    // Ignore sessionStorage errors
  }

  if (ipFetchPromise) return ipFetchPromise;

  ipFetchPromise = (async () => {
    const endpoints = [
      async () => {
        const res = await fetch('https://ipwho.is/');
        if (!res.ok) return null;
        const d = await res.json();
        if (!d?.ip) return null;
        return {
          ip: String(d.ip),
          country: String(d.country || ''),
          city: String(d.city || d.region || ''),
          isp: String(d.connection?.isp || d.connection?.org || ''),
          timezone: String(d.timezone?.id || ''),
        };
      },
      async () => {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) return null;
        const d = await res.json();
        if (!d?.ip) return null;
        return {
          ip: String(d.ip),
          country: String(d.country_name || ''),
          city: String(d.city || d.region || ''),
          isp: String(d.org || ''),
          timezone: String(d.timezone || ''),
        };
      },
      async () => {
        const res = await fetch('https://api.ipify.org?format=json');
        if (!res.ok) return null;
        const d = await res.json();
        if (!d?.ip) return null;
        return { ip: String(d.ip), country: '', city: '', isp: '', timezone: '' };
      },
    ];

    for (const fn of endpoints) {
      try {
        const info = await fn();
        if (info?.ip) {
          try { globalThis.sessionStorage?.setItem(IP_CACHE_KEY, JSON.stringify(info)); } catch { /* ignore */ }
          return info;
        }
      } catch {
        // Try next IP provider
      }
    }
    return { ip: 'Local / Private Network', country: '', city: '', isp: '', timezone: '' };
  })();

  return ipFetchPromise;
}

function readPresenceMap() {
  try {
    const raw = storage()?.getItem(LIVE_PRESENCE_VAULT_KEY);
    return openVaultPayload(raw, {}) || {};
  } catch {
    return {};
  }
}

function writePresenceMap(map) {
  try {
    const entries = Object.entries(map || {})
      .sort((a, b) => Number(b[1]?.lastActiveMs || 0) - Number(a[1]?.lastActiveMs || 0))
      .slice(0, 250);
    const trimmed = Object.fromEntries(entries);
    storage()?.setItem(LIVE_PRESENCE_VAULT_KEY, sealVaultPayload(trimmed));
  } catch {
    // Ignore quota errors
  }
}

export async function recordLivePresenceHeartbeat({ actionLabel = '' } = {}) {
  if (typeof window === 'undefined') return null;
  const user = freeGetCurrentUser();
  const ipInfo = await resolvePublicIpDetails();
  const nav = globalThis.navigator;
  const scr = globalThis.screen;
  const ua = nav?.userAgent || '';
  const { browser, os, deviceType } = parseDeviceSummary(ua, nav?.userAgentData?.platform || nav?.platform || '');
  let localTz = '';
  try { localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { localTz = ''; }

  const sessionId = currentTabSessionId();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const map = readPresenceMap();
  const existing = map[sessionId] || {};

  const entry = {
    sessionId,
    visitorId: anonymousId(),
    ip: ipInfo?.ip || existing.ip || 'Detecting…',
    country: ipInfo?.country || existing.country || '',
    city: ipInfo?.city || existing.city || '',
    isp: ipInfo?.isp || existing.isp || '',
    timezone: ipInfo?.timezone || localTz || existing.timezone || '',
    userId: user?.id || null,
    name: user?.name || 'زائر بدون حساب',
    email: user?.email || 'Guest (غير مسجل دخول)',
    role: user?.isOwner ? 'owner' : (user?.role || 'guest'),
    emailVerified: Boolean(user?.emailVerified || user?.email_verified),
    currentRoute: window.location.hash || '#/',
    lastAction: actionLabel || existing.lastAction || 'تصفح المنصة',
    browser,
    os,
    deviceType,
    screen: scr ? `${scr.width}x${scr.height}` : '',
    language: nav?.language || 'ar',
    connectionType: nav?.connection?.effectiveType || '',
    userAgent: ua.slice(0, 260),
    firstSeenAt: existing.firstSeenAt || nowIso,
    lastSeenAt: nowIso,
    lastActiveMs: nowMs,
    actionsCount: Number(existing.actionsCount || 0) + 1,
  };

  map[sessionId] = entry;
  writePresenceMap(map);

  try {
    if (!presenceChannel && typeof BroadcastChannel !== 'undefined') {
      presenceChannel = new BroadcastChannel('pathpilot-presence-v6');
      presenceChannel.onmessage = (ev) => {
        if (ev?.data?.sessionId) {
          const current = readPresenceMap();
          current[ev.data.sessionId] = ev.data;
          writePresenceMap(current);
        }
      };
    }
    presenceChannel?.postMessage(entry);
  } catch {
    // Ignore BroadcastChannel issues
  }

  return entry;
}

export function listLivePresenceSessions() {
  const map = readPresenceMap();
  const now = Date.now();
  return Object.values(map)
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      ...item,
      isOnlineNow: now - Number(item.lastActiveMs || 0) <= ONLINE_WINDOW_MS,
    }))
    .sort((a, b) => {
      if (a.isOnlineNow !== b.isOnlineNow) return a.isOnlineNow ? -1 : 1;
      return Number(b.lastActiveMs || 0) - Number(a.lastActiveMs || 0);
    });
}

function ensurePresenceHeartbeat() {
  if (heartbeatStarted || typeof window === 'undefined') return;
  heartbeatStarted = true;
  recordLivePresenceHeartbeat({ actionLabel: 'دخول المنصة' }).catch(() => undefined);
  window.addEventListener('hashchange', () => {
    recordLivePresenceHeartbeat({ actionLabel: `انتقل إلى ${window.location.hash || '#/'}` }).catch(() => undefined);
  });
  window.addEventListener('focus', () => {
    recordLivePresenceHeartbeat({ actionLabel: 'نشط في التبويب' }).catch(() => undefined);
  });
  window.setInterval(() => {
    if (document.visibilityState !== 'hidden') {
      recordLivePresenceHeartbeat().catch(() => undefined);
    }
  }, 20_000);
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

export async function reportSecurityVisit() {
  ensurePresenceHeartbeat();
  const entry = await recordLivePresenceHeartbeat({ actionLabel: 'زيارة نشطة' });
  if (!hasRemoteBackend) return entry;
  return request('/api/security/visit', {
    method: 'POST',
    body: JSON.stringify({
      ...loginDeviceDetails(),
      visitorId: anonymousId(),
      path: `${globalThis.location?.pathname || '/'}${globalThis.location?.hash || ''}`.slice(0, 160),
    }),
  }).catch(() => entry);
}

export async function registerAccount(details) {
  if (!hasRemoteBackend) {
    const res = await freeRegisterAccount(details);
    recordLivePresenceHeartbeat({ actionLabel: 'تسجيل حساب جديد' }).catch(() => undefined);
    return res;
  }
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(details) });
}

export async function verifyAccountEmailCode({ email, code }) {
  if (!hasRemoteBackend) {
    const result = await freeVerifyEmailCode({ email, code });
    if (result.token) setSessionToken(result.token);
    await recordLivePresenceHeartbeat({ actionLabel: 'تفعيل البريد والدخول' }).catch(() => undefined);
    return result;
  }
  const payload = await request('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  if (payload.token) setSessionToken(payload.token);
  return payload;
}

export async function resendVerification(email) {
  if (!hasRemoteBackend) return freeResendVerification(email);
  return request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function requestPasswordReset(email) {
  if (!hasRemoteBackend) return freeRequestPasswordReset(email);
  return request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPasswordWithOtpCode({ email, code, newPassword }) {
  if (!hasRemoteBackend) {
    const result = await freeResetPasswordWithCode({ email, code, newPassword });
    if (result.token) setSessionToken(result.token);
    await recordLivePresenceHeartbeat({ actionLabel: 'استعادة كلمة المرور' }).catch(() => undefined);
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
    await recordLivePresenceHeartbeat({ actionLabel: 'تسجيل دخول' }).catch(() => undefined);
    return result.user;
  }
  const payload = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(details) });
  setSessionToken(payload.token);
  await recordLivePresenceHeartbeat({ actionLabel: 'تسجيل دخول' }).catch(() => undefined);
  return payload.user;
}

export async function loginWithGoogleCredential(credential) {
  if (!hasRemoteBackend) {
    throw new Error('يمكنك تسجيل الدخول بالبريد الإلكتروني وكود التحقق الفوري.');
  }
  const payload = await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
  setSessionToken(payload.token);
  return payload.user;
}

export async function getPlatformStatus() {
  if (!hasRemoteBackend) {
    const cfg = getFreeCloudConfig();
    return {
      ok: true,
      mode: 'free-cloud',
      apiOnline: true,
      provider: 'Google Gemini Smart Pool',
      model: cfg.geminiModel || 'gemini-3.8-flash',
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
  if (!hasRemoteBackend) return { paused: false, reason: '', updatedAt: null };
  return request('/api/system/status');
}

export async function getResearchStatus() {
  if (!hasRemoteBackend) {
    return { researchAvailable: false, synthesisAvailable: true, fallbackAvailable: true };
  }
  return request('/api/research/status');
}

export async function logoutAccount() {
  if (!hasRemoteBackend) {
    freeLogout();
    setSessionToken('');
    await recordLivePresenceHeartbeat({ actionLabel: 'تسجيل خروج' }).catch(() => undefined);
    return;
  }
  try { await request('/api/auth/logout', { method: 'POST' }); } finally { setSessionToken(''); }
}

export async function getCurrentUser() {
  ensurePresenceHeartbeat();
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
  recordLivePresenceHeartbeat({ actionLabel: workspace ? `فتح قسم ${workspace}` : eventType }).catch(() => undefined);
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
  if (!hasRemoteBackend) return Promise.resolve(saveFreeFeedback(details));
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

export async function createSupportTicket(details) {
  if (!hasRemoteBackend) return createFreeSupportTicket(details);
  return request('/api/support/tickets', { method: 'POST', body: JSON.stringify(details) });
}

export async function listSupportTickets({ email = '', ticketId = '', includeAll = false } = {}) {
  if (!hasRemoteBackend) return listFreeSupportTickets({ email, ticketId, includeAll });
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
  if (!hasRemoteBackend) return replyFreeSupportTicket(details);
  return request('/api/support/tickets/reply', { method: 'POST', body: JSON.stringify(details) });
}

export async function updateSupportTicketStatus(ticketId, status) {
  if (!hasRemoteBackend) return updateFreeSupportTicketStatus({ ticketId, status });
  const payload = await request('/api/admin/tickets/status', {
    method: 'POST',
    body: JSON.stringify({ ticketId, status }),
  });
  return payload.ticket;
}

export async function updateUserRole(userId, role) {
  if (!hasRemoteBackend) return freeUpdateUserRole(userId, role);
  const payload = await request('/api/admin/users/role', { method: 'POST', body: JSON.stringify({ userId, role }) });
  return payload.user;
}

export async function deleteUserAccount(userId) {
  if (!hasRemoteBackend) return freeDeleteUser(userId);
  return request('/api/admin/users/delete', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function setUserBan(userId, banned, reason = '') {
  if (!hasRemoteBackend) return freeSetUserBan(userId, banned, reason);
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
  if (!hasRemoteBackend) return freeInviteAdmin(email);
  return request('/api/admin/invites', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loadAdminInvites() {
  if (!hasRemoteBackend) return freeListInvites();
  const payload = await request('/api/admin/invites');
  return payload.invites;
}

export async function revokeAdminInvite(email) {
  if (!hasRemoteBackend) return freeRevokeInvite(email);
  return request('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loadAdminLoginLog() {
  if (!hasRemoteBackend) return buildFreeAdminDashboard().loginLog;
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
  const liveSessions = listLivePresenceSessions();
  if (!hasRemoteBackend) {
    const dash = buildFreeAdminDashboard();
    return {
      kind: 'PathPilotOwnerDataExport',
      version: 6,
      mode: 'free-cloud',
      generatedAt: new Date().toISOString(),
      users: dash.users,
      tickets: dash.tickets,
      feedback: dash.feedback,
      liveSessions,
    };
  }
  const payload = await request('/api/admin/export');
  return { ...payload.snapshot, liveSessions };
}

export async function loadSystemControl() {
  if (!hasRemoteBackend) return { paused: false, reason: '', updatedAt: null };
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
  await recordLivePresenceHeartbeat({ actionLabel: 'فحص لوحة الإدارة' }).catch(() => undefined);
  const liveSessions = listLivePresenceSessions();

  if (!hasRemoteBackend) {
    const base = buildFreeAdminDashboard();
    const mappedVisits = liveSessions.map((s) => ({
      id: s.sessionId,
      ip_address: s.ip,
      country: [s.country, s.city].filter(Boolean).join(' · ') || 'غير محدد',
      device_summary: `${s.browser} · ${s.os} · ${s.deviceType} (${s.screen || 'auto'})`,
      path: s.currentRoute,
      user_email: s.email,
      user_name: s.name,
      created_at: s.lastSeenAt,
    }));
    return {
      ...base,
      liveSessions,
      securityVisits: mappedVisits.length ? mappedVisits : base.securityVisits,
      securityVisitSummary: {
        totalVisits: liveSessions.length,
        uniqueIps: new Set(liveSessions.map((s) => s.ip)).size,
        onlineNow: liveSessions.filter((s) => s.isOnlineNow).length,
      },
    };
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
    liveSessions,
  };
}
