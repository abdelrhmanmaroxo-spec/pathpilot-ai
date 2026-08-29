const explicitBase = import.meta.env?.VITE_PLATFORM_API_URL?.trim();
const aiUrl = import.meta.env?.VITE_AI_API_URL?.trim();
export const PLATFORM_API_URL = explicitBase || aiUrl?.replace(/\/api\/assistant\/?$/, '') || '';
export const hasPlatformBackend = Boolean(PLATFORM_API_URL);

const TOKEN_KEY = 'pathpilot.session.v1';
const ANONYMOUS_KEY = 'pathpilot.anonymous.v1';

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

async function request(path, options = {}) {
  if (!hasPlatformBackend) throw new Error('BACKEND_NOT_CONFIGURED');
  const token = getSessionToken();
  const response = await fetch(`${PLATFORM_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with ${response.status}`);
    error.code = payload.code || '';
    error.status = response.status;
    throw error;
  }
  return payload;
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

async function reportLoginDevice() {
  return request('/api/security/login-device', {
    method: 'POST',
    body: JSON.stringify(loginDeviceDetails()),
  });
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
  await reportLoginDevice().catch(() => undefined);
  return payload.user;
}

export async function loginWithGoogleCredential(credential) {
  const payload = await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
  setSessionToken(payload.token);
  await reportLoginDevice().catch(() => undefined);
  return payload.user;
}

export async function getPlatformStatus() {
  return request('/api/status');
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
    body: JSON.stringify({ message: error?.message || String(error), context }),
  }).catch(() => undefined);
}

export async function updateUserRole(userId, role) {
  const payload = await request('/api/admin/users/role', { method: 'POST', body: JSON.stringify({ userId, role }) });
  return payload.user;
}

export async function deleteUserAccount(userId) {
  return request('/api/admin/users/delete', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function setUserBan(userId, banned) {
  const payload = await request('/api/admin/users/ban', { method: 'POST', body: JSON.stringify({ userId, banned }) });
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

export async function loadAdminDashboard() {
  const [summary, users, apiUsage, errors, feedback, status, researchStatus, loginLog] = await Promise.all([
    request('/api/admin/summary'),
    request('/api/admin/users'),
    request('/api/admin/api-usage'),
    request('/api/admin/errors'),
    request('/api/admin/feedback'),
    request('/api/status'),
    request('/api/research/status').catch(() => ({ researchAvailable: false, provider: null, targetSources: 18, appliesToAllTools: true })),
    request('/api/admin/login-log'),
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
  };
}
