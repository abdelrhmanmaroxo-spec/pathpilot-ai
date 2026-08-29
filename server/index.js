import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildProviderRequest, extractProviderText } from './lib/ai-provider.js';
import { createSessionToken, hashPassword, hashToken, normalizeEmail, verifyPassword } from './lib/auth.js';
import { sendVerificationEmail } from './lib/email.js';
import { verifyGoogleCredential } from './lib/google-auth.js';
import {
  consumeEmailVerification,
  createEmailVerification,
  createFeedback,
  createSession,
  createUser,
  deleteSession,
  deleteUser,
  findPendingAdminInvite,
  findUserByEmail,
  findUserById,
  getAdminSummary,
  getSessionUser,
  initializeDatabase,
  listAdminInvites,
  listAiRequests,
  listErrors,
  listFeedback,
  listUsers,
  markAdminInviteAccepted,
  revokeAdminInvite,
  setUserEmailVerified,
  setUserRole,
  trackAiRequest,
  trackClientError,
  trackEvent,
  upsertAdminInvite,
} from './lib/database.js';

const VALID_MODES = new Set(['general', 'study', 'work']);
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

function requestOrigin(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  return host ? `${proto}://${host}` : '';
}

function verificationPage({ title, message, appUrl, success }) {
  const accent = success ? '#22c55e' : '#ef4444';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#080d19;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:620px;margin:10vh auto;padding:28px"><div style="background:#111827;border:1px solid #243047;border-radius:20px;padding:34px"><div style="width:46px;height:46px;border-radius:14px;background:${accent};display:grid;place-items:center;font-weight:900;color:white">P</div><h1>${title}</h1><p style="line-height:1.7;color:#cbd5e1">${message}</p><a href="${appUrl}" style="display:inline-block;margin-top:16px;padding:12px 18px;border-radius:10px;background:#6d5dfc;color:white;text-decoration:none;font-weight:700">Open PathPilot</a></div></main></body></html>`;
}

