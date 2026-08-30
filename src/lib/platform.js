import { createApiClient } from './api-client.js';

const explicitBase = import.meta.env?.VITE_PLATFORM_API_URL?.trim();
const aiUrl = import.meta.env?.VITE_AI_API_URL?.trim();
export const PLATFORM_API_URL = explicitBase || aiUrl?.replace(/\/api\/assistant\/?$/, '') || '';
export const hasPlatformBackend = Boolean(PLATFORM_API_URL);

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
  return request('/api/security/login-device', {
    method: 'POST',
    body: JSON.stringify(loginDeviceDetails()),
  });
}

export async function reportSecurityVisit({ force = false } = {}) {
  if (!hasPlatformBackend) return undefined;
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
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(details) });
}

export async function resendVerification(email) {
  return request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function requestPasswordReset(email) {
  return request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loginAccount(details) {
  const payload = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(details) });
  setSessionToken(payload.token);
  await Promise.all([
    reportLoginDevice().catch(() => undefined),
    reportSecurityVisit({ force: true }).catch(() => undefined),
  ]);
  return payload.user;
}

export async function loginWithGoogleCredential(credential) {
  const payload = await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
  setSessionToken(payload.token);
  await Promise.all([
    reportLoginDevice().catch(() => undefined),
    reportSecurityVisit({ force: true }).catch(() => undefined),
  ]);
  return payload.user;
}

export async function getPlatformStatus() {
  return request('/api/status');
}

export async function getSystemStatus() {
  return request('/api/system/status');
}

export async function getResearchStatus() {
  return request('/api/research/status');
}

export async function logoutAccount() {
  try { await request('/api/auth/logout', { method: 'POST' }); } finally { setSessionToken(''); }
}

export async function getCurrentUser() {
  if (!hasPlatformBackend || !getSessionToken()) return null;
  try {
    const payload = await request('/api/auth/me');
    return payload.user;
  } catch {
    setSessionToken('');
    return null;
  }
}

export function trackUsage({ eventType, workspace, tool, metadata }) {
  if (!hasPlatformBackend) return Promise.resolve();
  return request('/api/events', {
    method: 'POST',
    body: JSON.stringify({ anonymousId: anonymousId(), eventType, workspace, tool, metadata }),
  }).catch(() => undefined);
}

export function sendFeedback(details) {
  return request('/api/feedback', { method: 'POST', body: JSON.stringify(details) });
}

export function reportClientError(error, context = '') {
  if (!hasPlatformBackend) return Promise.resolve();
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

export async function updateUserRole(userId, role) {
  const payload = await request('/api/admin/users/role', { method: 'POST', body: JSON.stringify({ userId, role }) });
  return payload.user;
}

export async function deleteUserAccount(userId) {
  return request('/api/admin/users/delete', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function setUserBan(userId, banned, reason = '') {
  const payload = await request('/api/admin/users/ban', { method: 'POST', body: JSON.stringify({ userId, banned, reason }) });
  return payload.user;
}

export async function sendOwnerPasswordReset(userId) {
  return request('/api/admin/users/reset-password', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function inviteAdminByEmail(email) {
  return request('/api/admin/invites', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loadAdminInvites() {
  const payload = await request('/api/admin/invites');
  return payload.invites;
}

export async function revokeAdminInvite(email) {
  return request('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function loadAdminLoginLog() {
  const payload = await request('/api/admin/login-log');
  return payload.logins || [];
}

export async function loadOwnerAccountLog() {
  const payload = await request('/api/admin/account-log');
  return payload.accounts || [];
}

export async function exportOwnerData() {
  const payload = await request('/api/admin/export');
  return payload.snapshot;
}

export async function loadSystemControl() {
  const payload = await request('/api/admin/system-control');
  return payload.control;
}

export async function setSystemPause(paused, reason = '') {
  const payload = await request('/api/admin/system-control', {
    method: 'POST',
    body: JSON.stringify({ paused: Boolean(paused), reason: String(reason || '').slice(0, 500) }),
  });
  return payload.control;
}

export async function loadSecurityEvents() {
  const payload = await request('/api/admin/security-events');
  return payload.events || [];
}

export async function loadAdminDashboard() {
  const [summary, users, apiUsage, errors, feedback, status, researchStatus, loginLog, securityVisits, securityEvents] = await Promise.all([
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
  ]);
  return {
    summary: summary.summary,
    users: users.users,
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