export function createPathPilotServer({ env = process.env, database = initializeDatabase(), emailSender = sendVerificationEmail } = {}) {
  const apiKey = env.AI_API_KEY || '';
  const model = env.AI_MODEL || '';
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const baseUrl = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const provider = env.AI_PROVIDER || (baseUrl.includes('openai.com') ? 'OpenAI' : baseUrl.includes('googleapis.com') ? 'Gemini' : baseUrl.includes('anthropic.com') ? 'Claude' : 'Compatible API');
  const endpoint = env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`;
  const reasoningEffort = env.AI_REASONING_EFFORT || '';
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean));
  const ownerEmail = normalizeEmail(env.OWNER_EMAIL || env.ADMIN_EMAIL);
  const googleClientId = String(env.GOOGLE_CLIENT_ID || '').trim();
  const resendApiKey = String(env.RESEND_API_KEY || '').trim();
  const emailFrom = String(env.EMAIL_FROM || '').trim();
  const appUrl = String(env.PUBLIC_APP_URL || 'https://abdelrhmanmaroxo-spec.github.io/pathpilot-ai/').trim();
  const aiConfigured = Boolean(apiKey && model);
  const emailVerificationConfigured = Boolean(resendApiKey && emailFrom);
  const rateLimits = new Map();

  function corsHeaders(origin) {
    const allowed = origin && allowedOrigins.has(origin) ? origin : '';
    return {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
      Vary: 'Origin',
    };
  }

  function sendJson(response, status, body, origin = '') {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...corsHeaders(origin),
    });
    response.end(JSON.stringify(body));
  }

  function sendHtml(response, status, html) {
    response.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    response.end(html);
  }

  function checkRateLimit(request, limit = 60) {
    const path = new URL(request.url || '/', 'http://localhost').pathname;
    const key = `${request.socket.remoteAddress || 'unknown'}:${path}`;
    const minute = Math.floor(Date.now() / 60_000);
    const record = rateLimits.get(key);
    if (!record || record.minute !== minute) {
      rateLimits.set(key, { minute, count: 1 });
      return true;
    }
    record.count += 1;
    return record.count <= limit;
  }

  function decorateUser(user) {
    if (!user) return null;
    const isOwner = Boolean(ownerEmail && normalizeEmail(user.email) === ownerEmail);
    let role = user.role;
    if (isOwner && role !== 'admin') {
      setUserRole(database, user.id, 'admin');
      role = 'admin';
    }
    return { ...user, role, isOwner, emailVerified: Boolean(user.email_verified) };
  }

  function initialRoleForEmail(email) {
    if (ownerEmail && email === ownerEmail) return 'admin';
    return findPendingAdminInvite(database, email) ? 'admin' : 'user';
  }

  function acceptAdminInviteIfPresent(userRecord) {
    const email = normalizeEmail(userRecord.email);
    const invite = findPendingAdminInvite(database, email);
    if (!invite) return userRecord;
    const promoted = userRecord.role === 'admin' ? userRecord : setUserRole(database, userRecord.id, 'admin');
    markAdminInviteAccepted(database, email);
    trackEvent(database, { userId: promoted.id, eventType: 'admin_invite_accepted' });
    return promoted;
  }

  function currentUser(request) {
    const token = getBearerToken(request);
    return token ? decorateUser(getSessionUser(database, hashToken(token))) : null;
  }

  function requireAdmin(request, response, origin) {
    const user = currentUser(request);
    if (!user || user.role !== 'admin') {
      sendJson(response, 403, { error: 'Admin access required.' }, origin);
      return null;
    }
    return user;
  }

  function requireOwner(request, response, origin) {
    const user = currentUser(request);
    if (!user?.isOwner) {
      sendJson(response, 403, { error: 'Owner access required.' }, origin);
      return null;
    }
    return user;
  }

  function startSessionFor(userRecord, eventType) {
    const user = decorateUser(userRecord);
    const token = createSessionToken();
    createSession(database, { tokenHash: hashToken(token), userId: user.id });
    trackEvent(database, { userId: user.id, eventType });
    return { token, user };
  }

  async function issueVerification(request, userRecord) {
    const token = createSessionToken();
    createEmailVerification(database, { tokenHash: hashToken(token), userId: userRecord.id, hours: 24 });
    const apiOrigin = requestOrigin(request);
    if (!apiOrigin) throw new Error('PUBLIC_API_ORIGIN');
    await emailSender({
      apiKey: resendApiKey,
      from: emailFrom,
      to: userRecord.email,
      name: userRecord.name,
      verificationUrl: `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    });
  }

  async function handle(request, response) {
    const origin = request.headers.origin || '';
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const path = requestUrl.pathname;
    if (origin && !allowedOrigins.has(origin)) return sendJson(response, 403, { error: 'Origin not allowed.' });
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(origin));
      response.end();
      return;
    }

    const rateLimit = path === '/api/assistant' ? 30 : ['/api/auth/register', '/api/auth/resend-verification'].includes(path) ? 5 : 90;
    if (!checkRateLimit(request, rateLimit)) return sendJson(response, 429, { error: 'Too many requests. Try again shortly.' }, origin);

    if (request.method === 'GET' && ['/health', '/api/status'].includes(path)) {
      return sendJson(response, 200, {
        ok: true,
        apiOnline: aiConfigured,
        apiMode,
        provider,
        model: aiConfigured ? model : null,
        databaseOnline: true,
        googleAuthAvailable: Boolean(googleClientId),
        googleClientId: googleClientId || null,
        emailVerificationAvailable: emailVerificationConfigured,
      }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/register') {
      if (!emailVerificationConfigured) return sendJson(response, 503, { error: 'Email verification is not configured yet.', code: 'EMAIL_VERIFICATION_NOT_CONFIGURED' }, origin);
      let createdUser = null;
      try {
        const body = await readJson(request);
        const name = String(body.name || '').trim().slice(0, 60);
        const email = normalizeEmail(body.email);
        if (name.length < 2 || !EMAIL_PATTERN.test(email)) return sendJson(response, 400, { error: 'Name or email is invalid.' }, origin);
        const existing = findUserByEmail(database, email);
        if (existing) {
          const code = existing.email_verified ? 'ACCOUNT_EXISTS' : 'EMAIL_NOT_VERIFIED';
          return sendJson(response, 409, { error: existing.email_verified ? 'An account already exists for this email.' : 'This email is waiting for verification. Use resend verification.', code }, origin);
        }
        const passwordHash = await hashPassword(body.password);
        createdUser = createUser(database, { name, email, passwordHash, role: initialRoleForEmail(email), emailVerified: false, authProvider: 'password' });
        await issueVerification(request, createdUser);
        trackEvent(database, { userId: createdUser.id, eventType: 'verification_sent' });
        return sendJson(response, 201, { requiresVerification: true, email }, origin);
      } catch (error) {
        if (createdUser) deleteUser(database, createdUser.id);
        if (error.message === 'PASSWORD_LENGTH') return sendJson(response, 400, { error: 'Password must be 8–128 characters.' }, origin);
        return sendJson(response, 502, { error: 'Could not send the verification email. Please try again.', code: 'EMAIL_SEND_FAILED' }, origin);
      }
    }

    if (request.method === 'GET' && path === '/api/auth/verify-email') {
      const token = String(requestUrl.searchParams.get('token') || '');
      const userRecord = token.length >= 20 ? consumeEmailVerification(database, hashToken(token)) : null;
      if (!userRecord) return sendHtml(response, 400, verificationPage({ title: 'Verification link is invalid', message: 'This link is invalid or expired. Return to PathPilot and request a new verification email.', appUrl, success: false }));
      const activated = acceptAdminInviteIfPresent(userRecord);
      trackEvent(database, { userId: activated.id, eventType: 'email_verified' });
      return sendHtml(response, 200, verificationPage({ title: 'Email verified', message: 'Your PathPilot account is active. Return to the app and sign in.', appUrl, success: true }));
    }

    if (request.method === 'POST' && path === '/api/auth/resend-verification') {
      if (!emailVerificationConfigured) return sendJson(response, 503, { error: 'Email verification is not configured yet.' }, origin);
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const userRecord = findUserByEmail(database, email);
      if (userRecord && !userRecord.email_verified && !userRecord.disabled) {
        try {
          await issueVerification(request, userRecord);
          trackEvent(database, { userId: userRecord.id, eventType: 'verification_resent' });
        } catch {
          return sendJson(response, 502, { error: 'Could not send the verification email. Please try again.' }, origin);
        }
      }
      return sendJson(response, 200, { ok: true, message: 'If this account is waiting for verification, a new email has been sent.' }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await readJson(request);
      const userRecord = findUserByEmail(database, normalizeEmail(body.email));
      if (!userRecord || userRecord.disabled || !(await verifyPassword(body.password, userRecord.password_hash))) return sendJson(response, 401, { error: 'Email or password is incorrect.' }, origin);
      if (!userRecord.email_verified) return sendJson(response, 403, { error: 'Verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, origin);
      return sendJson(response, 200, startSessionFor(acceptAdminInviteIfPresent(userRecord), 'login'), origin);
    }

    if (request.method === 'POST' && path === '/api/auth/google') {
      if (!googleClientId) return sendJson(response, 503, { error: 'Google sign-in is not configured.' }, origin);
      try {
        const body = await readJson(request);
        const profile = await verifyGoogleCredential(body.credential, googleClientId);
        const email = normalizeEmail(profile.email);
        let userRecord = findUserByEmail(database, email);
        if (userRecord?.disabled) return sendJson(response, 403, { error: 'This account is disabled.' }, origin);
        if (!userRecord) {
          userRecord = createUser(database, { name: profile.name, email, passwordHash: 'google-only', role: initialRoleForEmail(email), emailVerified: true, authProvider: 'google' });
          userRecord = acceptAdminInviteIfPresent(userRecord);
          return sendJson(response, 201, startSessionFor(userRecord, 'google_account_created'), origin);
        }
        if (!userRecord.email_verified) userRecord = setUserEmailVerified(database, userRecord.id, true);
        userRecord = acceptAdminInviteIfPresent(userRecord);
        return sendJson(response, 200, startSessionFor(userRecord, 'google_login'), origin);
      } catch {
        return sendJson(response, 401, { error: 'Google sign-in could not be verified.' }, origin);
      }
    }

    if (request.method === 'GET' && path === '/api/auth/me') {
      const user = currentUser(request);
      return user ? sendJson(response, 200, { user }, origin) : sendJson(response, 401, { error: 'Not signed in.' }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/logout') {
      const token = getBearerToken(request);
      if (token) deleteSession(database, hashToken(token));
      return sendJson(response, 200, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/events') {
      const body = await readJson(request);
      const user = currentUser(request);
      trackEvent(database, { userId: user?.id || null, anonymousId: String(body.anonymousId || '').slice(0, 80) || null, eventType: String(body.eventType || 'unknown').slice(0, 60), workspace: VALID_MODES.has(body.workspace) ? body.workspace : null, tool: String(body.tool || '').slice(0, 60) || null, metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null });
      return sendJson(response, 202, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/feedback') {
      const body = await readJson(request);
      const user = currentUser(request);
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sendJson(response, 400, { error: 'Rating must be from 1 to 5.' }, origin);
      createFeedback(database, { userId: user?.id || null, rating, message: String(body.message || '').slice(0, 2000), workspace: body.workspace, tool: body.tool });
      return sendJson(response, 201, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/client-errors') {
      const body = await readJson(request);
      const user = currentUser(request);
      trackClientError(database, { userId: user?.id || null, message: String(body.message || 'Unknown error').slice(0, 1000), context: String(body.context || '').slice(0, 2000) });
      return sendJson(response, 202, { ok: true }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/summary') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { summary: getAdminSummary(database, aiConfigured) }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/users') {
      if (!requireAdmin(request, response, origin)) return;
      const users = listUsers(database).map((item) => ({ ...item, isOwner: Boolean(ownerEmail && normalizeEmail(item.email) === ownerEmail), emailVerified: Boolean(item.email_verified) }));
      return sendJson(response, 200, { users }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/invites') {
      if (!requireOwner(request, response, origin)) return;
      return sendJson(response, 200, { invites: listAdminInvites(database) }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/invites') {
      const owner = requireOwner(request, response, origin);
      if (!owner) return;
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      if (!EMAIL_PATTERN.test(email)) return sendJson(response, 400, { error: 'Enter a valid email address.' }, origin);
      if (email === ownerEmail) return sendJson(response, 400, { error: 'This is already the protected owner account.' }, origin);
      const existing = findUserByEmail(database, email);
      if (existing) {
        const user = setUserRole(database, existing.id, 'admin');
        trackEvent(database, { userId: user.id, eventType: 'admin_granted_by_owner' });
        return sendJson(response, 200, { status: 'admin_granted', user: { ...user, emailVerified: Boolean(user.email_verified) } }, origin);
      }
      const invite = upsertAdminInvite(database, { email, invitedBy: owner.id });
      trackEvent(database, { userId: owner.id, eventType: 'admin_invite_created', metadata: { email } });
      return sendJson(response, 201, { status: 'invite_created', invite }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/invites/revoke') {
      const owner = requireOwner(request, response, origin);
      if (!owner) return;
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      revokeAdminInvite(database, email);
      trackEvent(database, { userId: owner.id, eventType: 'admin_invite_revoked', metadata: { email } });
      return sendJson(response, 200, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/users/role') {
      if (!requireOwner(request, response, origin)) return;
      const body = await readJson(request);
      const role = String(body.role || '');
      if (!['user', 'admin'].includes(role)) return sendJson(response, 400, { error: 'Invalid role.' }, origin);
      const target = findUserById(database, String(body.userId || ''));
      if (!target) return sendJson(response, 404, { error: 'User not found.' }, origin);
      if (ownerEmail && normalizeEmail(target.email) === ownerEmail && role !== 'admin') return sendJson(response, 400, { error: 'The owner account cannot be demoted.' }, origin);
      const user = setUserRole(database, target.id, role);
      trackEvent(database, { userId: user.id, eventType: role === 'admin' ? 'admin_granted' : 'admin_removed' });
      return sendJson(response, 200, { user: { ...user, isOwner: Boolean(ownerEmail && normalizeEmail(user.email) === ownerEmail), emailVerified: Boolean(user.email_verified) } }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/users/delete') {
      const owner = requireOwner(request, response, origin);
      if (!owner) return;
      const body = await readJson(request);
      const target = findUserById(database, String(body.userId || ''));
      if (!target) return sendJson(response, 404, { error: 'User not found.' }, origin);
      if (ownerEmail && normalizeEmail(target.email) === ownerEmail) return sendJson(response, 400, { error: 'The protected owner account cannot be deleted.' }, origin);
      const deleted = { id: target.id, email: target.email, name: target.name };
      deleteUser(database, target.id);
      trackEvent(database, { userId: owner.id, eventType: 'user_deleted_by_owner', metadata: { email: deleted.email } });
      return sendJson(response, 200, { ok: true, deleted }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/api-usage') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { requests: listAiRequests(database) }, origin);
    }
    if (request.method === 'GET' && path === '/api/admin/errors') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { errors: listErrors(database) }, origin);
    }
    if (request.method === 'GET' && path === '/api/admin/feedback') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { feedback: listFeedback(database) }, origin);
    }

    if (request.method === 'POST' && path === '/api/assistant') {
      if (!aiConfigured) return sendJson(response, 503, { error: 'Live AI is not configured. The frontend will continue using Smart Demo mode.' }, origin);
      const startedAt = Date.now();
      const user = currentUser(request);
      let mode = 'general';
      let tool = 'ask';
      try {
        const body = await readJson(request);
        const prompt = String(body.prompt || '').trim();
        mode = VALID_MODES.has(body.mode) ? body.mode : 'general';
        tool = String(body.tool || 'ask').slice(0, 60);
        if (prompt.length < 2 || prompt.length > 12_000) return sendJson(response, 400, { error: 'Prompt length is invalid.' }, origin);
        const providerResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildProviderRequest({ apiMode, model, prompt, mode, tool, preferences: body.preferences || {}, reasoningEffort })),
          signal: AbortSignal.timeout(60_000),
        });
        const providerPayload = await providerResponse.json();
        if (!providerResponse.ok) throw new Error(`PROVIDER_${providerResponse.status}`);
        const answer = extractProviderText(providerPayload, apiMode);
        if (!answer) throw new Error('EMPTY_RESPONSE');
        trackAiRequest(database, { userId: user?.id || null, workspace: mode, tool, model, status: 'success', latencyMs: Date.now() - startedAt });
        trackEvent(database, { userId: user?.id || null, eventType: 'tool_request', workspace: mode, tool, metadata: { source: 'live' } });
        return sendJson(response, 200, { answer }, origin);
      } catch (error) {
        trackAiRequest(database, { userId: user?.id || null, workspace: mode, tool, model, status: 'error', latencyMs: Date.now() - startedAt, errorCode: error.message.slice(0, 80) });
        return sendJson(response, 502, { error: 'The AI provider could not complete the request.' }, origin);
      }
    }

    return sendJson(response, 404, { error: 'Not found.' }, origin);
  }

  const safeHandle = async (request, response) => {
    try {
      await handle(request, response);
    } catch {
      if (!response.headersSent) sendJson(response, 400, { error: 'Invalid request.' }, request.headers.origin || '');
      else response.end();
    }
  };

  return { handle: safeHandle, database, aiConfigured };
}

if (process.argv[1]?.endsWith('server/index.js')) {
  const databasePath = process.env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const app = createPathPilotServer({ database: initializeDatabase(databasePath) });
  const port = Number(process.env.PORT || 8787);
  createServer(app.handle).listen(port, () => console.log(`PathPilot platform listening on port ${port}`));
}
